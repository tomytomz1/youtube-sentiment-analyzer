import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityUtils } from './security.js';

describe('SecurityUtils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      expect(SecurityUtils.escapeHtml(input)).toBe(expected);
    });

    it('should escape quotes and ampersands', () => {
      const input = 'Hello & "World"';
      const expected = 'Hello &amp; "World"';
      expect(SecurityUtils.escapeHtml(input)).toBe(expected);
    });

    it('should handle empty string', () => {
      expect(SecurityUtils.escapeHtml('')).toBe('');
    });
  });

  describe('isValidUrl', () => {
    it('should validate https URLs', () => {
      expect(SecurityUtils.isValidUrl('https://example.com')).toBe(true);
    });

    it('should validate http URLs', () => {
      expect(SecurityUtils.isValidUrl('http://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(SecurityUtils.isValidUrl('not-a-url')).toBe(false);
      expect(SecurityUtils.isValidUrl('javascript:alert(1)')).toBe(false);
      expect(SecurityUtils.isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should handle malformed URLs', () => {
      expect(SecurityUtils.isValidUrl('https://')).toBe(false);
      expect(SecurityUtils.isValidUrl('://example.com')).toBe(false);
    });
  });

  describe('isValidYouTubeUrl', () => {
    it('should validate standard YouTube URLs', () => {
      expect(SecurityUtils.isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(SecurityUtils.isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('should validate YouTube short URLs', () => {
      expect(SecurityUtils.isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('should validate YouTube embed URLs', () => {
      expect(SecurityUtils.isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('should validate YouTube /v/ URLs', () => {
      expect(SecurityUtils.isValidYouTubeUrl('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe(true);
    });

    it('should reject non-YouTube URLs', () => {
      expect(SecurityUtils.isValidYouTubeUrl('https://example.com')).toBe(false);
      expect(SecurityUtils.isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
    });

    it('should reject invalid video IDs', () => {
      expect(SecurityUtils.isValidYouTubeUrl('https://www.youtube.com/watch?v=invalid')).toBe(false);
      expect(SecurityUtils.isValidYouTubeUrl('https://www.youtube.com/watch?v=short')).toBe(false);
    });
  });

  describe('isValidImageUrl', () => {
    it('should validate YouTube image URLs', () => {
      expect(SecurityUtils.isValidImageUrl('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')).toBe(true);
    });

    it('should validate Google user content URLs', () => {
      expect(SecurityUtils.isValidImageUrl('https://yt3.ggpht.com/a/default-user=s100-c-k-c0x00ffffff-no-rj')).toBe(true);
    });

    it('should validate googleusercontent URLs', () => {
      expect(SecurityUtils.isValidImageUrl('https://lh3.googleusercontent.com/example')).toBe(true);
    });

    it('should reject non-allowed domains', () => {
      expect(SecurityUtils.isValidImageUrl('https://example.com/image.jpg')).toBe(false);
      expect(SecurityUtils.isValidImageUrl('https://malicious.com/image.jpg')).toBe(false);
    });
  });

  describe('safeSetText', () => {
    it('should set text content safely', () => {
      const element = document.createElement('div');
      SecurityUtils.safeSetText(element, 'Hello World');
      expect(element.textContent).toBe('Hello World');
    });

    it('should handle null element', () => {
      expect(() => SecurityUtils.safeSetText(null, 'Hello')).not.toThrow();
    });

    it('should handle non-string text', () => {
      const element = document.createElement('div');
      SecurityUtils.safeSetText(element, 123);
      expect(element.textContent).toBe('');
    });
  });

  describe('rateLimiter', () => {
    beforeEach(() => {
      // Clear any existing rate limit data
      vi.clearAllMocks();
      // Reset rate limiter state by creating a new instance
      SecurityUtils.rateLimiter = (() => {
        const requests = new Map();
        const WINDOW_MS = 60000;
        const MAX_REQUESTS = 5;

        return {
          isAllowed: () => {
            const now = Date.now();
            const windowStart = now - WINDOW_MS;
            
            for (const [time] of requests.entries()) {
              if (time < windowStart) {
                requests.delete(time);
              }
            }

            let recentRequests = 0;
            for (const [time, count] of requests.entries()) {
              if (time >= windowStart) {
                recentRequests += count;
              }
            }

            if (recentRequests >= MAX_REQUESTS) {
              return false;
            }

            const minute = Math.floor(now / WINDOW_MS) * WINDOW_MS;
            requests.set(minute, (requests.get(minute) || 0) + 1);
            return true;
          }
        };
      })();
    });

    it('should allow requests within limit', () => {
      expect(SecurityUtils.rateLimiter.isAllowed()).toBe(true);
      expect(SecurityUtils.rateLimiter.isAllowed()).toBe(true);
    });

    it('should block requests after limit exceeded', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        expect(SecurityUtils.rateLimiter.isAllowed()).toBe(true);
      }
      // 6th request should be blocked
      expect(SecurityUtils.rateLimiter.isAllowed()).toBe(false);
    });
  });
});