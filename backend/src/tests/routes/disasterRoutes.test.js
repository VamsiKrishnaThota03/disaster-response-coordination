import request from 'supertest';
import { app } from '../../server.js';
import supabaseService from '../../services/supabaseService.js';
import geminiService from '../../services/geminiService.js';

jest.mock('../../services/supabaseService.js');
jest.mock('../../services/geminiService.js');

describe('Disaster Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/disasters', () => {
    it('should return all disasters', async () => {
      const mockDisasters = [
        { id: 1, title: 'Test Disaster 1' },
        { id: 2, title: 'Test Disaster 2' }
      ];
      supabaseService.getAllDisasters.mockResolvedValue(mockDisasters);

      const response = await request(app).get('/api/disasters');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDisasters);
    });

    it('should handle errors', async () => {
      supabaseService.getAllDisasters.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/disasters');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/disasters', () => {
    const mockDisaster = {
      title: 'Test Disaster',
      description: 'A test disaster in Miami, FL',
      type: 'flood',
      severity: 'high',
      tags: ['flood', 'emergency']
    };

    it('should create a new disaster', async () => {
      geminiService.extractLocation.mockResolvedValue('Miami, FL');
      geminiService.analyzePriority.mockResolvedValue('high');
      supabaseService.createDisaster.mockResolvedValue({ ...mockDisaster, id: 1 });

      const response = await request(app)
        .post('/api/disasters')
        .send(mockDisaster);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(mockDisaster.title);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/disasters')
        .send({ description: 'Missing title' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle service errors', async () => {
      geminiService.extractLocation.mockRejectedValue(new Error('API error'));
      supabaseService.createDisaster.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/disasters')
        .send(mockDisaster);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/disasters/:id', () => {
    it('should return a specific disaster', async () => {
      const mockDisaster = { id: 1, title: 'Test Disaster' };
      supabaseService.getDisasterById.mockResolvedValue(mockDisaster);

      const response = await request(app).get('/api/disasters/1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDisaster);
    });

    it('should handle non-existent disaster', async () => {
      supabaseService.getDisasterById.mockResolvedValue(null);

      const response = await request(app).get('/api/disasters/999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/disasters/:id', () => {
    const updateData = {
      title: 'Updated Disaster',
      description: 'Updated description'
    };

    it('should update an existing disaster', async () => {
      const mockDisaster = { id: 1, ...updateData };
      supabaseService.getDisasterById.mockResolvedValue({ id: 1, title: 'Old Title' });
      supabaseService.updateDisaster.mockResolvedValue(mockDisaster);

      const response = await request(app)
        .put('/api/disasters/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDisaster);
    });

    it('should handle non-existent disaster', async () => {
      supabaseService.getDisasterById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/disasters/999')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/disasters/:id', () => {
    it('should delete an existing disaster', async () => {
      supabaseService.getDisasterById.mockResolvedValue({ id: 1 });
      supabaseService.deleteDisaster.mockResolvedValue(true);

      const response = await request(app).delete('/api/disasters/1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle non-existent disaster', async () => {
      supabaseService.getDisasterById.mockResolvedValue(null);

      const response = await request(app).delete('/api/disasters/999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/disasters/:id/resources', () => {
    it('should return nearby resources', async () => {
      const mockDisaster = {
        id: 1,
        location: { coordinates: [80, 25] }
      };
      const mockResources = [
        { id: 1, name: 'Resource 1', distance_meters: 1000 },
        { id: 2, name: 'Resource 2', distance_meters: 2000 }
      ];

      supabaseService.getDisasterById.mockResolvedValue(mockDisaster);
      supabaseService.findResourcesWithinDistance.mockResolvedValue(mockResources);

      const response = await request(app)
        .get('/api/disasters/1/resources')
        .query({ radius: 5000 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResources);
    });

    it('should handle missing location', async () => {
      supabaseService.getDisasterById.mockResolvedValue({ id: 1, location: null });

      const response = await request(app)
        .get('/api/disasters/1/resources')
        .query({ radius: 5000 });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 