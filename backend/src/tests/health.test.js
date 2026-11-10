/**
 * Health probes and the outage-vs-defect distinction.
 *
 * The regression being guarded: the live `/api/disasters` answered a flat
 * `500 {"error":"Failed to fetch disasters"}` when its free Supabase project was
 * paused. That tells a user nothing and tells the maintainer nothing — an
 * upstream outage and a bug in our own code looked identical.
 */
import request from 'supertest';
import { app } from '../app.js';
import supabaseService from '../services/supabaseService.js';
import { isUpstreamUnavailable } from '../utils/http.js';

jest.mock('../services/supabaseService.js');

beforeEach(() => {
  jest.resetAllMocks();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-key-for-tests';
});

describe('GET /health (liveness)', () => {
  it('is 200 and never touches the datastore', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    // Restarting a live process during an upstream outage would be wrong.
    expect(supabaseService.ping).not.toHaveBeenCalled();
  });
});

describe('GET /health/ready (readiness)', () => {
  it('is 200 when Supabase answers', async () => {
    supabaseService.ping.mockResolvedValue(true);
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.supabase).toEqual({ configured: true, reachable: true });
  });

  it('is 503 with a Retry-After and an actionable hint when Supabase is paused', async () => {
    supabaseService.ping.mockRejectedValue(new Error('fetch failed'));
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unavailable');
    expect(res.headers['retry-after']).toBe('60');
    expect(res.body.checks.supabase.reachable).toBe(false);
    // The hint has to name the actual cause, not just "unavailable".
    expect(res.body.hint).toMatch(/paused/i);
  });

  it('is 503 with a configuration hint when the credentials are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    supabaseService.ping.mockRejectedValue(new Error('Supabase is not configured'));

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.checks.supabase.configured).toBe(false);
    expect(res.body.hint).toMatch(/SUPABASE_URL/);
  });

  it('reports the optional integrations without failing readiness over them', async () => {
    // Gemini and OpenCage both have documented fallbacks.
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENCAGE_API_KEY;
    supabaseService.ping.mockResolvedValue(true);

    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.gemini.configured).toBe(false);
    expect(res.body.checks.opencage.configured).toBe(false);
  });
});

describe('isUpstreamUnavailable', () => {
  it.each([
    'fetch failed',
    'getaddrinfo ENOTFOUND db.supabase.co',
    'connect ECONNREFUSED 127.0.0.1:5432',
    'ETIMEDOUT',
    'socket hang up',
    'Supabase is not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)',
  ])('treats %s as an outage', (message) => {
    expect(isUpstreamUnavailable(new Error(message))).toBe(true);
  });

  it('reads a wrapped cause, which is how undici reports failures', () => {
    const error = new Error('TypeError');
    error.cause = new Error('ECONNREFUSED');
    expect(isUpstreamUnavailable(error)).toBe(true);
  });

  it('treats Postgres connection-exception class 08 as an outage', () => {
    expect(isUpstreamUnavailable({ code: '08006', message: 'connection failure' })).toBe(true);
  });

  it('does NOT misclassify our own bugs as an outage', () => {
    expect(isUpstreamUnavailable(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isUpstreamUnavailable(new Error('password authentication failed'))).toBe(false);
    // A real constraint violation is a defect or bad input, not an outage.
    expect(isUpstreamUnavailable({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(isUpstreamUnavailable(null)).toBe(false);
    expect(isUpstreamUnavailable(undefined)).toBe(false);
  });
});

describe('route-level outage handling', () => {
  it('maps an unreachable datastore to 503, not 500', async () => {
    supabaseService.getAllDisasters.mockRejectedValue(new Error('fetch failed'));
    const res = await request(app).get('/api/disasters');

    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBe('60');
    expect(res.body.error).toMatch(/database is currently unavailable/i);
  });

  it('still returns 500 for a genuine defect, and leaks nothing', async () => {
    supabaseService.getAllDisasters.mockRejectedValue(
      new Error('password authentication failed for user "postgres"')
    );
    const res = await request(app).get('/api/disasters');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('postgres');
  });
});
