import express from 'express';
import logger from '../utils/logger.js';
import geminiService from '../services/geminiService.js';
import supabaseService from '../services/supabaseService.js';
import geocodingService from '../services/geocodingService.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { officialUpdatesService } from '../services/officialUpdatesService.js';

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

// Get all disasters
router.get('/', rateLimitMiddleware, async (req, res) => {
  try {
    const disasters = await supabaseService.getAllDisasters();
    res.json(disasters);
  } catch (error) {
    logger.error('Error fetching disasters:', error);
    res.status(500).json({ error: 'Failed to fetch disasters' });
  }
});

// Get a specific disaster
router.get('/:id', rateLimitMiddleware, async (req, res) => {
  try {
    const disaster = await supabaseService.getDisasterById(req.params.id);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    res.json(disaster);
  } catch (error) {
    logger.error('Error fetching disaster:', error);
    res.status(500).json({ error: 'Failed to fetch disaster' });
  }
});

// Create a new disaster
router.post('/', rateLimitMiddleware, async (req, res) => {
  try {
    const { title, description, type, severity, owner_id = 'system', tags = [] } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Extract location using Gemini with fallback
    let locationText;
    try {
      locationText = await geminiService.extractLocation(description);
    } catch (error) {
      logger.warn('Gemini location extraction failed, using fallback:', error);
      locationText = geminiService.fallbackLocationExtraction(description);
    }
    
    // Get coordinates using geocoding service
    let coordinates;
    try {
      coordinates = await geocodingService.getCoordinates(locationText);
    } catch (error) {
      logger.error('Error getting coordinates:', error);
      coordinates = null;
    }

    // Analyze priority with fallback
    let priority;
    try {
      priority = await geminiService.analyzePriority(description);
    } catch (error) {
      logger.warn('Gemini priority analysis failed, using fallback:', error);
      priority = geminiService.fallbackPriorityAnalysis(description);
    }

    // Prepare disaster data
    const disasterData = {
      title: title.trim(),
      description: description.trim(),
      type: type || 'unknown',
      severity: severity || 'medium',
      location_name: locationText || 'Location unknown',
      location: coordinates ? `POINT(${coordinates.longitude} ${coordinates.latitude})` : null,
      tags: Array.isArray(tags) ? tags : [],
      owner_id,
      status: 'active',
      priority: priority || 'medium'
    };

    logger.info('Attempting to create disaster:', disasterData);

    const newDisaster = await supabaseService.createDisaster(disasterData);
    
    logger.info('Disaster created successfully:', newDisaster);
    res.status(201).json(newDisaster);
  } catch (error) {
    logger.error('Error in disaster creation route:', error);
    res.status(500).json({ 
      error: 'Failed to create disaster', 
      details: error.message,
      code: error.code 
    });
  }
});

// Update a disaster
router.put('/:id', rateLimitMiddleware, async (req, res) => {
  try {
    const { title, description, type, severity, status, location } = req.body;
    const disasterId = req.params.id;

    const existingDisaster = await supabaseService.getDisasterById(disasterId);
    if (!existingDisaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    const updatedDisaster = {
      ...existingDisaster,
      title: title || existingDisaster.title,
      description: description || existingDisaster.description,
      type: type || existingDisaster.type,
      severity: severity || existingDisaster.severity,
      status: status || existingDisaster.status,
      location: location || existingDisaster.location,
      updated_at: new Date().toISOString()
    };

    // If description changed, update location and priority
    if (description && description !== existingDisaster.description) {
      const locationText = await geminiService.extractLocation(description);
      const coordinates = await geocodingService.getCoordinates(locationText);
      const priority = await geminiService.analyzePriority(description);

      if (coordinates) {
        updatedDisaster.location = {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        };
      }

      updatedDisaster.priority = priority;
    }

    const result = await supabaseService.updateDisaster(disasterId, updatedDisaster);
    res.json(result);
  } catch (error) {
    logger.error('Error updating disaster:', error);
    res.status(500).json({ error: 'Failed to update disaster' });
  }
});

// Delete a disaster
router.delete('/:id', rateLimitMiddleware, async (req, res) => {
  try {
    const disasterId = req.params.id;
    
    const existingDisaster = await supabaseService.getDisasterById(disasterId);
    if (!existingDisaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    await supabaseService.deleteDisaster(disasterId);
    res.json({ message: 'Disaster deleted successfully' });
  } catch (error) {
    logger.error('Error deleting disaster:', error);
    res.status(500).json({ error: 'Failed to delete disaster' });
  }
});

// Get nearby resources
router.get('/:id/resources', async (req, res) => {
  try {
    const { radius = 10000 } = req.query;
    const disaster = await supabaseService.getDisasterById(req.params.id);

    if (!disaster || !disaster.location) {
      return res.status(404).json({ error: 'Disaster or location not found' });
    }

    // Extract coordinates from GeoJSON format
    const coordinates = disaster.location.coordinates;
    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid location format' });
    }

    const [longitude, latitude] = coordinates;

    const resources = await supabaseService.findResourcesWithinDistance(
      latitude,
      longitude,
      parseFloat(radius),
      disaster.id
    );

    res.json(resources || []);
  } catch (error) {
    logger.error('Error fetching nearby resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify an image
router.post('/:id/verify-image', rateLimitMiddleware, async (req, res) => {
  try {
    const { image_url } = req.body;
    if (!image_url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const verification = await geminiService.verifyImage(image_url);
    res.json(verification);
  } catch (error) {
    logger.error('Error verifying image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reports for a disaster
router.get('/:id/reports', rateLimitMiddleware, async (req, res) => {
  try {
    const disasterId = req.params.id;

    // Verify disaster exists
    const disaster = await supabaseService.getDisasterById(disasterId);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    const reports = await supabaseService.getReportsByDisasterId(disasterId);
    res.json(reports);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reports',
      details: error.message,
      code: error.code
    });
  }
});

// Create a report
router.post('/:id/reports', rateLimitMiddleware, async (req, res) => {
  try {
    const { content, image_url, user_id = 'system' } = req.body;
    const disaster_id = req.params.id;

    // Validate required fields
    if (!content) {
      return res.status(400).json({ error: 'Report content is required' });
    }

    // Verify disaster exists
    const disaster = await supabaseService.getDisasterById(disaster_id);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Analyze priority based on content
    const priority = content.toLowerCase().includes('urgent') || 
                    content.toLowerCase().includes('emergency') ||
                    content.toLowerCase().includes('immediate') ||
                    content.toLowerCase().includes('critical')
      ? 'high'
      : 'normal';

    // Prepare report data
    const reportData = {
      disaster_id,
      user_id,
      content: content.trim(),
      image_url: image_url || null,
      verification_status: 'pending',
      priority
    };

    logger.info('Attempting to create report:', reportData);
    const newReport = await supabaseService.createReport(reportData);
    
    // Emit update event if socket.io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('report_created', { disaster_id, report: newReport });
    }

    res.status(201).json(newReport);
  } catch (error) {
    logger.error('Error in report creation route:', error);
    res.status(500).json({ 
      error: 'Failed to create report',
      details: error.message,
      code: error.code
    });
  }
});

// Get official updates for a disaster
router.get('/:id/official-updates', rateLimitMiddleware, async (req, res) => {
  try {
    const disasterId = req.params.id;

    // Verify disaster exists
    const disaster = await supabaseService.getDisasterById(disasterId);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Get official updates from service
    const updates = await officialUpdatesService.fetchUpdates(disasterId, disaster.location_name);
    res.json(updates);
  } catch (error) {
    logger.error('Error fetching official updates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch official updates',
      details: error.message
    });
  }
});

export default router; 