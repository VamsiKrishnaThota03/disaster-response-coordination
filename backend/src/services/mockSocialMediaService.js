import logger from '../utils/logger.js';
import supabaseService from './supabaseService.js';

class MockSocialMediaService {
  constructor() {
    // Sample disaster-related hashtags
    this.hashtags = ['#disaster', '#emergency', '#flood', '#earthquake', '#hurricane', '#relief', '#rescue', '#SOS'];
    
    // Sample user types for more realistic data
    this.userTypes = [
      { id: 'citizen', prefix: 'citizen_' },
      { id: 'relief_worker', prefix: 'relief_' },
      { id: 'emergency_services', prefix: 'ems_' },
      { id: 'local_authority', prefix: 'auth_' },
      { id: 'volunteer', prefix: 'vol_' }
    ];

    // Priority keywords and their weights
    this.priorityKeywords = {
      high: ['urgent', 'emergency', 'immediate', 'sos', 'critical', 'life-threatening', 'trapped', 'dying', 'evacuate'],
      medium: ['need', 'help', 'assistance', 'required', 'warning', 'dangerous', 'injured'],
      low: ['update', 'status', 'information', 'advisory', 'monitoring']
    };

    this.mockPosts = new Map();
    this.mockTrends = new Map();

    this.templates = [
      { text: "Need {need} in {location} #disaster", type: "need" },
      { text: "Offering {resource} for those affected in {location} #relief", type: "offer" },
      { text: "URGENT: {urgent} required immediately in {location} area! #SOS", type: "urgent" },
      { text: "Update from {location}: {situation} #emergency", type: "update" },
      { text: "Volunteers needed for {task} in {location} #volunteer", type: "volunteer" },
      { text: "Warning: {hazard} reported in {location} area #warning", type: "warning" }
    ];

    this.needs = [
      "medical supplies", "water", "food", "shelter", "blankets", "first aid",
      "rescue teams", "emergency vehicles", "power generators", "evacuation assistance"
    ];

    this.resources = [
      "medical aid", "water supplies", "food packages", "temporary shelter",
      "emergency supplies", "transportation", "power backup", "communication equipment"
    ];

    this.urgentNeeds = [
      "immediate evacuation", "medical emergency response", "search and rescue",
      "critical supplies", "emergency shelter", "urgent medical care"
    ];

    this.situations = [
      "roads blocked", "power outages", "flooding worsening", "buildings damaged",
      "rescue operations ongoing", "emergency services responding"
    ];

    this.tasks = [
      "distributing supplies", "setting up shelters", "medical assistance",
      "evacuation support", "debris clearing", "rescue operations"
    ];

    this.hazards = [
      "flooding", "structural damage", "road closures", "power lines down",
      "gas leaks", "unsafe buildings", "landslide risk"
    ];
  }

  // Generate a realistic user ID and type
  #generateUser() {
    const userType = this.userTypes[Math.floor(Math.random() * this.userTypes.length)];
    const userId = `${userType.prefix}${Math.floor(Math.random() * 1000)}`;
    return { userId, type: userType.id };
  }

  // Analyze text for priority based on keywords
  #analyzePriority(text) {
    const lowercaseText = text.toLowerCase();
    
    // Check for high priority keywords first
    for (const keyword of this.priorityKeywords.high) {
      if (lowercaseText.includes(keyword)) return 'high';
    }
    
    // Then medium priority
    for (const keyword of this.priorityKeywords.medium) {
      if (lowercaseText.includes(keyword)) return 'medium';
    }
    
    // Default to low priority
    return 'low';
  }

  // Generate a mock post with location awareness
  async #generatePost(disasterLocation, coordinates, disasterId) {
    const template = this.templates[Math.floor(Math.random() * this.templates.length)];
    const user = this.#generateUser();
    const hashtag = this.hashtags[Math.floor(Math.random() * this.hashtags.length)];

    let text = template.text;
    
    // Replace placeholders based on template type
    switch (template.type) {
      case "need":
        text = text.replace("{need}", this.needs[Math.floor(Math.random() * this.needs.length)]);
        break;
      case "offer":
        text = text.replace("{resource}", this.resources[Math.floor(Math.random() * this.resources.length)]);
        break;
      case "urgent":
        text = text.replace("{urgent}", this.urgentNeeds[Math.floor(Math.random() * this.urgentNeeds.length)]);
        break;
      case "update":
        text = text.replace("{situation}", this.situations[Math.floor(Math.random() * this.situations.length)]);
        break;
      case "volunteer":
        text = text.replace("{task}", this.tasks[Math.floor(Math.random() * this.tasks.length)]);
        break;
      case "warning":
        text = text.replace("{hazard}", this.hazards[Math.floor(Math.random() * this.hazards.length)]);
        break;
    }

    // Replace location in all templates
    text = text.replace("{location}", disasterLocation);

    const priority = this.#analyzePriority(text);

    // Handle coordinates properly
    let coordinatesString = null;
    if (coordinates && typeof coordinates.lng === 'number' && typeof coordinates.lat === 'number') {
      coordinatesString = `POINT(${coordinates.lng} ${coordinates.lat})`;
    }

    const post = {
      id: Math.random().toString(36).substr(2, 9),
      platform: 'mock_twitter',
      author: user.userId,
      content: text,
      hashtag,
      priority,
      coordinates: coordinatesString,
      created_at: new Date().toISOString(),
      type: template.type,
      disaster_id: disasterId
    };

    // Store in database
    try {
      const savedPost = await supabaseService.createSocialMediaPost(post);
      logger.info('Successfully stored social media post:', savedPost);
      return savedPost;
    } catch (error) {
      logger.error('Error storing social media post:', error);
      return post; // Return the post even if storage fails
    }
  }

  async getRecentPosts(disasterId, locationName, coordinates, count = 5) {
    try {
      const posts = [];
      for (let i = 0; i < count; i++) {
        const post = await this.#generatePost(locationName, coordinates, disasterId);
        posts.push(post);
      }

      return posts;
    } catch (error) {
      logger.error('Error generating mock social media posts:', error);
      return [];
    }
  }

  // Get high priority posts for a location
  async getHighPriorityPosts(disasterId, location, coordinates = null) {
    try {
      const allPosts = await this.getRecentPosts(disasterId, location, coordinates, 20);
      return allPosts.filter(post => post.priority === 'high');
    } catch (error) {
      logger.error('Error fetching high priority posts:', error);
      return [];
    }
  }

  // Get posts by type (needs, offers, updates, etc.)
  async getPostsByType(disasterId, location, type, coordinates = null) {
    try {
      const allPosts = await this.getRecentPosts(disasterId, location, coordinates, 20);
      return allPosts.filter(post => post.type === type);
    } catch (error) {
      logger.error('Error fetching posts by type:', error);
      return [];
    }
  }

  async getPostsForDisaster(disasterId, keywords = [], timeframe = '24h') {
    try {
      // Get posts from the database
      let posts = await supabaseService.getSocialMediaPostsByDisaster(disasterId);

      // If no posts exist, generate some
      if (!posts || posts.length === 0) {
        // Get disaster details to use location
        const disaster = await supabaseService.getDisasterById(disasterId);
        if (disaster) {
          // Generate 5 initial posts
          posts = await this.getRecentPosts(
            disasterId,
            disaster.location_name,
            disaster.location,
            5
          );
        }
      }

      // Filter by keywords if provided
      let filteredPosts = posts;
      if (keywords && keywords.length > 0) {
        const keywordList = Array.isArray(keywords) ? keywords : [keywords];
        filteredPosts = posts.filter(post => 
          keywordList.some(keyword => 
            post.content.toLowerCase().includes(keyword.toLowerCase())
          )
        );
      }

      // Filter by timeframe
      const timeframeHours = parseInt(timeframe) || 24;
      const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
      filteredPosts = filteredPosts.filter(post => new Date(post.created_at) > cutoffTime);

      logger.info(`Retrieved ${filteredPosts.length} social media posts for disaster ${disasterId}`);
      return filteredPosts;
    } catch (error) {
      logger.error('Error getting social media posts:', error);
      return [];
    }
  }

  async getTrendingTopics(disasterId, timeframe = '24h') {
    try {
      // Generate mock trends if they don't exist for this disaster
      if (!this.mockTrends.has(disasterId)) {
        this.generateMockTrends(disasterId);
      }

      let trends = this.mockTrends.get(disasterId) || [];

      // Filter by timeframe
      const timeframeHours = parseInt(timeframe) || 24;
      const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
      trends = trends.filter(trend => new Date(trend.timestamp) > cutoffTime);

      logger.info(`Retrieved ${trends.length} mock trending topics for disaster ${disasterId}`);
      return trends;
    } catch (error) {
      logger.error('Error getting mock trending topics:', error);
      return [];
    }
  }

  generateMockPosts(disasterId) {
    const posts = [];
    const now = Date.now();
    const mockUsers = ['citizen_reporter', 'local_resident', 'emergency_worker', 'volunteer'];
    const mockContents = [
      'Urgent: Need medical supplies in the affected area. Multiple injuries reported.',
      'Road blocked by debris on Main Street. Emergency vehicles can\'t get through.',
      'Setting up temporary shelter at Community Center. Volunteers needed.',
      'Water levels rising rapidly in downtown area. Immediate evacuation required.',
      'Power outages reported in multiple neighborhoods. Estimated 4-6 hours for restoration.',
      'Emergency response teams deployed to affected areas. Stay clear of rescue operations.',
      'Food and water distribution point set up at Central Park. Limited supplies available.',
      'Search and rescue operations ongoing in residential areas. Report missing persons.',
      'Medical team stationed at Library. Treating minor injuries and providing first aid.',
      'Weather conditions worsening. Seek shelter immediately.'
    ];

    // Generate 20 mock posts with varying timestamps
    for (let i = 0; i < 20; i++) {
      const randomHoursAgo = Math.floor(Math.random() * 48); // Random time within last 48 hours
      posts.push({
        id: `post_${disasterId}_${i}`,
        user: mockUsers[Math.floor(Math.random() * mockUsers.length)],
        content: mockContents[Math.floor(Math.random() * mockContents.length)],
        timestamp: new Date(now - randomHoursAgo * 60 * 60 * 1000).toISOString(),
        likes: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50)
      });
    }

    this.mockPosts.set(disasterId, posts);
  }

  generateMockTrends(disasterId) {
    const trends = [];
    const now = Date.now();
    const mockTopics = [
      'EmergencyResponse',
      'Evacuation',
      'RescueEfforts',
      'CommunitySupport',
      'DisasterRelief',
      'LocalHeroes',
      'StaySafe',
      'WeatherAlert',
      'VolunteerHelp',
      'RecoveryUpdate'
    ];

    // Generate 10 mock trends with varying timestamps
    for (let i = 0; i < 10; i++) {
      const randomHoursAgo = Math.floor(Math.random() * 48); // Random time within last 48 hours
      trends.push({
        id: `trend_${disasterId}_${i}`,
        topic: mockTopics[i],
        mentions: Math.floor(Math.random() * 1000) + 100,
        sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
        timestamp: new Date(now - randomHoursAgo * 60 * 60 * 1000).toISOString()
      });
    }

    this.mockTrends.set(disasterId, trends);
  }
}

export default new MockSocialMediaService(); 