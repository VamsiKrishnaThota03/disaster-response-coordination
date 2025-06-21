import express from 'express';
import logger from '../utils/logger.js';
import supabaseService from '../services/supabaseService.js';
import geminiService from '../services/geminiService.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

// Rate limiter setup
const rateLimiter = new RateLimiterMemory({
  points: 10, // Number of points
  duration: 1, // Per second
});

// Middleware for rate limiting
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too many requests' });
  }
};

// Get all reports for a disaster
router.get('/disaster/:disasterId', rateLimitMiddleware, async (req, res) => {
  try {
    const reports = await supabaseService.getReportsByDisasterId(req.params.disasterId);
    res.json(reports);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create a new report
router.post('/', rateLimitMiddleware, async (req, res) => {
  try {
    const {
      disasterId,
      userId,
      content,
      type,
      imageUrl,
      resourceStatus
    } = req.body;

    // Verify image if provided
    let imageVerification = null;
    if (imageUrl) {
      imageVerification = await geminiService.verifyImage(imageUrl);
    }

    // Analyze priority
    const priority = await geminiService.analyzePriority(content);

    const report = {
      disaster_id: disasterId,
      user_id: userId,
      content,
      type,
      image_url: imageUrl,
      image_verification: imageVerification,
      resource_status: resourceStatus,
      priority,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newReport = await supabaseService.createReport(report);
    res.status(201).json(newReport);
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

export default router; 