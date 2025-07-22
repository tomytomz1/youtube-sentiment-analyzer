// Security utilities for client-side validation and protection
export const SecurityUtils = {
  // Escape HTML to prevent XSS
  escapeHtml: (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Sanitize URL to prevent XSS
  isValidUrl: (string) => {
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },

  // Validate YouTube URL format
  isValidYouTubeUrl: (url) => {
    if (!SecurityUtils.isValidUrl(url)) return false;
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
      /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]{11}/
    ];
    return patterns.some(pattern => pattern.test(url));
  },

  // Safely set text content (no HTML)
  safeSetText: (element, text) => {
    if (element && typeof text === 'string') {
      element.textContent = text;
    }
  },

  // Safely set HTML with escaping
  safeSetHtml: (element, html) => {
    if (element && typeof html === 'string') {
      element.innerHTML = SecurityUtils.escapeHtml(html);
    }
  },

  // Validate image URL
  isValidImageUrl: (url) => {
    if (!SecurityUtils.isValidUrl(url)) return false;
    try {
      const parsed = new URL(url);
      const allowedDomains = ['ytimg.com', 'ggpht.com', 'googleusercontent.com'];
      return allowedDomains.some(domain => parsed.hostname.endsWith(domain));
    } catch {
      return false;
    }
  },

  // Rate limiting for client-side requests
  rateLimiter: (() => {
    const requests = new Map();
    const WINDOW_MS = 60000; // 1 minute
    const MAX_REQUESTS = 5;

    return {
      isAllowed: () => {
        const now = Date.now();
        const windowStart = now - WINDOW_MS;
        
        // Clean old requests
        for (const [time] of requests.entries()) {
          if (time < windowStart) {
            requests.delete(time);
          }
        }

        // Count recent requests
        let recentRequests = 0;
        for (const [time, count] of requests.entries()) {
          if (time >= windowStart) {
            recentRequests += count;
          }
        }

        if (recentRequests >= MAX_REQUESTS) {
          return false;
        }

        // Add current request
        const minute = Math.floor(now / WINDOW_MS) * WINDOW_MS;
        requests.set(minute, (requests.get(minute) || 0) + 1);
        return true;
      }
    };
  })()
};