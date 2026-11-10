import logger from './logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/**
 * Network/configuration failures that mean "the database is not reachable",
 * as opposed to a bug in our own code.
 *
 * A free Supabase project is paused after a week of inactivity, which is how
 * this deployment's `/api/disasters` ended up answering a flat 500 "Failed to
 * fetch disasters" — a message that tells neither a user nor the maintainer
 * that the cause is an upstream outage rather than broken code.
 */
const UPSTREAM_PATTERNS = [
  /fetch failed/i,
  /ENOTFOUND/,
  /ECONNREFUSED/,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /EAI_AGAIN/,
  /getaddrinfo/i,
  /socket hang up/i,
  /Supabase is not configured/i,
  /network/i,
];

/** True when the error looks like the datastore being unreachable or unset. */
export function isUpstreamUnavailable(error) {
  if (!error) return false;
  const text = [error.message, error.cause?.message, error.code, error.details]
    .filter(Boolean)
    .join(' ');
  if (UPSTREAM_PATTERNS.some((re) => re.test(text))) return true;
  // PostgREST surfaces Postgres connection-exception codes in class 08.
  return typeof error.code === 'string' && error.code.startsWith('08');
}

/**
 * Log the real error and send a generic message; no internal details reach the
 * client. An unreachable datastore answers 503 with Retry-After rather than
 * 500, so monitoring and users can tell an outage from a defect.
 */
export function serverError(res, message, error) {
  if (isUpstreamUnavailable(error)) {
    logger.error(`${message} (datastore unavailable): ${error?.message || error}`);
    res.set('Retry-After', '60');
    return res.status(503).json({
      error: 'The database is currently unavailable. Please try again shortly.',
    });
  }
  logger.error(`${message}: ${error?.message || error}`);
  return res.status(500).json({ error: message });
}

/** Emit a Socket.IO event if the io instance is registered on the app. */
export function emit(req, event, payload) {
  const io = req.app.get('io');
  if (io) io.emit(event, payload);
}

export const cleanString = (value, max = 5000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : undefined;

export const cleanTags = (tags) =>
  Array.isArray(tags)
    ? tags.filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 20)
    : [];

/** Keyword-based report priority. */
export const reportPriority = (content) =>
  /urgent|emergency|immediate|critical/i.test(content) ? 'high' : 'normal';
