import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';

const router = Router();

// GET /api/locations — รายการ Locations ที่มีอยู่จริงจาก agt_member ที่ยังทำงานอยู่
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query<{ location_name: string }>(`
      SELECT DISTINCT LTRIM(RTRIM(agt_member_location)) AS location_name
      FROM agt_member
      WHERE agt_member_location IS NOT NULL
        AND LTRIM(RTRIM(agt_member_location)) <> ''
        AND agt_status_job = 'Working'
      ORDER BY location_name ASC
    `);

    const locations = result.recordset
      .map(r => r.location_name)
      .filter((loc): loc is string => Boolean(loc && loc.trim() !== ''));

    res.json({ success: true, data: locations, total: locations.length });
  } catch (err) {
    next(err);
  }
});

export default router;
