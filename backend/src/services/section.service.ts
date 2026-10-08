import { getPool, sql } from '../config/database';
import { Section } from '../types';

// ============================================================
// Section Service: Sub-section resolution + lookup helpers
// ============================================================

/**
 * ดึงข้อมูลแผนกจาก id_section
 */
export async function getSectionById(sectionId: string): Promise<Section | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_section', sql.NVarChar(10), sectionId)
    .query<Section>(`
      SELECT id_section, name_section, name_fullsection, sub_section, is_active
      FROM agt_section
      WHERE id_section = @id_section
    `);
  return result.recordset[0] || null;
}

/**
 * หา main section ของพนักงาน
 * Logic:
 *   1. ถ้า section ของพนักงาน มี sub_section อยู่ → section นี้คือ main เอง
 *   2. ถ้าไม่มี sub_section → ค้นหาว่ามี main section ไหนที่เก็บ id นี้ไว้ใน sub_section
 *   3. ถ้าหาไม่เจอ → ถือว่า section นี้คือ main เอง (standalone section)
 *
 * Returns: main section (ใช้เป็น key lookup Matrix)
 */
export async function isSameOrSubSection(requesterSection: Section, targetSectionId: string): Promise<boolean> {
  if (requesterSection.id_section === targetSectionId) {
    return true;
  }
  const allIds = getAllSectionIds(requesterSection);
  return allIds.includes(targetSectionId);
}

export async function resolveMainSection(memberSectionId: string): Promise<{
  mainSection: Section;
  isSubSection: boolean;
  originalSection: Section;
}> {
  const pool = await getPool();

  // ขั้น 1: ดู section ของพนักงานก่อน
  const originalSection = await getSectionById(memberSectionId);
  if (!originalSection) {
    throw new Error(`Section ${memberSectionId} not found`);
  }

  // ขั้น 2: ถ้า section นี้มี sub_section ของตัวเอง → มันคือ main เอง
  if (originalSection.sub_section && originalSection.sub_section.trim() !== '') {
    return {
      mainSection: originalSection,
      isSubSection: false,
      originalSection,
    };
  }

  // ขั้น 3: ค้นหา main section ที่มี memberSectionId อยู่ใน sub_section
  // sub_section เก็บเป็น comma-separated string เช่น "S026,S027"
  const result = await pool.request()
    .input('sub_id', sql.NVarChar(10), String(memberSectionId))
    .query<Section>(`
      SELECT TOP 1 id_section, name_section, name_fullsection, sub_section, is_active
      FROM agt_section
      WHERE is_active = 1
        AND (
          sub_section = @sub_id
          OR sub_section LIKE @sub_id + ',%'
          OR sub_section LIKE '%,' + @sub_id
          OR sub_section LIKE '%,' + @sub_id + ',%'
        )
    `);

  if (result.recordset[0]) {
    return {
      mainSection: result.recordset[0],
      isSubSection: true,
      originalSection,
    };
  }

  // ขั้น 4: ถ้าหาไม่เจอ → section นี้เป็น standalone (ถือเป็น main เอง)
  return {
    mainSection: originalSection,
    isSubSection: false,
    originalSection,
  };
}

/**
 * ดึง ID ทั้งหมดที่อยู่ใน section กลุ่มนี้ (main + ทุก sub)
 * ใช้ตอน lookup ผู้อนุมัติเพื่อให้ครอบคลุมทั้ง main และ sub-sections
 */
export function getAllSectionIds(mainSection: Section): string[] {
  const ids: string[] = [String(mainSection.id_section)];

  if (mainSection.sub_section && mainSection.sub_section.trim() !== '') {
    const subIds = mainSection.sub_section
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    ids.push(...subIds);
  }

  return ids;
}

/**
 * ดึงแผนกทั้งหมด (สำหรับ dropdown ใน Admin Panel)
 */
export async function getAllSections(): Promise<Section[]> {
  const pool = await getPool();
  const result = await pool.request().query<Section>(`
    SELECT id_section, name_section, name_fullsection, sub_section, is_active
    FROM agt_section
    WHERE is_active = 1
    ORDER BY name_section
  `);
  return result.recordset;
}

interface DivisionGMCache {
  data: Array<{ section_id: string; sub_section: string; steps: any[] }>;
  lastFetched: number;
}

let divGMCache: DivisionGMCache = {
  data: [],
  lastFetched: 0,
};

const DIV_GM_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * หา GM ประจำสายงานของผู้ร้องขอ (Division GM Resolution แบบ Dynamic จาก Approval Matrix)
 * - ดึงจาก Department Matrix ที่กำหนดไว้ใน agt_approval_matrix โดยตรง
 * - แคชในหน่วยความจำ 5 นาที เพื่อประสิทธิภาพสูงระดับ Sub-millisecond
 */
export async function getDivisionGMForSection(sectionId: string): Promise<{ position_id: string; section_id: string }> {
  const cleanId = String(sectionId || '').trim();
  const now = Date.now();

  try {
    const pool = await getPool();

    if (!divGMCache.data.length || now - divGMCache.lastFetched > DIV_GM_CACHE_TTL_MS) {
      const res = await pool.request().query<{ section_id: string; sub_section: string | null; approval_steps: string }>(`
        SELECT m.section_id, s.sub_section, m.approval_steps
        FROM agt_approval_matrix m
        JOIN agt_section s ON s.id_section = m.section_id
        WHERE m.is_active = 1 AND (m.form_code IS NULL OR m.form_code = '')
      `);

      divGMCache = {
        data: res.recordset.map(r => ({
          section_id: r.section_id,
          sub_section: r.sub_section ? String(r.sub_section).trim() : '',
          steps: typeof r.approval_steps === 'string' ? JSON.parse(r.approval_steps) : (r.approval_steps || [])
        })),
        lastFetched: now
      };
    }

    // 1. ตรวจสอบจาก Department Matrix ของ sectionId โดยตรง
    for (const mat of divGMCache.data) {
      if (mat.section_id === cleanId) {
        for (const step of mat.steps) {
          if (step.step_key === 'step3_gm' || String(step.description || '').includes('GM') || String(step.description || '').includes('ผู้จัดการทั่วไป')) {
            const gmApp = step.approvers?.[0];
            if (gmApp?.position_id) {
              return {
                position_id: gmApp.position_id,
                section_id: gmApp.section_id || 'S014'
              };
            }
          }
        }
      }
    }

    // 2. ตรวจสอบว่า sectionId นี้เป็น sub_section ของ parent section ใดใน matrix หรือไม่
    for (const mat of divGMCache.data) {
      if (mat.sub_section && mat.sub_section.split(',').map((x: string) => x.trim()).includes(cleanId)) {
        for (const step of mat.steps) {
          if (step.step_key === 'step3_gm' || String(step.description || '').includes('GM') || String(step.description || '').includes('ผู้จัดการทั่วไป')) {
            const gmApp = step.approvers?.[0];
            if (gmApp?.position_id) {
              return {
                position_id: gmApp.position_id,
                section_id: gmApp.section_id || 'S014'
              };
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[getDivisionGMForSection] Dynamic lookup warning:', err.message);
  }

  // Default Fallback: GM of Factory
  return { position_id: 'P018', section_id: 'S014' };
}

