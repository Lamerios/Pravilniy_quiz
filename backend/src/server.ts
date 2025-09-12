/**
 * Main server entry point
 * Sets up Express server with Socket.io integration
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from './utils/logger';
import { database } from './db/database';
import { setupSocketHandlers } from './services/socketService';
import { ApiError } from './utils/ApiError';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);

// Setup CORS origins (support multiple origins in dev)
const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001'
];
const envCors = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS; // allow either var
const allowedOrigins = envCors
  ? envCors.split(',').map((s) => s.trim()).filter(Boolean)
  : defaultCorsOrigins;

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"]
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Static files for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), '..', 'uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await database.testConnection();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

// API routes
import templatesRouter from './routes/templates';
import teamsRouter from './routes/teams';
import gamesRouter from './routes/games';
import publicRouter from './routes/public';

app.use('/api/templates', templatesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/public', publicRouter);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Known API errors
  if (error instanceof ApiError) {
    logger.warn('ApiError', {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      path: req.path,
      method: req.method,
    });
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      details: error.details,
    });
  }

  // Fallback
  logger.error('Unhandled error', { 
    error: error?.message || String(error), 
    stack: error?.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, async () => {
  logger.info(`Server started on ${HOST}:${PORT}`);
  
  // Test database connection on startup
  const dbConnected = await database.testConnection();
  if (!dbConnected) {
    logger.error('Failed to connect to database on startup');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
});

export { app, io };
