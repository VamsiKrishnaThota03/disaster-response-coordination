import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

class GeminiService {
  constructor() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.warn('GEMINI_API_KEY is not set in environment variables');
        return;
      }
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // Initialize with latest stable Gemini 2.5 models
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      });

      // Configure for structured output
      this.structuredModel = this.genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0.1,
          topP: 0.1,
          topK: 16,
        },
      });
      
      logger.info('Gemini models initialized successfully');
    } catch (error) {
      logger.error('Error initializing Gemini models:', error);
    }
  }

  async retryOperation(operation, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // Check if it's a rate limit error
        if (error.message && error.message.includes('429')) {
          // Use exponential backoff with longer delays for rate limits
          const waitTime = Math.pow(2, i + 1) * 2000; // Start with 4s, then 8s, then 16s
          logger.warn(`Rate limit hit. Retry ${i + 1}/${maxRetries} failed. Waiting ${waitTime}ms before next attempt.`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // For other errors, use standard exponential backoff
          const waitTime = Math.pow(2, i) * 1000;
          logger.warn(`Retry ${i + 1}/${maxRetries} failed. Waiting ${waitTime}ms before next attempt.`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    // If we hit rate limits, use fallback methods
    if (lastError && lastError.message && lastError.message.includes('429')) {
      logger.warn('Rate limit persisted, using fallback method');
      return null;
    }
    throw lastError;
  }

  async extractLocation(description) {
    try {
      if (!this.structuredModel) {
        return this.fallbackLocationExtraction(description);
      }

      const prompt = {
        contents: [{
          parts: [{
            text: `Extract the most specific location from this disaster description. Format the response as a JSON object with 'city', 'state' (if applicable), 'country', and 'formatted' fields. If any field is unknown, set it to null.

Description: "${description}"

Example response:
{
  "city": "Miami Beach",
  "state": "Florida",
  "country": "USA",
  "formatted": "Miami Beach, Florida, USA"
}

If no clear location is found, return the original text in the formatted field and null for other fields.`
          }]
        }]
      };

      const result = await this.retryOperation(async () => {
        const response = await this.structuredModel.generateContent(prompt);
        return response;
      });

      const response = await result.response;
      const jsonStr = response.text().trim();
      
      try {
        const locationData = JSON.parse(jsonStr);
        logger.info(`Location extracted: ${locationData.formatted}`);
        return locationData.formatted;
      } catch (parseError) {
        logger.error('Error parsing location JSON:', parseError);
        return this.fallbackLocationExtraction(description);
      }
    } catch (error) {
      logger.error('Error extracting location:', error);
      return this.fallbackLocationExtraction(description);
    }
  }

  fallbackLocationExtraction(description) {
    // Enhanced pattern matching with multiple formats
    const patterns = [
      /in ([^,.]+(?:,[^,.]+)*)/i,
      /at ([^,.]+(?:,[^,.]+)*)/i,
      /near ([^,.]+(?:,[^,.]+)*)/i,
      /([^,.]+(?:,[^,.]+)*) region/i,
      /([^,.]+(?:,[^,.]+)*) area/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return description;
  }

  async verifyImage(imageUrl) {
    try {
      if (!this.structuredModel) {
        return this.getDefaultVerificationResponse('Image verification service unavailable');
      }

      // Fetch the image with timeout
      const imageResponse = await Promise.race([
        fetch(imageUrl),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image fetch timeout')), 10000)
        )
      ]);

      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const imageData = await imageResponse.arrayBuffer();
      
      const prompt = {
        text: `Analyze this image to verify if it appears to be an authentic disaster photo. Provide the analysis as a JSON object with the following structure:

{
  "status": "VERIFIED" | "SUSPICIOUS" | "UNVERIFIED",
  "confidence": "high" | "medium" | "low",
  "analysis": {
    "visualAuthenticity": string,
    "contextualRelevance": string,
    "technicalAssessment": string,
    "summary": string
  }
}

Consider:
1. Visual authenticity (manipulation signs, lighting consistency)
2. Contextual authenticity (disaster characteristics, landmarks)
3. Technical aspects (quality, compression artifacts)`,
        images: [imageData]
      };

      const result = await this.retryOperation(async () => {
        const response = await this.structuredModel.generateContent(prompt);
        return response;
      });

      const response = await result.response;
      const jsonStr = response.text().trim();
      
      try {
        const verificationData = JSON.parse(jsonStr);
        logger.info(`Image verification completed: ${verificationData.status} (${verificationData.confidence})`);
        return {
          status: verificationData.status,
          confidence: verificationData.confidence,
          analysis: verificationData.analysis.summary
        };
      } catch (parseError) {
        logger.error('Error parsing verification JSON:', parseError);
        return this.getDefaultVerificationResponse('Failed to parse verification results');
      }
    } catch (error) {
      logger.error('Error verifying image:', error);
      return this.getDefaultVerificationResponse('Failed to verify image due to technical issues');
    }
  }

  getDefaultVerificationResponse(message) {
    return {
      status: 'UNVERIFIED',
      confidence: 'low',
      analysis: message
    };
  }

  async analyzePriority(text) {
    try {
      if (!this.structuredModel) {
        return this.fallbackPriorityAnalysis(text);
      }

      const prompt = {
        contents: [{
          parts: [{
            text: `Analyze this disaster-related text and determine its priority level. Return the analysis as a JSON object with the following structure:

{
  "priority": "high" | "medium" | "low",
  "factors": {
    "lifeThreat": boolean,
    "scale": "large" | "medium" | "small",
    "timeSensitivity": "immediate" | "urgent" | "normal",
    "populationImpact": "high" | "medium" | "low"
  },
  "reasoning": string
}

Text: "${text}"`
          }]
        }]
      };

      const result = await this.retryOperation(async () => {
        const response = await this.structuredModel.generateContent(prompt);
        return response;
      });

      // If we got a null result from retryOperation, use fallback
      if (!result) {
        logger.info('Using fallback priority analysis due to rate limit');
        return this.fallbackPriorityAnalysis(text);
      }

      const response = await result.response;
      const jsonStr = response.text().trim();
      
      try {
        const priorityData = JSON.parse(jsonStr);
        logger.info(`Priority analyzed: ${priorityData.priority} (${priorityData.reasoning})`);
        return priorityData.priority;
      } catch (parseError) {
        logger.error('Error parsing priority JSON:', parseError);
        return this.fallbackPriorityAnalysis(text);
      }
    } catch (error) {
      logger.error('Error analyzing priority:', error);
      return this.fallbackPriorityAnalysis(text);
    }
  }

  fallbackPriorityAnalysis(text) {
    if (!text) {
      logger.warn('Empty text provided for priority analysis, defaulting to low');
      return 'low';
    }

    const priorityPatterns = {
      high: [
        /urgent|emergency|immediate|critical|life.?threatening/i,
        /casualties|deaths|injured|trapped/i,
        /evacuat(e|ion)|rescue needed/i
      ],
      medium: [
        /significant|moderate|growing|potential|risk/i,
        /damage|affected|displaced|shelter/i
      ]
    };

    const lowercaseText = text.toLowerCase();
    
    if (priorityPatterns.high.some(pattern => pattern.test(lowercaseText))) {
      return 'high';
    }
    if (priorityPatterns.medium.some(pattern => pattern.test(lowercaseText))) {
      return 'medium';
    }
    return 'low';
  }
}

export default new GeminiService(); 