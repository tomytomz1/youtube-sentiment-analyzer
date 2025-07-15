// Main application logic - orchestrates all modules
import { SecurityUtils } from './security.js';
import { UIManager } from './ui.js';
import { APIManager } from './api.js';
import { ShareManager } from './share.js';
import { StorageManager } from './storage.js';

class YouTubeSentimentAnalyzer {
  constructor() {
    this.isAnalyzing = false;
    this.lastAnalyzedUrl = '';
    this.currentVideoUrl = '';
    this.currentSummary = '';
    this.lastSharedResultId = null;
    this.lastSharedResultData = null;
    
    this.init();
  }

  init() {
    // Initialize managers
    this.elements = this.cacheElements();
    this.uiManager = new UIManager(this.elements);
    this.apiManager = new APIManager();
    this.shareManager = new ShareManager();
    this.storageManager = new StorageManager();

    // Set up event listeners
    this.setupEventListeners();
    
    // Load history and check for shared videos
    this.loadHistory();
    this.checkSharedVideo();
    
    // Set up cleanup
    this.setupCleanup();
  }

  cacheElements() {
    return {
      form: document.getElementById('analysis-form'),
      urlInput: document.getElementById('youtube-url'),
      urlError: document.getElementById('url-error'),
      analyzeButton: document.getElementById('analyze-button'),
      loadingState: document.getElementById('loading-state'),
      loadingText: document.getElementById('loading-text'),
      progressBar: document.getElementById('progress-bar'),
      progressFill: document.getElementById('progress-fill'),
      errorState: document.getElementById('error-state'),
      errorMessage: document.getElementById('error-message'),
      errorSuggestions: document.getElementById('error-suggestions'),
      resultsContainer: document.getElementById('results-container'),
      positivePercentage: document.getElementById('positive-percentage'),
      neutralPercentage: document.getElementById('neutral-percentage'),
      negativePercentage: document.getElementById('negative-percentage'),
      positiveBar: document.getElementById('positive-bar'),
      neutralBar: document.getElementById('neutral-bar'),
      negativeBar: document.getElementById('negative-bar'),
      sentimentSummary: document.getElementById('sentiment-summary'),
      positiveComments: document.getElementById('positive-comments'),
      neutralComments: document.getElementById('neutral-comments'),
      negativeComments: document.getElementById('negative-comments'),
      sampleInfo: document.getElementById('sample-info'),
      mostLikedCallout: document.getElementById('most-liked-callout'),
      mostLikedLabel: document.getElementById('most-liked-label'),
      mostLikedText: document.getElementById('most-liked-text'),
      videoInfoCard: document.getElementById('video-info'),
      videoThumb: document.getElementById('video-thumb'),
      videoTitle: document.getElementById('video-title'),
      channelLink: document.getElementById('channel-link'),
      channelThumb: document.getElementById('channel-thumb'),
      channelTitle: document.getElementById('channel-title'),
      channelDesc: document.getElementById('channel-desc'),
      analyzeAnother: document.getElementById('analyze-another'),
      shareResults: document.getElementById('share-results'),
      historyContainer: document.getElementById('history-container'),
      historyList: document.getElementById('history-list')
    };
  }

  setupEventListeners() {
    // Form submission
    this.elements.form?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    // Analyze Another button
    this.elements.analyzeAnother?.addEventListener('click', () => this.analyzeAnother());
    
    // Share Results button
    this.elements.shareResults?.addEventListener('click', () => this.shareResults());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (this.isAnalyzing) return;
    
    if (!this.elements.urlInput) return;
    
    const youtubeUrl = this.elements.urlInput.value.trim();
    
    // Input validation
    if (!this.validateInput(youtubeUrl)) return;
    
    // Rate limiting
    if (!SecurityUtils.rateLimiter.isAllowed()) {
      this.uiManager.showError('Too many requests. Please wait a minute before trying again.');
      return;
    }

    // Check if re-analyzing same URL
    if (youtubeUrl === this.lastAnalyzedUrl && 
        this.elements.resultsContainer && 
        !this.elements.resultsContainer.classList.contains('hidden')) {
      return;
    }

    // Check cache
    const cached = this.apiManager.getCachedAnalysis(youtubeUrl);
    if (cached) {
      this.uiManager.showResults(cached.sentiment, cached.meta);
      return;
    }

    await this.performAnalysis(youtubeUrl);
  }

  validateInput(youtubeUrl) {
    this.elements.urlError?.classList.add('hidden');

    if (!youtubeUrl) {
      SecurityUtils.safeSetText(this.elements.urlError, 'Please enter a YouTube URL');
      this.elements.urlError?.classList.remove('hidden');
      return false;
    }

    if (youtubeUrl.length > 2048) {
      SecurityUtils.safeSetText(this.elements.urlError, 'URL is too long');
      this.elements.urlError?.classList.remove('hidden');
      return false;
    }

    if (!SecurityUtils.isValidYouTubeUrl(youtubeUrl)) {
      SecurityUtils.safeSetText(this.elements.urlError, 'Please enter a valid YouTube URL');
      this.elements.urlError?.classList.remove('hidden');
      return false;
    }

    return true;
  }

  async performAnalysis(youtubeUrl) {
    this.isAnalyzing = true;
    this.lastAnalyzedUrl = youtubeUrl;
    this.currentVideoUrl = youtubeUrl;
    
    // Set global reference for UI manager
    window.currentVideoUrl = youtubeUrl;

    try {
      // Fetch comments
      this.uiManager.showLoading('Fetching comments...');
      const commentsData = await this.apiManager.fetchComments(youtubeUrl);

      if (!commentsData.comments || commentsData.comments.length === 0) {
        throw new Error('No comments found for this video');
      }

      // Analyze sentiment
      this.uiManager.showLoading('Analyzing sentiment...');
      const sentimentData = await this.apiManager.analyzeSentiment(commentsData);

      const meta = {
        analyzedCount: commentsData.analyzedCount,
        totalComments: commentsData.totalComments,
        mostLiked: commentsData.mostLiked,
        videoInfo: sentimentData.videoInfo,
        channelInfo: sentimentData.channelInfo,
      };

      // Cache results
      this.apiManager.cacheAnalysis(youtubeUrl, { sentiment: sentimentData, meta });

      // Display results
      this.uiManager.showResults(sentimentData, meta);
      
      this.currentSummary = sentimentData.summary || '';
      
      // Add to history
      if (meta.videoInfo?.title) {
        this.storageManager.addToHistory(this.currentVideoUrl, meta.videoInfo.title);
        this.loadHistory();
      }

    } catch (error) {
      console.error('Analysis error:', error);
      this.uiManager.showError(error.message || 'An unexpected error occurred');
    } finally {
      this.isAnalyzing = false;
    }
  }

  analyzeAnother() {
    if (this.elements.urlInput) {
      this.elements.urlInput.value = '';
    }
    this.uiManager.hideAllStates();
    this.elements.urlInput?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async shareResults() {
    if (!this.currentVideoUrl || !this.currentSummary) return;
    
    try {
      let shareUrl = '';
      
      if (this.lastSharedResultId && this.lastSharedResultData && this.lastAnalyzedUrl === this.currentVideoUrl) {
        shareUrl = `${window.location.origin}/result/${this.lastSharedResultId}`;
      } else {
        const cached = this.apiManager.getCachedAnalysis(this.currentVideoUrl);
        if (cached) {
          const result = await this.apiManager.saveResults(cached.sentiment, cached.meta, this.currentVideoUrl);
          this.lastSharedResultId = result.id;
          this.lastSharedResultData = { sentimentData: cached.sentiment, meta: cached.meta, videoUrl: this.currentVideoUrl };
          shareUrl = result.shareUrl;
        } else {
          shareUrl = `${window.location.origin}?video=${encodeURIComponent(this.currentVideoUrl)}`;
        }
      }
      
      const videoTitle = this.elements.videoTitle?.textContent || 'this video';
      const positive = this.elements.positivePercentage?.textContent || '0%';
      const neutral = this.elements.neutralPercentage?.textContent || '0%';
      const negative = this.elements.negativePercentage?.textContent || '0%';
      
      this.shareManager.createShareModal(shareUrl, videoTitle, positive, neutral, negative);
      
    } catch (error) {
      console.error('Error sharing results:', error);
      const fallbackUrl = `${window.location.origin}?video=${encodeURIComponent(this.currentVideoUrl)}`;
      this.shareManager.copyToClipboard(fallbackUrl);
    }
  }

  handleKeyboard(e) {
    // Ctrl/Cmd + Enter to analyze
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && 
        document.activeElement === this.elements.urlInput && this.elements.form) {
      e.preventDefault();
      this.elements.form.dispatchEvent(new Event('submit'));
    }
    
    // Escape to clear results
    if (e.key === 'Escape' && this.elements.resultsContainer && 
        !this.elements.resultsContainer.classList.contains('hidden')) {
      this.uiManager.hideAllStates();
      if (this.elements.urlInput) {
        this.elements.urlInput.value = '';
        this.elements.urlInput.focus();
      }
    }
  }

  loadHistory() {
    this.storageManager.displayHistory(
      this.elements.historyContainer,
      this.elements.historyList,
      this.elements
    );
  }

  checkSharedVideo() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedVideo = urlParams.get('video');
    if (sharedVideo && SecurityUtils.isValidYouTubeUrl(sharedVideo) && 
        this.elements.urlInput && this.elements.form) {
      this.elements.urlInput.value = sharedVideo;
      this.elements.form.dispatchEvent(new Event('submit'));
    }
  }

  setupCleanup() {
    window.addEventListener('beforeunload', () => {
      this.uiManager.clearProgress();
    });
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new YouTubeSentimentAnalyzer();
});