import logger from '../utils/logger.js';

class OfficialUpdatesService {
  constructor() {
    this.sources = [
      {
        name: 'FEMA',
        url: 'https://www.fema.gov/disasters',
        selector: '.disaster-list .disaster-item',
        parseFunction: this.parseFEMAUpdate
      },
      {
        name: 'Red Cross',
        url: 'https://www.redcross.org/about-us/news-and-events/news.html',
        selector: '.news-list .news-item',
        parseFunction: this.parseRedCrossUpdate
      }
    ];
  }

  async fetchUpdates(disasterId, location) {
    try {
      // For demo purposes, return mock updates directly
      return this.generateMockUpdates(location);
    } catch (error) {
      logger.error('Error fetching official updates:', error);
      throw error;
    }
  }

  generateMockUpdates(location) {
    const updates = [];
    const currentDate = new Date();

    // FEMA mock updates
    updates.push({
      id: 'fema-1',
      source: 'FEMA',
      title: 'Emergency Declaration Approved',
      content: `Emergency Declaration Approved for ${location}. Federal aid has been made available to supplement state and local recovery efforts.`,
      url: 'https://www.fema.gov/disaster/mock-id',
      organization: 'Federal Emergency Management Agency',
      timestamp: new Date(currentDate - 1000 * 60 * 60).toISOString() // 1 hour ago
    });

    updates.push({
      id: 'fema-2',
      source: 'FEMA',
      title: 'Response Teams Deployed',
      content: `FEMA Response Teams Deployed to ${location}. Urban Search and Rescue teams are conducting operations.`,
      url: 'https://www.fema.gov/disaster/mock-id/update1',
      organization: 'Federal Emergency Management Agency',
      timestamp: new Date(currentDate - 1000 * 60 * 30).toISOString() // 30 mins ago
    });

    // Red Cross mock updates
    updates.push({
      id: 'rc-1',
      source: 'Red Cross',
      title: 'Emergency Shelters Opened',
      content: `Red Cross Opens Emergency Shelters in ${location}. Multiple locations available for affected residents.`,
      url: 'https://www.redcross.org/local/news/mock-id',
      organization: 'American Red Cross',
      timestamp: new Date(currentDate - 1000 * 60 * 45).toISOString() // 45 mins ago
    });

    updates.push({
      id: 'rc-2',
      source: 'Red Cross',
      title: 'Relief Supplies Distribution',
      content: `Distribution of emergency supplies underway in ${location}. Red Cross volunteers are providing food, water, and basic necessities.`,
      url: 'https://www.redcross.org/local/news/mock-id/supplies',
      organization: 'American Red Cross',
      timestamp: new Date(currentDate - 1000 * 60 * 15).toISOString() // 15 mins ago
    });

    return updates;
  }
}

export const officialUpdatesService = new OfficialUpdatesService(); 