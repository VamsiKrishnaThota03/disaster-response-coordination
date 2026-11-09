import express from 'express';
import supabaseService from '../services/supabaseService.js';
import { requireAuth } from '../middleware/auth.js';
import { cleanString, emit, isUuid, reportPriority, serverError } from '../utils/http.js';

const router = express.Router();

router.get('/disaster/:disasterId', async (req, res) => {
  if (!isUuid(req.params.disasterId)) return res.json([]);
  try {
    return res.json(await supabaseService.getReportsByDisasterId(req.params.disasterId));
  } catch (error) {
    return serverError(res, 'Failed to fetch reports', error);
  }
});

// Alternative to POST /api/disasters/:id/reports with { disasterId, content, imageUrl }.
router.post('/', requireAuth, async (req, res) => {
  const disasterId = req.body?.disasterId || req.body?.disaster_id;
  const content = cleanString(req.body?.content, 5000);
  const imageUrl = cleanString(req.body?.imageUrl || req.body?.image_url, 2000) || null;
  if (!isUuid(disasterId) || !content) {
    return res.status(400).json({ error: 'disasterId and content are required' });
  }
  try {
    const disaster = await supabaseService.getDisasterById(disasterId);
    if (!disaster) return res.status(404).json({ error: 'Disaster not found' });
    const report = await supabaseService.createReport({
      disaster_id: disasterId,
      user_id: req.user.id,
      content,
      image_url: imageUrl,
      priority: reportPriority(content),
    });
    emit(req, 'report_created', { disaster_id: disasterId, report });
    return res.status(201).json(report);
  } catch (error) {
    return serverError(res, 'Failed to create report', error);
  }
});

export default router;
