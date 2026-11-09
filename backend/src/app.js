import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { rateLimit } from './middleware/rateLimit.js';
import disasterRoutes from './routes/disasterRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import socialMediaRoutes from './routes/socialMediaRoutes.js';

dotenv.config();

const DEFAULT_ORIGINS = [
  'https://disaster-response-coordination-one.vercel.app',
  'http://localhost:5173',
];

/** Allowed browser origins: CORS_ORIGINS (comma-separated) plus FRONTEND_URL. */
export function allowedOrigins() {
  const fromEnv = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ORIGINS;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Render (and most PaaS) put one proxy in front; needed so req.ip is the client IP for rate limiting.
  app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

  const origins = allowedOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser clients (curl, server-to-server) send no Origin header.
        if (!origin || origins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/api', rateLimit);
  app.use('/api/disasters', disasterRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/social-media', socialMediaRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    logger.error(`Unhandled error: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export const app = createApp();
