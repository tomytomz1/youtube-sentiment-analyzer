// API utilities for handling requests and responses
import { errorHandler } from './errorHandler.js';

export class APIManager {
  constructor() {
    this.analysisCache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Enhanced fetch with security measures
  async secureFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Get cached analysis if available
  getCachedAnalysis(url) {
    const cached = this.analysisCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // Cache analysis results
  cacheAnalysis(url, data) {
    this.analysisCache.set(url, {
      data,
      timestamp: Date.now()
    });
  }

  // Fetch YouTube comments with error handling
  async fetchComments(youtubeUrl) {
    return errorHandler.handleApiCall(async () => {
      const response = await this.secureFetch('/api/youtube-comments', {
        method: 'POST',
        body: JSON.stringify({ youtubeUrl })
      });

      return response.json();
    }, {
      retries: 2,
      fallbackMessage: 'Failed to fetch comments. Please check the YouTube URL and try again.'
    });
  }

  // Analyze sentiment with error handling  
  async analyzeSentiment(commentsData) {
    return errorHandler.handleApiCall(async () => {
      const response = await this.secureFetch('/api/youtube-sentiment', {
        method: 'POST',
        body: JSON.stringify(commentsData)
      });

      return response.json();
    }, {
      retries: 2,
      fallbackMessage: 'Failed to analyze sentiment. Please try again in a moment.'
    });
  }

  // Analyze Reddit sentiment with error handling  
  async analyzeRedditSentiment(redditUrl, maxComments = 300) {
    return errorHandler.handleApiCall(async () => {
      const response = await this.secureFetch('/api/reddit-sentiment', {
        method: 'POST',
        body: JSON.stringify({
          redditUrl: redditUrl,
          maxComments: maxComments
        })
      });

      return response.json();
    }, {
      retries: 2,
      fallbackMessage: 'Failed to analyze sentiment. Please try again in a moment.'
    });
  }

  // Save results for sharing
  async saveResults(sentimentData, meta, videoUrl) {
    const response = await this.secureFetch('/api/save-result', {
      method: 'POST',
      body: JSON.stringify({
        sentimentData,
        meta,
        videoUrl,
      }),
    });

    return response.json();
  }
}