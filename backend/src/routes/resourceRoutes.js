import express from 'express';
import logger from '../utils/logger.js';
import supabaseService from '../services/supabaseService.js';
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

// Get resources within a radius of a location
router.get('/nearby', rateLimitMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10000 } = req.query;

    logger.info(`Searching for resources near lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);

    if (!latitude || !longitude) {
      logger.warn('Missing latitude or longitude in request');
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const resources = await supabaseService.findResourcesWithinDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );

    logger.info(`Found ${resources.length} resources within ${radius}m`);
    if (resources.length === 0) {
      logger.info('No resources found in the specified radius');
    } else {
      logger.info('Resources found:', resources);
    }

    res.json(resources);
  } catch (error) {
    logger.error('Error finding nearby resources:', error);
    res.status(500).json({ 
      error: 'Failed to find nearby resources',
      details: error.message
    });
  }
});

// Create a new resource
router.post('/', rateLimitMiddleware, async (req, res) => {
  try {
    const {
      name,
      type,
      location_name,
      latitude,
      longitude,
      status,
      disaster_id
    } = req.body;

    logger.info('Attempting to create resource:', {
      name,
      type,
      location_name,
      latitude,
      longitude,
      status,
      disaster_id
    });

    // Validate required fields
    if (!name || !type || !location_name || !latitude || !longitude) {
      logger.warn('Missing required fields:', {
        name: !!name,
        type: !!type,
        location_name: !!location_name,
        latitude: !!latitude,
        longitude: !!longitude
      });
      return res.status(400).json({ 
        error: 'Name, type, location_name, latitude, and longitude are required',
        received: { name, type, location_name, latitude, longitude }
      });
    }

    // Validate latitude and longitude
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      logger.warn('Invalid coordinates:', { latitude, longitude });
      return res.status(400).json({ 
        error: 'Invalid latitude or longitude values',
        received: { latitude, longitude }
      });
    }

    const resource = {
      name,
      type,
      location_name,
      location: `POINT(${lng} ${lat})`,
      status: status || 'active',
      disaster_id
    };

    const newResource = await supabaseService.createResource(resource);
    logger.info('Resource created successfully:', newResource);
    res.status(201).json(newResource);
  } catch (error) {
    logger.error('Error creating resource:', error);
    res.status(500).json({ 
      error: 'Failed to create resource',
      details: error.message
    });
  }
});

// Update a resource
router.put('/:id', rateLimitMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const {
      name,
      type,
      quantity,
      status,
      latitude,
      longitude,
      contact,
      notes
    } = req.body;

    const existingResource = await supabaseService.getResourceById(resourceId);
    if (!existingResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const updatedResource = {
      ...existingResource,
      name: name || existingResource.name,
      type: type || existingResource.type,
      quantity: quantity || existingResource.quantity,
      status: status || existingResource.status,
      latitude: latitude ? parseFloat(latitude) : existingResource.latitude,
      longitude: longitude ? parseFloat(longitude) : existingResource.longitude,
      contact: contact || existingResource.contact,
      notes: notes || existingResource.notes,
      updated_at: new Date().toISOString()
    };

    const result = await supabaseService.updateResource(resourceId, updatedResource);
    res.json(result);
  } catch (error) {
    logger.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Delete a resource
router.delete('/:id', rateLimitMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const existingResource = await supabaseService.getResourceById(resourceId);
    if (!existingResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    await supabaseService.deleteResource(resourceId);
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    logger.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router; 