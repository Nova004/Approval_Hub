import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool } from './config/database';
import { errorHandler } from './middleware/error-handler';

// Routes
import approvalRoutes from './routes/approval.routes';
import matrixRoutes from './routes/matrix.routes';
import sectionRoutes from './routes/section.routes';
import positionRoutes from './routes/position.routes';
import memberRoutes from './routes/member.routes';
import locationRoutes from './routes/location.routes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3002', 10);

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Approval Hub API',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/approval', approvalRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/locations', locationRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint นี้ไม่มีในระบบ' },
  });
});

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────
async function bootstrap() {
  try {
    await getPool(); // test DB connection on startup
    app.listen(PORT, () => {
      console.log(`🚀 Approval Hub API running on http://localhost:${PORT}`);
      console.log(`📋 Routes:`);
      console.log(`   GET  /api/approval/calculate?member_id=xxx`);
      console.log(`   GET  /api/matrix`);
      console.log(`   POST /api/matrix`);
      console.log(`   PUT  /api/matrix/:id`);
      console.log(`   DEL  /api/matrix/:id`);
      console.log(`   GET  /api/sections`);
      console.log(`   GET  /api/positions`);
      console.log(`   GET  /api/members`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
