import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

import { connectDatabase, closeDatabase } from './config/database';
import { getRedis, closeRedis } from './config/redis';
import { env, PORT } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import emailConfigRoutes from './routes/emailconfig.routes';
import { CleanupJob } from './utils/cleanup.job';
import totpRoutes from './routes/totp.routes';

// ── Load Swagger Spec from YAML ───────────────────────────────────────────────

const swaggerSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, '../docs/api.docs.yml'), 'utf8')
) as object;

// ── App Factory ───────────────────────────────────────────────────────────────

function createApp(): Application {
  const app = express();

  // ── Security Headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-App-ID',
      ],
      credentials: true,
    })
  );

  // ── Body Parsing ─────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Trust Proxy ──────────────────────────────────────────────────────────────
  // Needed to get real IP addresses when behind nginx/load balancer
  app.set('trust proxy', 1);

  // ── Swagger UI ───────────────────────────────────────────────────────────────
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'AuthServer API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );

  // ── Routes ───────────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/emailconfig', emailConfigRoutes);
  app.use('/api/2fa', totpRoutes);


  // ── 404 Handler ──────────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // ── Global Error Handler ─────────────────────────────────────────────────────
  // Must be registered last — after all routes
  app.use(errorHandler);

  return app;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    getRedis();

    // Create Express app
    const app = createApp();

    // Start cleanup job
    const cleanupJob = new CleanupJob();
    cleanupJob.start();

    // Start server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('   AuthServer running!');
      console.log(`   API:      http://localhost:${PORT}/api/auth`);
      console.log(`   Docs:     http://localhost:${PORT}/docs`);
      console.log(`   Health:   http://localhost:${PORT}/api/auth/health`);
      console.log(`   Env:      ${env.NODE_ENV}`);
      console.log('');
    });

    // ── Graceful Shutdown ──────────────────────────────────────────────────────

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received — shutting down gracefully...`);

      server.close(async () => {
        try {
          cleanupJob.stop();
          await closeDatabase();
          await closeRedis();
          console.log('Shutdown complete');
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      process.exit(1);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();