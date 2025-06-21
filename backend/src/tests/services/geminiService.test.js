import geminiService from '../../services/geminiService.js';

describe('GeminiService', () => {
  describe('extractLocation', () => {
    it('should extract location from text', async () => {
      const description = 'A severe flood has hit Miami Beach, Florida causing widespread damage.';
      const location = await geminiService.extractLocation(description);
      expect(location).toBeTruthy();
      expect(typeof location).toBe('string');
    });

    it('should use fallback when Gemini API fails', async () => {
      const description = 'Emergency in downtown area near Central Park.';
      // Mock Gemini API to fail
      jest.spyOn(geminiService.structuredModel, 'generateContent').mockRejectedValue(new Error('API Error'));
      const location = await geminiService.extractLocation(description);
      expect(location).toBe('downtown area near Central Park');
    });
  });

  describe('analyzePriority', () => {
    it('should analyze priority from text', async () => {
      const text = 'URGENT: Immediate evacuation needed due to rising flood waters.';
      const priority = await geminiService.analyzePriority(text);
      expect(priority).toBe('high');
    });

    it('should use fallback priority analysis when API fails', async () => {
      const text = 'Critical situation: Multiple casualties reported.';
      // Mock Gemini API to fail
      jest.spyOn(geminiService.structuredModel, 'generateContent').mockRejectedValue(new Error('API Error'));
      const priority = await geminiService.analyzePriority(text);
      expect(priority).toBe('high');
    });
  });

  describe('verifyImage', () => {
    it('should verify image authenticity', async () => {
      const imageUrl = 'https://example.com/disaster-image.jpg';
      const result = await geminiService.verifyImage(imageUrl);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('analysis');
    });

    it('should handle invalid image URLs', async () => {
      const imageUrl = 'invalid-url';
      const result = await geminiService.verifyImage(imageUrl);
      expect(result.status).toBe('UNVERIFIED');
      expect(result.confidence).toBe('low');
    });
  });

  describe('retryOperation', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) throw new Error('429 Rate limit');
        return 'success';
      };

      const result = await geminiService.retryOperation(operation);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should use fallback after max retries', async () => {
      const operation = async () => {
        throw new Error('429 Rate limit');
      };

      const result = await geminiService.retryOperation(operation);
      expect(result).toBeNull();
    });
  });
}); 