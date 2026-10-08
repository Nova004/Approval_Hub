import { Router, Request, Response, NextFunction } from 'express';
import { calculateApprovalChain } from '../services/approval.service';
import { ErrorCodes } from '../types';

const router = Router();

/**
 * GET /api/approval/calculate?member_id=101&form_code=FM-QA-048
 * Core Routing Engine — Stateless
 */
router.get('/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Optional API Key protection if set in environment
    const requiredApiKey = process.env.API_KEY;
    if (requiredApiKey) {
      const clientApiKey = req.headers['x-api-key'];
      if (!clientApiKey || clientApiKey !== requiredApiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'API Key ไม่ถูกต้องหรือไม่ได้ระบุผ่าน header x-api-key',
          },
        });
      }
    }

    const memberId = req.query.member_id as string;
    const formCode = req.query.form_code as string | undefined;

    if (!memberId || memberId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'กรุณาระบุ member_id ที่ถูกต้อง',
        },
      });
    }

    const result = await calculateApprovalChain(memberId, formCode);
    return res.status(200).json(result);
  } catch (err: any) {
    // Known business errors
    const knownCodes = Object.values(ErrorCodes) as string[];
    if (err.code && knownCodes.includes(err.code)) {
      const statusMap: Record<string, number> = {
        [ErrorCodes.MEMBER_NOT_FOUND]: 404,
        [ErrorCodes.MATRIX_NOT_FOUND]: 404,
        [ErrorCodes.NO_APPROVER_FOUND]: 422,
        [ErrorCodes.ALL_STEPS_SKIPPED]: 422,
        [ErrorCodes.INVALID_STEPS_JSON]: 500,
      };
      return res.status(statusMap[err.code] || 400).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
});

export default router;
