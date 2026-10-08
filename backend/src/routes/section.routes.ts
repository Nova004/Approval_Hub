import { Router, Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { getAllSections } from '../services/section.service';

const router = Router();

// GET /api/sections — ทุกแผนก (active)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sections = await getAllSections();
    res.json({ success: true, data: sections });
  } catch (err) {
    next(err);
  }
});

export default router;
