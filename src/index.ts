import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from './config/database';
import uploadRoutes from './routes/upload.routes';
import convertRoutes from './routes/convert.routes';
import historyRoutes from './routes/history.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import logger from './utils/logger';
import knowledgeService from './services/knowledge.service';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  const dbStatus = Database.getConnectionStatus();
  
  res.status(dbStatus ? 200 : 503).json({
    success: true,
    message: 'BOMForge AI Backend is running',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    service: 'BOMForge AI Backend'
  });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/history', historyRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await Database.connect();
    
    // Seed initial knowledge base if enabled
    if (process.env.SEED_KNOWLEDGE === 'true') {
      logger.info('🌱 Seeding knowledge base...');
      await knowledgeService.seedInitialKnowledge();
    }
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 BOMForge AI Backend running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API: http://localhost:${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      
      // Multi-Model Status
      if (process.env.USE_MULTI_MODEL === 'true') {
        logger.info('🤖 Multi-Model AI: ENABLED (5 specialized models)');
      } else {
        logger.info('🤖 Multi-Model AI: DISABLED (using single model)');
      }
      
      if (!process.env.GROQ_API_KEY) {
        logger.warn('⚠️  GROQ_API_KEY not configured. AI features will not work.');
      }
      
      if (!process.env.MONGODB_URI) {
        logger.warn('⚠️  MONGODB_URI not configured. Using default: mongodb://localhost:27017/bomforge');
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

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
