import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: Number(process.env.RATE_LIMIT_PER_SECOND || 10),
  duration: 1,
});

/** 10 requests per second per client IP (in memory, per instance). */
export async function rateLimit(req, res, next) {
  try {
    await limiter.consume(req.ip);
    return next();
  } catch {
    return res.status(429).json({ error: 'Too many requests' });
  }
}
