import supabaseService from '../services/supabaseService.js';
import logger from '../utils/logger.js';
import { bypassAllowed } from '../config/authBypass.js';

const adminIds = () =>
  (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Requires a valid Supabase Auth access token (Authorization: Bearer <jwt>).
 * Sets req.user = { id, email, isAdmin }.
 *
 * For local development without Supabase Auth set AUTH_DISABLED=true: every
 * request is then treated as the user "local-dev". That bypass is refused
 * outright when NODE_ENV=production or a managed-platform marker is present
 * (see config/authBypass.js), and server.js exits at startup rather than boot
 * into that state — so a stray env var on the host cannot open the API up.
 */
export async function requireAuth(req, res, next) {
  if (bypassAllowed()) {
    req.user = { id: 'local-dev', email: null, isAdmin: true };
    return next();
  }

  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Sign in to make changes' });
  }

  try {
    const user = await supabaseService.getUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'Your session has expired, please sign in again' });
    req.user = { id: user.id, email: user.email, isAdmin: adminIds().includes(user.id) };
    return next();
  } catch (error) {
    logger.error(`Auth check failed: ${error.message}`);
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
}

/** Only admins (ADMIN_USER_IDS) may continue. Must run after requireAuth. */
export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  return next();
}

/** Owners of a record or admins. */
export const canModify = (user, ownerId) => Boolean(user && (user.isAdmin || (ownerId && ownerId === user.id)));
