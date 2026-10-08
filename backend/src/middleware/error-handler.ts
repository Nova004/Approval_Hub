import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ERROR]', err);

  // SQL Server errors
  if (err.number) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'เกิดข้อผิดพลาดจากฐานข้อมูล',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    },
  });
}
