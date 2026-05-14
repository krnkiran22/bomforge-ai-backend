// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import Database from './config/database';
import uploadRoutes from './routes/upload.routes';
import convertRoutes from './routes/convert.routes';
import historyRoutes from './routes/history.routes';
import erpnextRoutes from './routes/erpnext.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import logger from './utils/logger';
import knowledgeService from './services/knowledge.service';
import { betaAccessMiddleware } from './middleware/auth.middleware';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Railway health checks)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint (always accessible)
app.get('/health', (_req, res) => {
  const dbStatus = Database.getConnectionStatus();
  // Always return 200 so Railway health check passes even during DB init
  res.status(200).json({
    success: true,
    message: 'BOMForge AI Backend is running',
    database: dbStatus ? 'connected' : 'connecting',
    timestamp: new Date().toISOString(),
    service: 'BOMForge AI Backend'
  });
});

// Beta Access Control
app.use(betaAccessMiddleware);

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/erpnext', erpnextRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Start Express server FIRST — health check responds immediately on Railway
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`🚀 BOMForge AI Backend running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✅ Health check live at /health`);

      if (!process.env.GROQ_API_KEY) {
        logger.warn('⚠️  GROQ_API_KEY not configured.');
      }

      // Connect to MongoDB in background — doesn't block server start
      Database.connect()
        .then(async () => {
          logger.info('✅ MongoDB connected');
          if (process.env.SEED_KNOWLEDGE === 'true') {
            await knowledgeService.seedInitialKnowledge();
            logger.info('🌱 Knowledge base seeded');
          }
        })
        .catch((err: Error) => {
          logger.error('❌ MongoDB connection failed:', err.message);
        });
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ── Keep-alive self-ping (prevents Railway from sleeping on inactivity) ───────
const PING_INTERVAL_MS = 14 * 60 * 1000; // every 14 minutes
const selfUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
  : null;

if (selfUrl && process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      const res = await fetch(selfUrl);
      logger.info(`🏓 Keep-alive ping → ${res.status} OK`);
    } catch (e: any) {
      logger.warn(`⚠️  Keep-alive ping failed: ${e.message}`);
    }
  }, PING_INTERVAL_MS);
  logger.info(`🏓 Keep-alive enabled — pinging ${selfUrl} every 14 minutes`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await Database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await Database.disconnect();
  process.exit(0);
});

export default app;
