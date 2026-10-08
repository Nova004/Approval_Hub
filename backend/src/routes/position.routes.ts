import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';

const router = Router();

// GET /api/positions — ทุกตำแหน่ง (เรียงตาม level น้อย→มาก = สูง→ต่ำ)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT agt_position_id, agt_position_name, agt_position_type, agt_position_level
      FROM agt_position
      ORDER BY agt_position_level ASC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
});

export default router;
