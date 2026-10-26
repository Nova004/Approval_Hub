import { getPool, sql } from '../config/database';
import { resolveMainSection, getAllSectionIds, getDivisionGMForSection } from './section.service';
import {
  Member,
  Position,
  ApprovalStep,
  ApprovalMatrixRow,
  ApprovalChainStep,
  ApproverInfo,
  RequesterInfo,
  CalculateResponse,
  ErrorCodes,
  StepDefinition,
} from '../types';

// ============================================================
// Approval Service: Core Routing Engine
// ============================================================

/**
 * คำนวณสายอนุมัติสำหรับพนักงาน (Stateless — คำนวณแล้ว return ทันที)
 *
 * Flow:
 *   1. Lookup พนักงาน
 *   2. Resolve main section (กรณีเป็น sub-section)
 *   3. Lookup Approval Matrix
 *   4. Parse JSON steps
 *   5. Loop: Skip step ที่ approver level >= requester level
 *   6. Resolve ตัวบุคคลจริงจาก role+section
 *   7. Return JSON
 */
export async function calculateApprovalChain(memberId: string, formCode?: string): Promise<CalculateResponse> {
  const pool = await getPool();

  // ── 1. Lookup พนักงาน ────────────────────────────────────
  const memberResult = await pool.request()
    .input('member_id', sql.NVarChar(15), memberId)
    .query<Member & { position_name: string; position_type: string; position_level: number; section_name: string; section_fullname: string; sub_section: string | null }>(`
      SELECT
        m.agt_member_id,
        m.agt_member_nameTH,
        m.agt_member_nameEN,
        m.agt_member_nickname,
        m.agt_member_sex,
        m.agt_member_email,
        m.agt_member_position,
        m.agt_member_section,
        p.agt_position_name  AS position_name,
        p.agt_position_type  AS position_type,
        p.agt_position_level AS position_level,
        s.name_section       AS section_name,
        s.name_fullsection   AS section_fullname,
        s.sub_section        AS sub_section
      FROM agt_member m
      INNER JOIN agt_position p ON p.agt_position_id = m.agt_member_position
      INNER JOIN agt_section  s ON s.id_section       = m.agt_member_section
      WHERE m.agt_member_id = @member_id
        AND m.agt_status_job = 'Working'
    `);

  if (!memberResult.recordset[0]) {
    throw Object.assign(new Error(`ไม่พบพนักงานรหัส ${memberId}`), {
      code: ErrorCodes.MEMBER_NOT_FOUND,
    });
  }

  const member = memberResult.recordset[0];
  const requesterLevel = member.position_level;

  // ── 2. Resolve Main Section ──────────────────────────────
  const { mainSection, isSubSection, originalSection } = await resolveMainSection(member.agt_member_section);
  const allSectionIds = getAllSectionIds(mainSection); // main + ทุก sub-sections

  // ── 3. Build RequesterInfo ───────────────────────────────
  const requesterInfo: RequesterInfo = {
    member_id: member.agt_member_id,
    name_th: member.agt_member_nameTH,
    name_en: member.agt_member_nameEN,
    email: member.agt_member_email,
    section: {
      id: originalSection.id_section,
      name: originalSection.name_section,
      full_name: originalSection.name_fullsection,
      main_section: isSubSection
        ? {
            id: mainSection.id_section,
            name: mainSection.name_section,
            full_name: mainSection.name_fullsection,
          }
        : null,
    },
    position: {
      id: member.agt_member_position,
      name: member.position_name,
      level: requesterLevel,
      type: member.position_type,
    },
  };

  // ── 4. Lookup Approval Matrix ─────────────────────────────
  let matrixResult;
  let appliedSection = originalSection;

  // 4.1 ถ้ามีการระบุ formCode (เช่น FM-MN-012) ให้ค้นหา Matrix ที่ตรงกับแบบฟอร์มนั้นก่อน
  if (formCode) {
    // ก) ค้นหา Matrix ประจำแบบฟอร์มในแผนกของผู้ขอโดยตรง
    matrixResult = await pool.request()
      .input('section_id', sql.NVarChar(10), originalSection.id_section)
      .input('form_code', sql.NVarChar(50), formCode)
      .input('position_id', sql.NVarChar(sql.MAX), `%"${member.agt_member_position}"%`)
      .query<ApprovalMatrixRow>(`
        SELECT matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
        FROM agt_approval_matrix
        WHERE section_id = @section_id
          AND form_code  = @form_code
          AND (target_positions LIKE @position_id OR target_positions LIKE '%"ALL"%')
          AND is_active  = 1
      `);

    // ข) ถ้าไม่เจอ และเป็น Sub-section ให้ค้นหาใน Main Section
    if (!matrixResult.recordset[0] && isSubSection) {
      matrixResult = await pool.request()
        .input('section_id', sql.NVarChar(10), mainSection.id_section)
        .input('form_code', sql.NVarChar(50), formCode)
        .input('position_id', sql.NVarChar(sql.MAX), `%"${member.agt_member_position}"%`)
        .query<ApprovalMatrixRow>(`
          SELECT matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
          FROM agt_approval_matrix
          WHERE section_id = @section_id
            AND form_code  = @form_code
            AND (target_positions LIKE @position_id OR target_positions LIKE '%"ALL"%')
            AND is_active  = 1
        `);
      if (matrixResult.recordset[0]) {
        appliedSection = mainSection;
      }
    }

    // ค) ถ้ายังไม่เจอ ให้ค้นหา Matrix มาตรฐานของแบบฟอร์มนั้น (Template Matrix เช่น FM-MN-012 ที่สร้างไว้)
    if (!matrixResult.recordset[0]) {
      matrixResult = await pool.request()
        .input('form_code', sql.NVarChar(50), formCode)
        .input('position_id', sql.NVarChar(sql.MAX), `%"${member.agt_member_position}"%`)
        .query<ApprovalMatrixRow>(`
          SELECT TOP 1 matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
          FROM agt_approval_matrix
          WHERE form_code = @form_code
            AND (target_positions LIKE @position_id OR target_positions LIKE '%"ALL"%')
            AND is_active = 1
          ORDER BY CASE WHEN section_id = 'S005' THEN 0 ELSE 1 END, matrix_id ASC
        `);
    }

    // ง) Fallback: ถ้าค้นหา FM-MN-012-MNU หรือ FM-MN-012-MNM ไม่พบ ให้ลองค้นหา base form_code เช่น FM-MN-012
    if (!matrixResult.recordset[0] && formCode.includes('-')) {
      const parts = formCode.split('-');
      if (parts.length > 3) {
        const baseFormCode = parts.slice(0, 3).join('-'); // เช่น 'FM-MN-012'
        matrixResult = await pool.request()
          .input('base_form_code', sql.NVarChar(50), baseFormCode)
          .input('position_id', sql.NVarChar(sql.MAX), `%"${member.agt_member_position}"%`)
          .query<ApprovalMatrixRow>(`
            SELECT TOP 1 matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
            FROM agt_approval_matrix
            WHERE form_code = @base_form_code
              AND (target_positions LIKE @position_id OR target_positions LIKE '%"ALL"%')
              AND is_active = 1
            ORDER BY CASE WHEN section_id = 'S005' THEN 0 ELSE 1 END, matrix_id ASC
          `);
      }
    }
  }

  // 4.2 ถ้าไม่มี formCode หรือค้นหาตาม formCode ไม่พบ ให้ค้นหา Matrix ประจำแผนก (Fallback)
  if (!matrixResult || !matrixResult.recordset[0]) {
    matrixResult = await pool.request()
      .input('section_id', sql.NVarChar(10), originalSection.id_section)
      .input('position_id', sql.NVarChar(sql.MAX), `%"${member.agt_member_position}"%`)
      .query<ApprovalMatrixRow>(`
        SELECT matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
        FROM agt_approval_matrix
        WHERE section_id  = @section_id
          AND (form_code IS NULL OR form_code = '')
          AND (target_positions LIKE @position_id OR target_positions LIKE '%"ALL"%')
          AND is_active   = 1
      `);
    appliedSection = originalSection;

    // ถ้าไม่เจอ และเป็น Sub-section ให้ Fallback ไปหา Main Section
    if (!matrixResult.recordset[0] && isSubSection) {
      matrixResult = await pool.request()
        .input('section_id', sql.NVarChar(10), mainSection.id_section)
        .input('position_id', sql.NVarChar(sql.MAX), `%"${member.agt_member_position}"%`)
        .query<ApprovalMatrixRow>(`
          SELECT matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
          FROM agt_approval_matrix
          WHERE section_id  = @section_id
            AND (form_code IS NULL OR form_code = '')
            AND (target_positions LIKE @position_id OR target_positions LIKE '%"ALL"%')
            AND is_active   = 1
        `);
      appliedSection = mainSection;
    }
  }

  if (!matrixResult || !matrixResult.recordset[0]) {
    const contextMsg = formCode ? `แบบฟอร์ม ${formCode} หรือแผนก ${appliedSection.name_section}` : appliedSection.name_section;
    throw Object.assign(new Error(`ไม่พบเส้นทางอนุมัติสำหรับ ${contextMsg} - ${member.position_name}`), {
      code: ErrorCodes.MATRIX_NOT_FOUND,
    });
  }

  // ── 5. Parse JSON Steps ───────────────────────────────────
  let steps: ApprovalStep[];
  try {
    steps = JSON.parse(matrixResult.recordset[0].approval_steps) as ApprovalStep[];
  } catch {
    throw Object.assign(new Error('approval_steps JSON ไม่ถูกต้อง'), {
      code: ErrorCodes.INVALID_STEPS_JSON,
    });
  }

  // Sort ตาม step_order เพื่อความแน่ใจ
  steps.sort((a, b) => a.step_order - b.step_order);

  // ── 5.1 โหลด Position Map และ Department Matrix ของผู้ขอ (ถ้ามี) ──
  const positionsResult = await pool.request().query<Position>(`
    SELECT agt_position_id, agt_position_name, agt_position_type, agt_position_level
    FROM agt_position
  `);
  const positionMap = new Map<string, Position>();
  positionsResult.recordset.forEach((p) => positionMap.set(p.agt_position_id, p));

  // ค้นหา Department Matrix ประจำแผนกของผู้ขอ (เช่น IT Matrix ID #4)
  let deptMatrixSteps: ApprovalStep[] | null = null;
  if (formCode) {
    const deptMatrixResult = await pool.request()
      .input('dept_sec_id', sql.NVarChar(10), originalSection.id_section)
      .query<ApprovalMatrixRow>(`
        SELECT matrix_id, section_id, form_code, target_positions, matrix_name, approval_steps, is_active
        FROM agt_approval_matrix
        WHERE section_id = @dept_sec_id
          AND (form_code IS NULL OR form_code = '')
          AND is_active = 1
        ORDER BY matrix_id ASC
      `);

    if (deptMatrixResult.recordset[0]?.approval_steps) {
      try {
        const parsed = JSON.parse(deptMatrixResult.recordset[0].approval_steps) as ApprovalStep[];
        if (Array.isArray(parsed)) {
          deptMatrixSteps = parsed.sort((a, b) => a.step_order - b.step_order);
        }
      } catch {
        deptMatrixSteps = null;
      }
    }
  }

  // Helper ฟังก์ชันสำหรับค้นหา Approver จาก Department Matrix ตาม Tier ตำแหน่ง
  function findApproversFromDeptMatrix(
    deptSteps: ApprovalStep[] | null,
    targetTier: 'supervisor' | 'manager' | 'gm'
  ): Array<{ position_id: string; section_id: string | null }> | null {
    if (!deptSteps || deptSteps.length === 0) return null;

    for (const s of deptSteps) {
      const approvers = s.approvers || [];
      for (const app of approvers) {
        const pos = positionMap.get(app.position_id);
        if (!pos) continue;

        const level = pos.agt_position_level;
        if (targetTier === 'gm' && level <= 1) {
          return approvers;
        }
        if (targetTier === 'manager' && level >= 2 && level <= 5) {
          return approvers;
        }
        if (targetTier === 'supervisor' && level >= 6 && level <= 8) {
          return approvers;
        }
      }
    }
    return null;
  }

  // ── 6. Loop: Skip + Resolve ───────────────────────────────
  const approvalChain: ApprovalChainStep[] = [];
  const approversByKey: Record<string, ApproverInfo[]> = {};
  let skippedCount = 0;

  for (const step of steps) {
    const allowSkip = step.allow_skip !== false;

    // รองรับข้อมูลเก่า (Migration on the fly)
    let stepApprovers = step.approvers || [];
    if (stepApprovers.length === 0 && (step as any).approver_position_id) {
      stepApprovers.push({
        position_id: (step as any).approver_position_id,
        section_id: (step as any).approver_section_id || null,
      });
    }

    // ── Dynamic Resolution จาก Department Matrix ของผู้ขอ (สำหรับขั้นตอนของฝ่ายผู้ขอ) ──
    if (step.step_key === 'step1_sup_req') {
      const deptSup = findApproversFromDeptMatrix(deptMatrixSteps, 'supervisor');
      if (deptSup && deptSup.length > 0) {
        stepApprovers = deptSup;
      }
    } else if (step.step_key === 'step3_asst_req') {
      const deptMgr = findApproversFromDeptMatrix(deptMatrixSteps, 'manager');
      if (deptMgr && deptMgr.length > 0) {
        stepApprovers = deptMgr;
      }
    } else if (step.step_key === 'step5_gm_req') {
      // 1. ตรวจสอบใน Department Matrix ของผู้ขอก่อนเป็นอันดับแรก
      const deptGM = findApproversFromDeptMatrix(deptMatrixSteps, 'gm');
      if (deptGM && deptGM.length > 0) {
        stepApprovers = deptGM;
      } else {
        // 2. Fallback: ถ้าแผนกนั้นยังไม่ได้สร้าง Department Matrix ใน UI ให้ใช้ Fallback เดิม
        const localGMResult = await pool.request()
          .input('sec_id', sql.NVarChar(10), originalSection.id_section)
          .input('pos_id', sql.VarChar(10), 'P002')
          .query(`SELECT TOP 1 agt_member_id FROM dbo.agt_member WHERE agt_member_section = @sec_id AND agt_member_position = @pos_id AND agt_status_job = 'Working'`);

        if (localGMResult.recordset.length > 0) {
          stepApprovers = [{ position_id: 'P002', section_id: originalSection.id_section }];
        } else {
          const divGM = await getDivisionGMForSection(originalSection.id_section);
          stepApprovers = [divGM];
        }
      }
    }

    if (stepApprovers.length === 0) continue;

    const stepDefinitions: StepDefinition[] = [];
    const stepApproversResult: ApproverInfo[] = [];
    let allDefsSkipped = true;

    for (const def of stepApprovers) {
      // ดึง level ของ approver position จาก cache map
      const approverPos = positionMap.get(def.position_id);
      if (!approverPos) continue; // skip ถ้า position ไม่มีในระบบ

      // Skip Rule: เลขน้อย = สูงกว่า
      // 1. ถ้า allowSkip === false: ห้ามข้ามเด็ดขาด
      // 2. ถ้าเป็น Cross-section (ระบุแผนกอื่นนอกกลุ่มสายงานเดียวกัน): ไม่ข้าม
      // 3. ถ้าเป็นสายตรงในกลุ่มสายงานเดียวกัน (main + sub-sections): ข้ามเมื่อ approver level >= requester level
      const isCrossSection = def.section_id !== null && def.section_id !== undefined && !allSectionIds.includes(def.section_id);

      if (allowSkip && !isCrossSection) {
        if (approverPos.agt_position_level >= requesterLevel) {
          continue;
        }
      }

      allDefsSkipped = false;

      // ── 7. Resolve ตัวบุคคล ───────────────────────────────
      // ถ้า section_id = null → ลองหาใน originalSection ของผู้ขอก่อน
      // ถ้าไม่มีคน และเป็น sub-section จึงค่อยขยายไปหาใน mainSection
      let searchSectionIds: string[];
      let approverSectionInfo: { id: string | null; name: string | null };

      if (def.section_id === null || def.section_id === undefined) {
        searchSectionIds = [originalSection.id_section];
        approverSectionInfo = {
          id: originalSection.id_section,
          name: originalSection.name_section,
        };
      } else {
        searchSectionIds = [def.section_id];
        approverSectionInfo = {
          id: def.section_id,
          name: null, // จะ resolve ชื่อด้านล่าง
        };
      }

      // Helper function สำหรับ query พนักงานด้วย Parameterized Query (ป้องกัน SQL Injection 100%)
      async function queryMembers(sectionIds: string[]) {
        const req = pool.request().input('pos_id', sql.VarChar(10), def.position_id);
        const inClauses = sectionIds.map((id, idx) => {
          const pName = `sec_${idx}`;
          req.input(pName, sql.NVarChar(10), id);
          return `@${pName}`;
        }).join(', ');

        let memberFilter = '';
        if (def.member_id && String(def.member_id).trim() !== '') {
          req.input('spec_member_id', sql.NVarChar(15), String(def.member_id).trim());
          memberFilter = ' AND m.agt_member_id = @spec_member_id';
        }

        if (def.location && String(def.location).trim() !== '' && String(def.location).toUpperCase() !== 'ALL') {
          const locs = String(def.location).split(',').map(s => s.trim()).filter(Boolean);
          if (locs.length === 1) {
            req.input('spec_location', sql.NVarChar(100), locs[0]);
            memberFilter += ' AND m.agt_member_location = @spec_location';
          } else if (locs.length > 1) {
            const locIn = locs.map((loc, lIdx) => {
              const lName = `loc_${lIdx}`;
              req.input(lName, sql.NVarChar(100), loc);
              return `@${lName}`;
            }).join(', ');
            memberFilter += ` AND m.agt_member_location IN (${locIn})`;
          }
        }

        return req.query<{
          agt_member_id: string;
          agt_member_nameTH: string;
          agt_member_nameEN: string;
          agt_member_nickname: string;
          agt_member_email: string;
          agt_member_location: string | null;
          sec_id: string;
          sec_name: string;
          sec_fullname: string;
        }>(`
          SELECT
            m.agt_member_id,
            m.agt_member_nameTH,
            m.agt_member_nameEN,
            m.agt_member_nickname,
            m.agt_member_email,
            m.agt_member_location,
            s.id_section    AS sec_id,
            s.name_section  AS sec_name,
            s.name_fullsection AS sec_fullname
          FROM agt_member m
          INNER JOIN agt_section s ON s.id_section = m.agt_member_section
          WHERE m.agt_member_position = @pos_id
            AND m.agt_member_section IN (${inClauses})
            ${memberFilter}
            AND m.agt_status_job = 'Working'
          ORDER BY m.agt_member_id
        `);
      }

      let approversResult = await queryMembers(searchSectionIds);

      // ถ้าค้นหาใน originalSection ไม่พบ และเป็น sub-section ให้ fallback ไปหาที่ mainSection
      if (
        approversResult.recordset.length === 0 &&
        (def.section_id === null || def.section_id === undefined) &&
        isSubSection
      ) {
        searchSectionIds = [mainSection.id_section];
        approverSectionInfo = {
          id: mainSection.id_section,
          name: mainSection.name_section,
        };
        approversResult = await queryMembers(searchSectionIds);
      }

      if (def.section_id !== null && approversResult.recordset[0]) {
        approverSectionInfo.name = approversResult.recordset[0].sec_name;
      }

      stepDefinitions.push({
        position: {
          id: approverPos.agt_position_id,
          name: approverPos.agt_position_name,
          level: approverPos.agt_position_level,
        },
        section: approverSectionInfo,
      });

      const approvers: ApproverInfo[] = approversResult.recordset.map((r) => ({
        member_id: r.agt_member_id,
        name_th: r.agt_member_nameTH,
        name_en: r.agt_member_nameEN,
        nickname: r.agt_member_nickname,
        email: r.agt_member_email,
        location: r.agt_member_location || null,
        section: {
          id: r.sec_id,
          name: r.sec_name,
          full_name: r.sec_fullname,
        },
      }));

      stepApproversResult.push(...approvers);
    }

    // ห้ามซ้ำถ้าดึงคนเดิมมาหลายครั้งจากหลายเงื่อนไข
    const uniqueApprovers = stepApproversResult.filter((v, i, a) => a.findIndex(t => (t.member_id === v.member_id)) === i);

    // จัดกลุ่มใส่ Dictionary ตาม step_key (ถ้ามีการระบุไว้) เพื่อให้ Consumer ดึงไปใช้งานสะดวก
    if (step.step_key) {
      approversByKey[step.step_key] = uniqueApprovers;
    }

    if (allDefsSkipped) {
      skippedCount++;
      approvalChain.push({
        step_order: step.step_order,
        step_key: step.step_key,
        is_skipped: true,
        skip_reason: 'ข้ามโดยอัตโนมัติ (ระดับตำแหน่งของผู้ขอสูงกว่าหรือเท่ากับผู้อนุมัติ)',
        step_definitions: stepDefinitions,
        approvers: [],
      });
      continue;
    }

    // ถ้าไม่มีผู้อนุมัติเลยในสเตปนี้ ให้ข้าม (Skip) พร้อมระบุเหตุผล
    if (uniqueApprovers.length === 0) {
      skippedCount++;
      approvalChain.push({
        step_order: step.step_order,
        step_key: step.step_key,
        is_skipped: true,
        skip_reason: 'ข้ามโดยอัตโนมัติ (ไม่พบรายชื่อพนักงานที่มีสิทธิ์อนุมัติในตำแหน่งนี้)',
        step_definitions: stepDefinitions,
        approvers: [],
      });
      continue;
    }

    approvalChain.push({
      step_order: step.step_order,
      step_key: step.step_key,
      is_skipped: false,
      step_definitions: stepDefinitions,
      approvers: uniqueApprovers,
    });
  }

  // ── 8. Validate & Auto-Approval ───────────────────────────
  const activeSteps = approvalChain.filter((s) => !s.is_skipped);
  const isAutoApproved = activeSteps.length === 0 && steps.length > 0;

  return {
    success: true,
    is_auto_approved: isAutoApproved,
    status: isAutoApproved ? 'AUTO_APPROVED' : 'PENDING',
    message: isAutoApproved
      ? 'อนุมัติอัตโนมัติ (ผู้ขอเป็นผู้มีอำนาจสูงสุดหรือตำแหน่งสูงกว่าผู้อนุมัติทุกขั้นตอน)'
      : undefined,
    form_code: formCode,
    requester: requesterInfo,
    approval_chain: approvalChain,
    approvers_by_key: Object.keys(approversByKey).length > 0 ? approversByKey : undefined,
    total_steps: approvalChain.length,
    skipped_steps: skippedCount,
  };
}
