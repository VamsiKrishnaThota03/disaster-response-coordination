const opencage = require('opencage-api-client');
const { logger } = require('../server');
require('dotenv').config();

class OpenCageService {
  constructor() {
    if (!process.env.OPENCAGE_API_KEY) {
      logger.warn('OPENCAGE_API_KEY is not set in environment variables');
    }

    // Known region names and landmarks that should be preserved
    this.knownRegions = [
      'Silicon Valley',
      'Greater London',
      'New York City',
      'San Francisco Bay Area',
      'Downtown',
      'Central Business District',
      'Old Town',
      'Financial District',
      'Northern California',
      'Southern California',
      'Central California',
      'Eastern California',
      'Western California'
    ];

    // Famous landmarks
    this.landmarks = {
      'Eiffel Tower': 'Paris, France',
      'Big Ben': 'London, UK',
      'Statue of Liberty': 'New York City, USA',
      'Tower Bridge': 'London, UK',
      'Empire State Building': 'New York City, USA',
      'Golden Gate Bridge': 'San Francisco, USA',
      'Sydney Opera House': 'Sydney, Australia',
      'Taj Mahal': 'Agra, India',
      'Colosseum': 'Rome, Italy'
    };

    // Natural landmarks and protected areas
    this.naturalLandmarks = [
      'National Forest',
      'National Park',
      'State Park',
      'State Forest',
      'Wildlife Refuge',
      'Nature Reserve',
      'Mountain',
      'Lake',
      'River',
      'Bay',
      'Beach'
    ];
  }

  findMostSpecificLocation(text) {
    // Try to find a famous landmark first
    for (const [landmark, location] of Object.entries(this.landmarks)) {
      if (text.toLowerCase().includes(landmark.toLowerCase())) {
        return location;
      }
    }

    // Try to find a natural landmark
    for (const landmark of this.naturalLandmarks) {
      const match = text.match(new RegExp(`([A-Z][a-zA-Z\\s]+)\\s+${landmark}`, 'i'));
      if (match) {
        return `${match[1]} ${landmark}`;
      }
    }

    // Try to find a known region
    for (const region of this.knownRegions) {
      if (text.toLowerCase().includes(region.toLowerCase())) {
        return region;
      }
    }

    return null;
  }

  cleanText(text) {
    // Remove disaster-related terms and other noise
    const noiseTerms = [
      'warning', 'alert', 'emergency', 'evacuation', 'ordered',
      'issued', 'reported', 'following', 'due to', 'because of',
      'offshore', 'coastal', 'areas', 'region', 'area',
      'earthquake', 'tsunami', 'flood', 'fire', 'chemical', 'spill',
      'disaster', 'incident', 'accident'
    ];

    let cleaned = text;
    noiseTerms.forEach(term => {
      cleaned = cleaned.replace(new RegExp('\\b' + term + '\\b', 'gi'), '');
    });

    return cleaned
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .trim();
  }

  extractLocationFromText(text) {
    // First clean the text
    const cleanedText = this.cleanText(text);
    
    // Common patterns for location extraction
    const patterns = [
      // City, Country format
      /([A-Z][a-zA-Z\s-]+),\s*([A-Z][a-zA-Z\s-]+)/,
      
      // Multiple locations with "and"
      /([A-Z][a-zA-Z\s-]+)\s+and\s+([A-Z][a-zA-Z\s-]+)/,
      
      // Location after prepositions
      /(?:in|at|near|around|of)\s+([A-Z][a-zA-Z\s-]+(?:,\s*[A-Z][a-zA-Z\s-]+)*)/,
      
      // Simple capitalized location
      /([A-Z][a-zA-Z\s-]+(?:,\s*[A-Z][a-zA-Z\s-]+)*)/
    ];

    // Try each pattern
    for (const pattern of patterns) {
      const match = cleanedText.match(pattern);
      if (match) {
        const locationParts = match.slice(1).filter(Boolean);
        if (locationParts.length > 0) {
          return locationParts
            .map(part => part.trim())
            .filter(part => part.length > 1)
            .join(', ')
            .trim();
        }
      }
    }

    // If no pattern matches, try to find any capitalized words that might be locations
    const capitalizedWords = cleanedText.match(/[A-Z][a-zA-Z\s-]+/g);
    if (capitalizedWords) {
      return capitalizedWords
        .filter(word => word.length > 1)
        .join(', ')
        .trim();
    }

    return null;
  }

  async geocode(locationName) {
    try {
      if (!locationName || typeof locationName !== 'string') {
        throw new Error('Invalid location name provided');
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

      const result = response.results[0];
      const coordinates = {
        lat: result.geometry.lat,
        lng: result.geometry.lng,
        displayName: result.formatted
      };

      logger.info(`Geocoded ${locationName} to coordinates: ${coordinates.lat}, ${coordinates.lng}`);
      return coordinates;
    } catch (error) {
      logger.error('Error geocoding location:', error);
      return null;
    }
  }

  async extractAndGeocodeLocation(locationText) {
    try {
      if (!locationText) {
        return {
          location_name: 'Location unknown',
          coordinates: null
        };
      }

      // Clean up the location text
      const cleanLocation = locationText.trim()
        .replace(/^in\s+/i, '')  // Remove leading "in"
        .replace(/\s+/g, ' ');   // Normalize whitespace

      const coordinates = await this.geocode(cleanLocation);

      return {
        location_name: coordinates?.displayName || cleanLocation,
        coordinates: coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null
      };
    } catch (error) {
      logger.error('Error in location extraction and geocoding:', error);
      return {
        location_name: locationText || 'Location unknown',
        coordinates: null
      };
    }
  }

  // Helper method to create PostGIS geography point
  formatPostGISPoint(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return null;
    }
    return `POINT(${lng} ${lat})`;
  }

  parsePostGISPoint(point) {
    if (!point) return null;
    // Extract coordinates from POINT(lng lat) format
    const matches = point.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (!matches) return null;
    return {
      lng: parseFloat(matches[1]),
      lat: parseFloat(matches[2])
    };
  }
}

module.exports = new OpenCageService(); 