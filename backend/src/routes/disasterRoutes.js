import express from 'express';
import logger from '../utils/logger.js';
import geminiService from '../services/geminiService.js';
import supabaseService from '../services/supabaseService.js';
import geocodingService from '../services/geocodingService.js';
import { officialUpdatesService } from '../services/officialUpdatesService.js';
import { requireAuth, canModify } from '../middleware/auth.js';
import { parsePoint, toWktPoint } from '../utils/geo.js';
import { cleanString, cleanTags, emit, isUuid, reportPriority, serverError } from '../utils/http.js';

const router = express.Router();

const STATUSES = ['active', 'monitoring', 'resolved'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

/** Load :id into req.disaster or answer 404. */
async function loadDisaster(req, res, next) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Disaster not found' });
  try {
    const disaster = await supabaseService.getDisasterById(req.params.id);
    if (!disaster) return res.status(404).json({ error: 'Disaster not found' });
    req.disaster = disaster;
    return next();
  } catch (error) {
    return serverError(res, 'Failed to fetch disaster', error);
  }
}

/** Gemini location + geocoding + priority, each with a fallback. */
async function analyseDescription(description) {
  const locationText = await geminiService.extractLocation(description);
  const coordinates = locationText ? await geocodingService.getCoordinates(locationText) : null;
  const priority = await geminiService.analyzePriority(description);
  return {
    location_name: locationText || 'Location unknown',
    location: coordinates ? toWktPoint(coordinates.latitude, coordinates.longitude) : null,
    priority: priority || 'medium',
  };
}

router.get('/', async (req, res) => {
  try {
    res.json(await supabaseService.getAllDisasters());
  } catch (error) {
    serverError(res, 'Failed to fetch disasters', error);
  }
});

router.get('/:id', loadDisaster, (req, res) => res.json(req.disaster));

router.post('/', requireAuth, async (req, res) => {
  const title = cleanString(req.body?.title, 200);
  const description = cleanString(req.body?.description, 5000);
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
  const type = cleanString(req.body?.type, 50) || 'unknown';
  const severity = SEVERITIES.includes(req.body?.severity) ? req.body.severity : 'medium';

  try {
    const analysis = await analyseDescription(description);
    const disaster = await supabaseService.createDisaster({
      title,
      description,
      type,
      severity,
      tags: cleanTags(req.body?.tags),
      owner_id: req.user.id,
      status: 'active',
      ...analysis,
    });
    logger.info(`Disaster created: ${disaster.id}`);
    emit(req, 'disaster_updated', { action: 'create', id: disaster.id });
    return res.status(201).json(disaster);
  } catch (error) {
    return serverError(res, 'Failed to create disaster', error);
  }
});

router.put('/:id', requireAuth, loadDisaster, async (req, res) => {
  if (!canModify(req.user, req.disaster.owner_id)) {
    return res.status(403).json({ error: 'Only the reporter or an admin can edit this disaster' });
  }
  const body = req.body || {};
  const changes = {};
  if (body.title !== undefined) changes.title = cleanString(body.title, 200);
  if (body.description !== undefined) changes.description = cleanString(body.description, 5000);
  if (body.type !== undefined) changes.type = cleanString(body.type, 50);
  if (body.tags !== undefined) changes.tags = cleanTags(body.tags);
  if (body.severity !== undefined) {
    if (!SEVERITIES.includes(body.severity)) return res.status(400).json({ error: `severity must be one of ${SEVERITIES.join(', ')}` });
    changes.severity = body.severity;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
    changes.status = body.status;
  }
  if (changes.title === '' || changes.description === '') {
    return res.status(400).json({ error: 'Title and description cannot be empty' });
  }

  try {
    if (changes.description && changes.description !== req.disaster.description) {
      Object.assign(changes, await analyseDescription(changes.description));
    }
    const updated = await supabaseService.updateDisaster(req.disaster.id, changes);
    emit(req, 'disaster_updated', { action: 'update', id: updated.id });
    return res.json(updated);
  } catch (error) {
    return serverError(res, 'Failed to update disaster', error);
  }
});

router.delete('/:id', requireAuth, loadDisaster, async (req, res) => {
  if (!canModify(req.user, req.disaster.owner_id)) {
    return res.status(403).json({ error: 'Only the reporter or an admin can delete this disaster' });
  }
  try {
    await supabaseService.deleteDisaster(req.disaster.id);
    emit(req, 'disaster_updated', { action: 'delete', id: req.disaster.id });
    return res.json({ message: 'Disaster deleted successfully' });
  } catch (error) {
    return serverError(res, 'Failed to delete disaster', error);
  }
});

router.get('/:id/resources', loadDisaster, async (req, res) => {
  const point = parsePoint(req.disaster.location);
  if (!point) return res.json([]); // disaster has no coordinates yet
  const radius = Math.min(Math.max(Number(req.query.radius) || 10000, 1), 200000);
  try {
    const resources = await supabaseService.findResourcesWithinDistance(point.latitude, point.longitude, radius, req.disaster.id);
    return res.json(resources);
  } catch (error) {
    return serverError(res, 'Failed to fetch nearby resources', error);
  }
});

router.post('/:id/verify-image', requireAuth, loadDisaster, async (req, res) => {
  const imageUrl = cleanString(req.body?.image_url, 2000);
  if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });
  try {
    return res.json(await geminiService.verifyImage(imageUrl));
  } catch (error) {
    return serverError(res, 'Failed to verify image', error);
  }
});

router.get('/:id/reports', loadDisaster, async (req, res) => {
  try {
    return res.json(await supabaseService.getReportsByDisasterId(req.disaster.id));
  } catch (error) {
    return serverError(res, 'Failed to fetch reports', error);
  }
});

router.post('/:id/reports', requireAuth, loadDisaster, async (req, res) => {
  const content = cleanString(req.body?.content, 5000);
  if (!content) return res.status(400).json({ error: 'Report content is required' });
  const imageUrl = cleanString(req.body?.image_url, 2000) || null;
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    return res.status(400).json({ error: 'Image URL must start with http:// or https://' });
  }

  try {
    const report = await supabaseService.createReport({
      disaster_id: req.disaster.id,
      user_id: req.user.id,
      content,
      image_url: imageUrl,
      verification_status: 'pending',
      priority: reportPriority(content),
    });
    emit(req, 'report_created', { disaster_id: req.disaster.id, report });
    return res.status(201).json(report);
  } catch (error) {
    return serverError(res, 'Failed to create report', error);
  }
});

router.get('/:id/official-updates', loadDisaster, async (req, res) => {
  try {
    return res.json(await officialUpdatesService.fetchUpdates(req.disaster.id, req.disaster.location_name));
  } catch (error) {
    return serverError(res, 'Failed to fetch official updates', error);
  }
});

export default router;
