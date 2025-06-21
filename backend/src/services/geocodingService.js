import opencage from 'opencage-api-client';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class GeocodingService {
  constructor() {
    if (!process.env.OPENCAGE_API_KEY) {
      logger.warn('OPENCAGE_API_KEY is not set in environment variables');
    }
  }

  async getCoordinates(locationName) {
    try {
      if (!locationName || typeof locationName !== 'string') {
        logger.warn('Invalid location name provided to geocoding service');
        return null;
      }

      const response = await opencage.geocode({
        q: locationName,
        key: process.env.OPENCAGE_API_KEY,
        limit: 1,
        no_annotations: 1
      });

      if (!response || !response.results || response.results.length === 0) {
        logger.warn(`No coordinates found for location: ${locationName}`);
        return null;
      }

      const { lat, lng } = response.results[0].geometry;
      logger.info(`Coordinates found for ${locationName}: ${lat}, ${lng}`);
      
      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: response.results[0].formatted
      };
    } catch (error) {
      logger.error('Error in geocoding service:', error);
      return null;
    }
  }

  async reverseGeocode(latitude, longitude) {
    try {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        logger.warn('Invalid coordinates provided to reverse geocoding service');
        return null;
      }

      const response = await opencage.geocode({
        q: `${latitude},${longitude}`,
        key: process.env.OPENCAGE_API_KEY,
        limit: 1,
        no_annotations: 1
      });

      if (!response || !response.results || response.results.length === 0) {
        logger.warn(`No location found for coordinates: ${latitude}, ${longitude}`);
        return null;
      }

      const result = response.results[0];
      logger.info(`Location found for coordinates ${latitude}, ${longitude}: ${result.formatted}`);
      
      return {
        formattedAddress: result.formatted,
        components: result.components
      };
    } catch (error) {
      logger.error('Error in reverse geocoding service:', error);
      return null;
    }
  }

  formatPostGISPoint(latitude, longitude) {
    return `POINT(${longitude} ${latitude})`;
  }
}

export default new GeocodingService(); 