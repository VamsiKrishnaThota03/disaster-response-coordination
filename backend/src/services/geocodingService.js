import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const OPENCAGE_URL = 'https://api.opencagedata.com/geocode/v1/json';

class GeocodingService {
  constructor() {
    if (!process.env.OPENCAGE_API_KEY) {
      logger.warn('OPENCAGE_API_KEY is not set: disasters will be saved without coordinates');
    }
  }

  async query(q) {
    const key = process.env.OPENCAGE_API_KEY;
    if (!key) return null;
    const url = new URL(OPENCAGE_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('key', key);
    url.searchParams.set('limit', '1');
    url.searchParams.set('no_annotations', '1');

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OpenCage returned HTTP ${res.status}`);
    const body = await res.json();
    return body?.results?.[0] || null;
  }

  async getCoordinates(locationName) {
    if (!locationName || typeof locationName !== 'string') return null;
    try {
      const result = await this.query(locationName);
      if (!result) {
        logger.warn(`No coordinates found for location: ${locationName}`);
        return null;
      }
      const { lat, lng } = result.geometry;
      return { latitude: lat, longitude: lng, formattedAddress: result.formatted };
    } catch (error) {
      logger.error(`Geocoding failed: ${error.message}`);
      return null;
    }
  }
}

export default new GeocodingService();
