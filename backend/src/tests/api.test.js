import request from 'supertest';
import { app } from '../app.js';
import supabaseService from '../services/supabaseService.js';
import geminiService from '../services/geminiService.js';
import geocodingService from '../services/geocodingService.js';

jest.mock('../services/supabaseService.js');
jest.mock('../services/geminiService.js');
jest.mock('../services/geocodingService.js');

const ID = '11111111-1111-4111-8111-111111111111';
const auth = { Authorization: 'Bearer good-token' };
const user = { id: 'user-1', email: 'a@example.com' };

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.AUTH_DISABLED;
  delete process.env.ADMIN_USER_IDS;
  supabaseService.getUserFromToken.mockImplementation(async (t) => (t === 'good-token' ? user : null));
  geminiService.extractLocation.mockResolvedValue('Miami, FL');
  geminiService.analyzePriority.mockResolvedValue('high');
  geocodingService.getCoordinates.mockResolvedValue({ latitude: 25.76, longitude: -80.19 });
});

describe('GET /api/disasters', () => {
  it('returns disasters without auth', async () => {
    supabaseService.getAllDisasters.mockResolvedValue([{ id: ID, title: 'Flood' }]);
    const res = await request(app).get('/api/disasters');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('hides internal error details', async () => {
    supabaseService.getAllDisasters.mockRejectedValue(new Error('password authentication failed'));
    const res = await request(app).get('/api/disasters');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('404s on unknown or malformed ids', async () => {
    supabaseService.getDisasterById.mockResolvedValue(null);
    expect((await request(app).get(`/api/disasters/${ID}`)).status).toBe(404);
    expect((await request(app).get('/api/disasters/not-a-uuid')).status).toBe(404);
  });
});

describe('POST /api/disasters', () => {
  const body = { title: 'Flood', description: 'Flooding in Miami, FL', tags: ['flood', 3] };

  it('requires a valid session', async () => {
    expect((await request(app).post('/api/disasters').send(body)).status).toBe(401);
    expect((await request(app).post('/api/disasters').set({ Authorization: 'Bearer bad' }).send(body)).status).toBe(401);
    expect(supabaseService.createDisaster).not.toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    const res = await request(app).post('/api/disasters').set(auth).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  it('creates with the verified user as owner and geocoded point', async () => {
    supabaseService.createDisaster.mockImplementation(async (d) => ({ id: ID, ...d }));
    const res = await request(app)
      .post('/api/disasters')
      .set(auth)
      .send({ ...body, owner_id: 'someone-else' });
    expect(res.status).toBe(201);
    expect(res.body.owner_id).toBe('user-1');
    expect(res.body.location).toBe('POINT(-80.19 25.76)');
    expect(res.body.priority).toBe('high');
    expect(res.body.tags).toEqual(['flood']);
  });
});

describe('PUT/DELETE /api/disasters/:id', () => {
  it('only lets the owner or an admin modify', async () => {
    supabaseService.getDisasterById.mockResolvedValue({ id: ID, owner_id: 'other', description: 'd' });
    expect((await request(app).delete(`/api/disasters/${ID}`).set(auth)).status).toBe(403);

    process.env.ADMIN_USER_IDS = 'user-1';
    supabaseService.deleteDisaster.mockResolvedValue(true);
    expect((await request(app).delete(`/api/disasters/${ID}`).set(auth)).status).toBe(200);
  });

  it('whitelists and validates update fields', async () => {
    supabaseService.getDisasterById.mockResolvedValue({ id: ID, owner_id: 'user-1', description: 'd' });
    supabaseService.updateDisaster.mockImplementation(async (id, c) => ({ id, ...c }));
    expect((await request(app).put(`/api/disasters/${ID}`).set(auth).send({ status: 'bogus' })).status).toBe(400);
    const res = await request(app).put(`/api/disasters/${ID}`).set(auth).send({ status: 'resolved', owner_id: 'x' });
    expect(res.status).toBe(200);
    expect(supabaseService.updateDisaster).toHaveBeenCalledWith(ID, { status: 'resolved' });
  });
});

describe('reports and resources', () => {
  it('creates a report as the signed-in user with keyword priority', async () => {
    supabaseService.getDisasterById.mockResolvedValue({ id: ID, owner_id: 'other' });
    supabaseService.createReport.mockImplementation(async (r) => ({ id: 'r1', ...r }));
    const res = await request(app)
      .post(`/api/disasters/${ID}/reports`)
      .set(auth)
      .send({ content: 'URGENT: people trapped', user_id: 'spoofed' });
    expect(res.status).toBe(201);
    expect(res.body.user_id).toBe('user-1');
    expect(res.body.priority).toBe('high');
  });

  it('returns nearby resources for a disaster stored as GeoJSON or EWKB', async () => {
    supabaseService.getDisasterById.mockResolvedValue({
      id: ID,
      location: '0101000020E61000005C8FC2F5280C54C0C3F5285C8FC23940', // POINT(-80.19 25.76)
    });
    supabaseService.findResourcesWithinDistance.mockResolvedValue([{ id: 'res1' }]);
    const res = await request(app).get(`/api/disasters/${ID}/resources?radius=5000`);
    expect(res.status).toBe(200);
    const [lat, lng, radius] = supabaseService.findResourcesWithinDistance.mock.calls[0];
    expect(lat).toBeCloseTo(25.76);
    expect(lng).toBeCloseTo(-80.19);
    expect(radius).toBe(5000);
  });

  it('only admins can delete resources', async () => {
    expect((await request(app).delete(`/api/resources/${ID}`).set(auth)).status).toBe(403);
  });

  it('validates resource coordinates', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set(auth)
      .send({ name: 'Shelter', type: 'shelter', location_name: 'School', latitude: 200, longitude: 0 });
    expect(res.status).toBe(400);
  });
});

describe('AUTH_DISABLED for local development', () => {
  it('allows writes without a token only when explicitly enabled', async () => {
    supabaseService.createDisaster.mockImplementation(async (d) => ({ id: ID, ...d }));
    process.env.AUTH_DISABLED = 'true';
    const res = await request(app).post('/api/disasters').send({ title: 't', description: 'd' });
    expect(res.status).toBe(201);
    expect(res.body.owner_id).toBe('local-dev');
  });
});
