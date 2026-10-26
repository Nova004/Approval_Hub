import { Router, Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';

const router = Router();

// GET /api/members?section_id=1&position_id=2&search=xxx
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const { section_id, position_id, location, search } = req.query;

    let query = `
      SELECT
        m.agt_member_id,
        m.agt_member_nameTH,
        m.agt_member_nameEN,
        m.agt_member_nickname,
        m.agt_member_email,
        m.agt_member_position,
        m.agt_member_section,
        m.agt_member_location,
        p.agt_position_name,
        p.agt_position_level,
        s.name_section,
        s.name_fullsection
      FROM agt_member m
      LEFT JOIN agt_position p ON p.agt_position_id = m.agt_member_position
      LEFT JOIN agt_section s ON s.id_section = m.agt_member_section
      WHERE m.agt_status_job = 'Working'
    `;

    const request = pool.request();

    if (section_id) {
      query += ' AND m.agt_member_section = @section_id';
      request.input('section_id', sql.NVarChar(10), String(section_id));
    }
    if (position_id) {
      query += ' AND m.agt_member_position = @position_id';
      request.input('position_id', sql.VarChar(10), String(position_id));
    }
    if (location) {
      query += ' AND m.agt_member_location = @location';
      request.input('location', sql.NVarChar(100), String(location).trim());
    }
    if (search) {
      query += ` AND (
        m.agt_member_nameTH  LIKE '%' + @search + '%'
        OR m.agt_member_nameEN  LIKE '%' + @search + '%'
        OR m.agt_member_nickname LIKE '%' + @search + '%'
        OR m.agt_member_email    LIKE '%' + @search + '%'
        OR m.agt_member_location LIKE '%' + @search + '%'
        OR CAST(m.agt_member_id AS NVARCHAR) = @search
      )`;
      request.input('search', sql.NVarChar(200), String(search));
    }

    query += ' ORDER BY m.agt_member_nameTH';

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/members/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('member_id', sql.Int, parseInt(String(req.params.id), 10))
      .query(`
        SELECT
          m.agt_member_id, m.agt_member_nameTH, m.agt_member_nameEN,
          m.agt_member_nickname, m.agt_member_sex, m.agt_member_email,
          m.agt_member_position, m.agt_member_section, m.agt_member_location,
          p.agt_position_name, p.agt_position_level,
          s.name_section, s.name_fullsection
        FROM agt_member m
        INNER JOIN agt_position p ON p.agt_position_id = m.agt_member_position
        INNER JOIN agt_section  s ON s.id_section       = m.agt_member_section
        WHERE m.agt_member_id = @member_id AND m.agt_status_job = 'Working'
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `ไม่พบพนักงาน ID ${req.params.id}` },
      });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
