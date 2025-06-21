import express from 'express';
import logger from '../utils/logger.js';
import mockSocialMediaService from '../services/mockSocialMediaService.js';
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

// Get social media posts for a disaster
router.get('/disaster/:disasterId', rateLimitMiddleware, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords, timeframe } = req.query;

    const posts = await mockSocialMediaService.getPostsForDisaster(
      disasterId,
      keywords,
      timeframe
    );

    // Analyze priority for each post
    const analyzedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          const priority = await geminiService.analyzePriority(post.content);
          return { ...post, priority };
        } catch (error) {
          logger.warn('Gemini priority analysis failed, using fallback:', error);
          const priority = geminiService.fallbackPriorityAnalysis(post.content);
          return { ...post, priority };
        }
      })
    );

    res.json(analyzedPosts);
  } catch (error) {
    logger.error('Error fetching social media posts:', error);
    res.status(500).json({ error: 'Failed to fetch social media posts' });
  }
});

// Get high-priority social media posts
router.get('/priority/:disasterId', rateLimitMiddleware, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { timeframe } = req.query;

    const posts = await mockSocialMediaService.getPostsForDisaster(
      disasterId,
      null,
      timeframe
    );

    // Filter and analyze posts
    const highPriorityPosts = [];
    for (const post of posts) {
      const priority = await geminiService.analyzePriority(post.content);
      if (priority === 'high') {
        highPriorityPosts.push({ ...post, priority });
      }
    }

    res.json(highPriorityPosts);
  } catch (error) {
    logger.error('Error fetching priority social media posts:', error);
    res.status(500).json({ error: 'Failed to fetch priority social media posts' });
  }
});

// Get trending topics from social media
router.get('/trends/:disasterId', rateLimitMiddleware, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { timeframe } = req.query;

    const trends = await mockSocialMediaService.getTrendingTopics(
      disasterId,
      timeframe
    );

    res.json(trends);
  } catch (error) {
    logger.error('Error fetching social media trends:', error);
    res.status(500).json({ error: 'Failed to fetch social media trends' });
  }
});

export default router; 