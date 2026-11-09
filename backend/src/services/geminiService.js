import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { fetchPublicImage } from '../utils/safeFetch.js';

dotenv.config();

const PRIORITIES = ['high', 'medium', 'low'];
const CACHE_LIMIT = 500;

/** Parse JSON from a model reply, tolerating ```json fences and surrounding text. */
export function parseModelJson(text) {
  if (!text) throw new Error('Empty model response');
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model response is not JSON');
  }
}

class GeminiService {
  constructor() {
    this.priorityCache = new Map();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY is not set: using keyword-based fallbacks');
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.structuredModel = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.1,
        topK: 16,
        responseMimeType: 'application/json',
      },
    });
    logger.info(`Gemini model ${this.modelName} initialised`);
  }

  get enabled() {
    return Boolean(this.structuredModel);
  }

  /** Run an operation, retrying a few times with a short delay. Returns null if all attempts fail. */
  async retryOperation(operation, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        const rateLimited = String(error?.message || '').includes('429');
        logger.warn(`Gemini call failed (attempt ${attempt}/${maxRetries})${rateLimited ? ': rate limited' : ''}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, rateLimited ? 1000 : 300));
        }
      }
    }
    return null;
  }

  async generateJson(parts) {
    const result = await this.retryOperation(() => this.structuredModel.generateContent(parts));
    if (!result) return null;
    try {
      return parseModelJson(result.response.text());
    } catch (error) {
      logger.warn(`Could not parse Gemini JSON: ${error.message}`);
      return null;
    }
  }

  async extractLocation(description) {
    if (!this.enabled) return this.fallbackLocationExtraction(description);

    const data = await this.generateJson([
      {
        text: `Extract the most specific location from this disaster description. Respond with a JSON object with "city", "state", "country" and "formatted" fields (null when unknown). If no clear location is found, set "formatted" to null.

Description: ${JSON.stringify(description)}`,
      },
    ]);

    if (data?.formatted && typeof data.formatted === 'string') {
      logger.info(`Location extracted: ${data.formatted}`);
      return data.formatted.trim();
    }
    return this.fallbackLocationExtraction(description);
  }

  fallbackLocationExtraction(description = '') {
    const patterns = [
      /\bin ([A-Z][^,.]*(?:,\s*[A-Z][^,.]*)*)/,
      /\bat ([A-Z][^,.]*(?:,\s*[A-Z][^,.]*)*)/,
      /\bnear ([A-Z][^,.]*(?:,\s*[A-Z][^,.]*)*)/,
      /\bin ([^,.]+(?:,[^,.]+)*)/i,
      /\bnear ([^,.]+(?:,[^,.]+)*)/i,
      /([^,.]+(?:,[^,.]+)*) (?:region|area)\b/i,
    ];
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) return match[1].trim();
    }
    return description.trim();
  }

  async verifyImage(imageUrl) {
    if (!this.enabled) return this.getDefaultVerificationResponse('Image verification service unavailable');

    let image;
    try {
      image = await fetchPublicImage(imageUrl);
    } catch (error) {
      logger.warn(`Image fetch rejected: ${error.message}`);
      return this.getDefaultVerificationResponse(`Could not load image: ${error.message}`);
    }

    const data = await this.generateJson([
      {
        text: `Analyze this image to judge whether it looks like an authentic disaster photo. Respond with JSON:
{"status": "VERIFIED" | "SUSPICIOUS" | "UNVERIFIED", "confidence": "high" | "medium" | "low", "analysis": {"visualAuthenticity": string, "contextualRelevance": string, "technicalAssessment": string, "summary": string}}`,
      },
      { inlineData: { data: image.buffer.toString('base64'), mimeType: image.mimeType } },
    ]);

    if (!data?.status) return this.getDefaultVerificationResponse('Failed to verify image');
    return {
      status: data.status,
      confidence: data.confidence || 'low',
      analysis: data.analysis?.summary || 'No summary provided',
    };
  }

  getDefaultVerificationResponse(message) {
    return { status: 'UNVERIFIED', confidence: 'low', analysis: message };
  }

  async analyzePriority(text) {
    if (!text) return 'low';
    if (!this.enabled) return this.fallbackPriorityAnalysis(text);

    // Mock social posts repeat a lot; cache results to save Gemini quota.
    if (this.priorityCache.has(text)) return this.priorityCache.get(text);

    const data = await this.generateJson([
      {
        text: `Determine the priority of this disaster-related text. Respond with JSON:
{"priority": "high" | "medium" | "low", "reasoning": string}

Text: ${JSON.stringify(text)}`,
      },
    ]);

    const priority = PRIORITIES.includes(data?.priority) ? data.priority : this.fallbackPriorityAnalysis(text);
    if (this.priorityCache.size >= CACHE_LIMIT) {
      this.priorityCache.delete(this.priorityCache.keys().next().value);
    }
    this.priorityCache.set(text, priority);
    return priority;
  }

  fallbackPriorityAnalysis(text) {
    if (!text) return 'low';
    const high = [
      /urgent|emergency|immediate|critical|life.?threatening/i,
      /casualties|deaths|injured|trapped/i,
      /evacuat(e|ion)|rescue needed/i,
    ];
    const medium = [/significant|moderate|growing|potential|risk/i, /damage|affected|displaced|shelter/i];
    if (high.some((p) => p.test(text))) return 'high';
    if (medium.some((p) => p.test(text))) return 'medium';
    return 'low';
  }
}

export default new GeminiService();
