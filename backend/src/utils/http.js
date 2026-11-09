import logger from './logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** Log the real error and send a generic message (no internal details to clients). */
export function serverError(res, message, error) {
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
