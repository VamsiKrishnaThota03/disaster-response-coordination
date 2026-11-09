import express from 'express';
import logger from '../utils/logger.js';
import supabaseService from '../services/supabaseService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toWktPoint } from '../utils/geo.js';
import { cleanString, emit, isUuid, serverError } from '../utils/http.js';

const router = express.Router();

const parseCoords = (latitude, longitude) => {
  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

router.get('/nearby', async (req, res) => {
  const coords = parseCoords(req.query.latitude, req.query.longitude);
  if (!coords) return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  const radius = Math.min(Math.max(Number(req.query.radius) || 10000, 1), 200000);
  try {
    const resources = await supabaseService.findResourcesWithinDistance(coords.lat, coords.lng, radius);
    logger.info(`Found ${resources.length} resources within ${radius}m`);
    return res.json(resources);
  } catch (error) {
    return serverError(res, 'Failed to find nearby resources', error);
  }
});

router.post('/', requireAuth, async (req, res) => {
  const body = req.body || {};
  const name = cleanString(body.name, 200);
  const type = cleanString(body.type, 50);
  const locationName = cleanString(body.location_name, 200);
  const coords = parseCoords(body.latitude, body.longitude);

  if (!name || !type || !locationName) {
    return res.status(400).json({ error: 'Name, type and location_name are required' });
  }
  if (!coords) return res.status(400).json({ error: 'Invalid latitude or longitude values' });
  if (body.disaster_id && !isUuid(body.disaster_id)) {
    return res.status(400).json({ error: 'Invalid disaster_id' });
  }

  try {
    const resource = await supabaseService.createResource({
      name,
      type,
      location_name: locationName,
      location: toWktPoint(coords.lat, coords.lng),
      status: body.status === 'inactive' ? 'inactive' : 'active',
      disaster_id: body.disaster_id || null,
    });
    emit(req, 'resource_created', { disaster_id: resource.disaster_id, resource });
    return res.status(201).json(resource);
  } catch (error) {
    return serverError(res, 'Failed to create resource', error);
  }
});

async function loadResource(req, res, next) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Resource not found' });
  try {
    const resource = await supabaseService.getResourceById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    req.resource = resource;
    return next();
  } catch (error) {
    return serverError(res, 'Failed to fetch resource', error);
  }
}

router.put('/:id', requireAuth, requireAdmin, loadResource, async (req, res) => {
  const body = req.body || {};
  const changes = {};
  if (body.name !== undefined) changes.name = cleanString(body.name, 200);
  if (body.type !== undefined) changes.type = cleanString(body.type, 50);
  if (body.location_name !== undefined) changes.location_name = cleanString(body.location_name, 200);
  if (body.status !== undefined) changes.status = body.status === 'inactive' ? 'inactive' : 'active';
  if (body.latitude !== undefined || body.longitude !== undefined) {
    const coords = parseCoords(body.latitude, body.longitude);
    if (!coords) return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    changes.location = toWktPoint(coords.lat, coords.lng);
  }
  try {
    return res.json(await supabaseService.updateResource(req.resource.id, changes));
  } catch (error) {
    return serverError(res, 'Failed to update resource', error);
  }
});

router.delete('/:id', requireAuth, requireAdmin, loadResource, async (req, res) => {
  try {
    await supabaseService.deleteResource(req.resource.id);
    return res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    return serverError(res, 'Failed to delete resource', error);
  }
});

export default router;
