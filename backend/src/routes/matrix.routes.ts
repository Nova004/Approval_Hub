import { Router, Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import {
  ApprovalMatrixRow,
  ApprovalMatrix,
  CreateMatrixDto,
  UpdateMatrixDto,
} from '../types';

const router = Router();

// Helper: parse approval_steps JSON
function parseMatrix(row: ApprovalMatrixRow): ApprovalMatrix {
  return {
    ...row,
    target_positions: typeof row.target_positions === 'string' ? JSON.parse(row.target_positions) : row.target_positions,
    approval_steps: typeof row.approval_steps === 'string' ? JSON.parse(row.approval_steps) : row.approval_steps,
  };
}

/**
 * GET /api/matrix
 * ดึง Matrix ทั้งหมด (รองรับ filter: section_id, position_id, is_active)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const { section_id, position_id, form_code, is_active } = req.query;

    let query = `
      SELECT
        m.matrix_id, m.section_id, m.form_code, m.target_positions, m.matrix_name,
        m.approval_steps, m.is_active, m.created_at, m.updated_at,
        s.name_section, s.name_fullsection
      FROM agt_approval_matrix m
      INNER JOIN agt_section  s ON s.id_section = m.section_id
      WHERE 1=1
    `;

    const request = pool.request();

    if (section_id) {
      query += ' AND m.section_id = @section_id';
      request.input('section_id', sql.NVarChar(10), String(section_id));
    }
    if (form_code) {
      query += ' AND m.form_code = @form_code';
      request.input('form_code', sql.NVarChar(50), String(form_code));
    }
    if (position_id) {
      query += ' AND m.target_positions LIKE @position_id';
      request.input('position_id', sql.NVarChar(sql.MAX), `%"${String(position_id)}"%`);
    }
    if (is_active !== undefined) {
      query += ' AND m.is_active = @is_active';
      const activeStr = String(is_active);
      request.input('is_active', sql.Bit, activeStr === 'true' || activeStr === '1' ? 1 : 0);
    }

    query += ' ORDER BY s.name_section, m.matrix_id';

    const result = await request.query(query);

    const matrices = result.recordset.map((row: any) => ({
      matrix_id: row.matrix_id,
      section_id: row.section_id,
      form_code: row.form_code,
      section_name: row.name_section,
      section_fullname: row.name_fullsection,
      target_positions: typeof row.target_positions === 'string' ? JSON.parse(row.target_positions) : row.target_positions,
      matrix_name: row.matrix_name,
      approval_steps: typeof row.approval_steps === 'string' ? JSON.parse(row.approval_steps) : row.approval_steps,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    res.json({ success: true, data: matrices, total: matrices.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matrix/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const matrixId = parseInt(String(req.params.id), 10);

    const result = await pool.request()
      .input('matrix_id', sql.Int, matrixId)
      .query<ApprovalMatrixRow>(`
        SELECT matrix_id, section_id, form_code, target_positions, matrix_name,
               approval_steps, is_active, created_at, updated_at
        FROM agt_approval_matrix
        WHERE matrix_id = @matrix_id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `ไม่พบ Matrix ID ${matrixId}` },
      });
    }

    res.json({ success: true, data: parseMatrix(result.recordset[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/matrix
 * สร้าง Matrix ใหม่
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const body: CreateMatrixDto = req.body;

    if (!body.section_id || !body.target_positions || body.target_positions.length === 0 || !body.approval_steps) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'section_id, target_positions และ approval_steps จำเป็นต้องระบุ' },
      });
    }

    const stepsJson = JSON.stringify(body.approval_steps);
    const posJson = JSON.stringify(body.target_positions);

    const result = await pool.request()
      .input('section_id', sql.NVarChar(10), body.section_id)
      .input('form_code', sql.NVarChar(50), body.form_code || null)
      .input('target_positions', sql.NVarChar(sql.MAX), posJson)
      .input('matrix_name', sql.NVarChar(300), body.matrix_name || null)
      .input('approval_steps', sql.NVarChar(sql.MAX), stepsJson)
      .input('is_active', sql.Bit, body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1)
      .query<{ matrix_id: number }>(`
        INSERT INTO agt_approval_matrix (section_id, form_code, target_positions, matrix_name, approval_steps, is_active)
        OUTPUT INSERTED.matrix_id
        VALUES (@section_id, @form_code, @target_positions, @matrix_name, @approval_steps, @is_active)
      `);

    const newId = result.recordset[0].matrix_id;
    res.status(201).json({ success: true, data: { matrix_id: newId }, message: 'สร้าง Matrix สำเร็จ' });
  } catch (err: any) {
    next(err);
  }
});

/**
 * PUT /api/matrix/:id
 * แก้ไข Matrix
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const matrixId = parseInt(String(req.params.id), 10);
    const body: UpdateMatrixDto = req.body;

    const setClauses: string[] = ['updated_at = GETDATE()'];
    const request = pool.request().input('matrix_id', sql.Int, matrixId);

    if (body.matrix_name !== undefined) {
      setClauses.push('matrix_name = @matrix_name');
      request.input('matrix_name', sql.NVarChar(300), body.matrix_name || null);
    }
    if (body.form_code !== undefined) {
      setClauses.push('form_code = @form_code');
      request.input('form_code', sql.NVarChar(50), body.form_code || null);
    }
    if (body.approval_steps !== undefined) {
      setClauses.push('approval_steps = @approval_steps');
      request.input('approval_steps', sql.NVarChar(sql.MAX), JSON.stringify(body.approval_steps));
    }
    if (body.is_active !== undefined) {
      setClauses.push('is_active = @is_active');
      request.input('is_active', sql.Bit, body.is_active ? 1 : 0);
    }

    const result = await request.query(`
      UPDATE agt_approval_matrix
      SET ${setClauses.join(', ')}
      WHERE matrix_id = @matrix_id
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `ไม่พบ Matrix ID ${matrixId}` },
      });
    }

    res.json({ success: true, message: 'อัพเดต Matrix สำเร็จ' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/matrix/:id
 * Soft delete (set is_active = 0)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const matrixId = parseInt(String(req.params.id), 10);

    const result = await pool.request()
      .input('matrix_id', sql.Int, matrixId)
      .query(`
        UPDATE agt_approval_matrix
        SET is_active = 0, updated_at = GETDATE()
        WHERE matrix_id = @matrix_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `ไม่พบ Matrix ID ${matrixId}` },
      });
    }

    res.json({ success: true, message: 'ปิดการใช้งาน Matrix สำเร็จ' });
  } catch (err) {
    next(err);
  }
});

export default router;
