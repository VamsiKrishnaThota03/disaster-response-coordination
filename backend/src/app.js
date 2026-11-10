import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { rateLimit } from './middleware/rateLimit.js';
import disasterRoutes from './routes/disasterRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import socialMediaRoutes from './routes/socialMediaRoutes.js';
import supabaseService from './services/supabaseService.js';

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

  // Liveness: the process is accepting connections. Deliberately independent of
  // Supabase, so the platform does not restart a healthy process during an
  // upstream outage.
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

  // Readiness: can we actually reach the datastore? This is what turns
  // "the demo is broken" into "the Supabase project is paused", with no deploy.
  app.get('/health/ready', async (req, res) => {
    const checks = {
      supabase: {
        configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      },
      // Both of these have documented fallbacks, so they are reported for
      // diagnosis but are not load-bearing for readiness.
      gemini: { configured: Boolean(process.env.GEMINI_API_KEY) },
      opencage: { configured: Boolean(process.env.OPENCAGE_API_KEY) },
    };

    try {
      await supabaseService.ping();
      checks.supabase.reachable = true;
      return res.json({ status: 'ready', checks });
    } catch (error) {
      checks.supabase.reachable = false;
      checks.supabase.error = error?.message || String(error);
      logger.error(`Readiness check failed: ${checks.supabase.error}`);
      res.set('Retry-After', '60');
      return res.status(503).json({
        status: 'unavailable',
        hint: checks.supabase.configured
          ? 'Supabase is configured but unreachable. A free project is paused after about a week idle; resume it from the Supabase dashboard.'
          : 'Set SUPABASE_URL and SUPABASE_ANON_KEY.',
        checks,
      });
    }
  });

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
