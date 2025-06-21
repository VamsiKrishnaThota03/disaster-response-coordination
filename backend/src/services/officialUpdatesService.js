const axios = require('axios');
const cheerio = require('cheerio');
const { supabase, logger } = require('../server');

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
      // Add more sources as needed
    ];
  }

  async fetchUpdates(disasterId, location) {
    try {
      // Check cache first
      const cacheKey = `official_updates_${disasterId}_${location}`;
      const cachedData = await this.checkCache(cacheKey);
      if (cachedData) return cachedData;

      const updates = [];
      
      // For demo purposes, generate mock updates if web scraping fails
      try {
        // Try web scraping first
        for (const source of this.sources) {
          const sourceUpdates = await this.fetchFromSource(source, location);
          updates.push(...sourceUpdates);
        }
      } catch (error) {
        logger.warn('Web scraping failed, using mock data:', error);
        updates.push(...this.generateMockUpdates(location));
      }

      // Store updates in database
      await this.storeUpdates(disasterId, updates);

      // Cache the results
      await this.cacheUpdates(cacheKey, updates);

      return updates;
    } catch (error) {
      logger.error('Error fetching official updates:', error);
      throw error;
    }
  }

  async checkCache(key) {
    try {
      const { data } = await supabase
        .from('cache')
        .select('value, expires_at')
        .eq('key', key)
        .single();

      if (data && new Date(data.expires_at) > new Date()) {
        return data.value;
      }

      return null;
    } catch (error) {
      logger.error('Cache check failed:', error);
      return null;
    }
  }

  async cacheUpdates(key, updates) {
    try {
      const expires_at = new Date(Date.now() + 3600000); // 1 hour cache
      await supabase
        .from('cache')
        .upsert({
          key,
          value: updates,
          expires_at: expires_at.toISOString()
        });
    } catch (error) {
      logger.error('Failed to cache updates:', error);
    }
  }

  async storeUpdates(disasterId, updates) {
    try {
      const formattedUpdates = updates.map(update => ({
        disaster_id: disasterId,
        source: update.source,
        content: update.content,
        url: update.url,
        published_at: update.published_at
      }));

      await supabase
        .from('official_updates')
        .insert(formattedUpdates);
    } catch (error) {
      logger.error('Failed to store updates:', error);
    }
  }

  async fetchFromSource(source, location) {
    try {
      const response = await axios.get(source.url);
      const $ = cheerio.load(response.data);
      const updates = [];

      $(source.selector).each((i, element) => {
        const update = source.parseFunction($, element, location);
        if (update) updates.push(update);
      });

      return updates;
    } catch (error) {
      logger.error(`Failed to fetch from ${source.name}:`, error);
      throw error;
    }
  }

  parseFEMAUpdate($, element, location) {
    try {
      const title = $(element).find('.title').text().trim();
      const content = $(element).find('.description').text().trim();
      const url = $(element).find('a').attr('href');
      const date = $(element).find('.date').text().trim();

      // Only return if relevant to the location
      if (title.toLowerCase().includes(location.toLowerCase()) ||
          content.toLowerCase().includes(location.toLowerCase())) {
        return {
          source: 'FEMA',
          content: `${title}\n${content}`,
          url: url ? `https://www.fema.gov${url}` : null,
          published_at: date ? new Date(date).toISOString() : new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      logger.error('Error parsing FEMA update:', error);
      return null;
    }
  }

  parseRedCrossUpdate($, element, location) {
    try {
      const title = $(element).find('.title').text().trim();
      const content = $(element).find('.summary').text().trim();
      const url = $(element).find('a').attr('href');
      const date = $(element).find('.date').text().trim();

      // Only return if relevant to the location
      if (title.toLowerCase().includes(location.toLowerCase()) ||
          content.toLowerCase().includes(location.toLowerCase())) {
        return {
          source: 'Red Cross',
          content: `${title}\n${content}`,
          url: url ? `https://www.redcross.org${url}` : null,
          published_at: date ? new Date(date).toISOString() : new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      logger.error('Error parsing Red Cross update:', error);
      return null;
    }
  }

  generateMockUpdates(location) {
    const updates = [];
    const currentDate = new Date();

    // FEMA mock updates
    updates.push({
      source: 'FEMA',
      content: `Emergency Declaration Approved for ${location}. Federal aid has been made available to supplement state and local recovery efforts.`,
      url: 'https://www.fema.gov/disaster/mock-id',
      published_at: new Date(currentDate - 1000 * 60 * 60).toISOString() // 1 hour ago
    });

    updates.push({
      source: 'FEMA',
      content: `FEMA Response Teams Deployed to ${location}. Urban Search and Rescue teams are conducting operations.`,
      url: 'https://www.fema.gov/disaster/mock-id/update1',
      published_at: new Date(currentDate - 1000 * 60 * 30).toISOString() // 30 mins ago
    });

    // Red Cross mock updates
    updates.push({
      source: 'Red Cross',
      content: `Red Cross Opens Emergency Shelters in ${location}. Multiple locations available for affected residents.`,
      url: 'https://www.redcross.org/local/news/mock-id',
      published_at: new Date(currentDate - 1000 * 60 * 45).toISOString() // 45 mins ago
    });

    updates.push({
      source: 'Red Cross',
      content: `Emergency Blood Drive Organized in Response to ${location} Crisis. Local residents encouraged to donate.`,
      url: 'https://www.redcross.org/local/news/mock-id2',
      published_at: currentDate.toISOString()
    });

    return updates;
  }
}

module.exports = new OfficialUpdatesService(); 