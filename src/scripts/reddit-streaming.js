/**
 * Reddit Sentiment Analysis Streaming Client
 * Handles real-time streaming analysis with progressive UI updates
 */

class RedditStreamingAnalyzer {
  constructor() {
    this.eventSource = null;
    this.analysisData = {};
    this.isAnalyzing = false;
    this.progressCallbacks = [];
    this.completionCallbacks = [];
    this.errorCallbacks = [];
  }

  /**
   * Start streaming analysis
   * @param {string} redditUrl - Reddit thread URL
   * @param {number} maxComments - Maximum comments to analyze (default: 100)
   * @returns {Promise} - Resolves when analysis is complete
   */
  async analyzeWithStreaming(redditUrl, maxComments = 100) {
    if (this.isAnalyzing) {
      throw new Error('Analysis already in progress');
    }

    this.isAnalyzing = true;
    this.analysisData = {};

    return new Promise((resolve, reject) => {
      try {
        // Create EventSource for streaming
        const url = new URL('/api/reddit-sentiment-stream', window.location.origin);
        
        // Use fetch with streaming instead of EventSource for POST support
        fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ redditUrl, maxComments })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          return this.processStream(reader, decoder, resolve, reject);
        }).catch(error => {
          this.isAnalyzing = false;
          this.triggerErrorCallbacks(error);
          reject(error);
        });

      } catch (error) {
        this.isAnalyzing = false;
        this.triggerErrorCallbacks(error);
        reject(error);
      }
    });
  }

  /**
   * Process the streaming response
   */
  async processStream(reader, decoder, resolve, reject) {
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              await this.handleStreamMessage(parsed, resolve, reject);
            } catch (e) {
              // Skip malformed JSON
              console.warn('Malformed SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      this.isAnalyzing = false;
      this.triggerErrorCallbacks(error);
      reject(error);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle individual stream messages
   */
  async handleStreamMessage(message, resolve, reject) {
    switch (message.type) {
      case 'progress':
        this.handleProgress(message);
        break;

      case 'partial_analysis':
        this.handlePartialAnalysis(message);
        break;

      case 'sentiment_complete':
        this.handleSentimentComplete(message);
        break;

      case 'themes_complete':
        this.handleThemesComplete(message);
        break;

      case 'sarcasm_complete':
        this.handleSarcasmComplete(message);
        break;

      case 'complete':
        this.handleComplete(message, resolve);
        break;

      case 'error':
        this.handleError(message, reject);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Handle progress updates
   */
  handleProgress(message) {
    const progressMessages = {
      'fetching_comments': 'Fetching Reddit comments...',
      'comments_fetched': `Comments retrieved (${message.data?.commentCount || 0}), starting analysis...`,
      'sentiment_analyzed': 'Overall sentiment analysis complete',
      'themes_identified': 'Themes and topics identified',
      'sarcasm_detected': 'Sarcasm and meme detection complete'
    };

    const progressMessage = progressMessages[message.stage] || message.message;
    
    this.triggerProgressCallbacks({
      stage: message.stage,
      message: progressMessage,
      data: message.data
    });

    // Update UI
    this.updateProgressUI(message.stage, progressMessage, message.data);
  }

  /**
   * Handle partial analysis results
   */
  handlePartialAnalysis(message) {
    if (message.field && message.value !== undefined) {
      this.analysisData[message.field] = message.value;
      this.updatePartialResults(message.field, message.value);
    }
  }

  /**
   * Handle sentiment completion
   */
  handleSentimentComplete(message) {
    if (message.data) {
      this.analysisData.overall_sentiment = message.data;
      this.displaySentimentData(message.data);
      this.revealSection('sentiment-section');
    }
  }

  /**
   * Handle themes completion
   */
  handleThemesComplete(message) {
    if (message.data) {
      this.analysisData.themes = message.data;
      this.displayThemes(message.data);
      this.revealSection('themes-section');
    }
  }

  /**
   * Handle sarcasm completion
   */
  handleSarcasmComplete(message) {
    if (message.data) {
      this.analysisData.sarcasm_flags = message.data;
      this.displaySarcasmDetection(message.data);
      this.revealSection('sarcasm-section');
    }
  }

  /**
   * Handle analysis completion
   */
  handleComplete(message, resolve) {
    this.isAnalyzing = false;
    
    if (message.data) {
      this.analysisData = { ...this.analysisData, ...message.data };
    }

    this.showAnalysisComplete();
    this.triggerCompletionCallbacks(this.analysisData);
    resolve(this.analysisData);
  }

  /**
   * Handle errors
   */
  handleError(message, reject) {
    this.isAnalyzing = false;
    const error = new Error(message.error || 'Analysis failed');
    this.showError(error.message);
    this.triggerErrorCallbacks(error);
    reject(error);
  }

  /**
   * Update progress UI
   */
  updateProgressUI(stage, message, data) {
    const progressElement = document.getElementById('analysis-progress');
    if (progressElement) {
      progressElement.textContent = message;
      progressElement.style.display = 'block';
    }

    // Update progress bar if exists
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      const progressPercent = this.getProgressPercent(stage);
      progressBar.style.width = `${progressPercent}%`;
      progressBar.setAttribute('aria-valuenow', progressPercent);
    }

    // Show thread info if available
    if (data?.threadTitle) {
      this.updateThreadInfo(data);
    }
  }

  /**
   * Get progress percentage for stage
   */
  getProgressPercent(stage) {
    const stages = {
      'fetching_comments': 10,
      'comments_fetched': 30,
      'sentiment_analyzed': 50,
      'themes_identified': 70,
      'sarcasm_detected': 85,
      'complete': 100
    };
    return stages[stage] || 0;
  }

  /**
   * Update thread information display
   */
  updateThreadInfo(data) {
    const threadInfoElement = document.getElementById('thread-info');
    if (threadInfoElement && data.threadTitle) {
      threadInfoElement.innerHTML = `
        <h3>${this.escapeHtml(data.threadTitle)}</h3>
        <p>r/${data.subreddit} • ${data.commentCount} comments analyzed</p>
      `;
      threadInfoElement.style.display = 'block';
    }
  }

  /**
   * Update partial results in UI
   */
  updatePartialResults(field, value) {
    switch (field) {
      case 'overall_sentiment':
        this.displaySentimentData(value);
        this.revealSection('sentiment-section');
        break;

      case 'themes':
        this.displayThemes(value);
        this.revealSection('themes-section');
        break;

      case 'top_positive_comments':
        this.displaySampleComments('positive', value);
        break;

      case 'top_negative_comments':
        this.displaySampleComments('negative', value);
        break;

      case 'sarcasm_flags':
        this.displaySarcasmDetection(value);
        this.revealSection('sarcasm-section');
        break;

      case 'meme_detection':
        this.displayMemeDetection(value);
        this.revealSection('meme-section');
        break;
    }
  }

  /**
   * Display sentiment data
   */
  displaySentimentData(sentiment) {
    // Try to use existing UI elements first
    if (window.uiManager && window.uiManager.displaySentimentData) {
      window.uiManager.displaySentimentData({ overall_sentiment: sentiment });
      return;
    }
    
    // Fallback to custom display
    const container = document.getElementById('sentiment-display');
    if (!container) return;

    container.innerHTML = `
      <div class="sentiment-bars">
        <div class="sentiment-bar positive" style="width: ${sentiment.positive}%">
          <span>Positive: ${sentiment.positive}%</span>
        </div>
        <div class="sentiment-bar neutral" style="width: ${sentiment.neutral}%">
          <span>Neutral: ${sentiment.neutral}%</span>
        </div>
        <div class="sentiment-bar negative" style="width: ${sentiment.negative}%">
          <span>Negative: ${sentiment.negative}%</span>
        </div>
      </div>
      <p class="sentiment-explanation">${this.escapeHtml(sentiment.explainability || '')}</p>
    `;
  }

  /**
   * Display themes
   */
  displayThemes(themes) {
    const container = document.getElementById('themes-display');
    if (!container || !Array.isArray(themes)) return;

    const themesHtml = themes.slice(0, 5).map(theme => `
      <div class="theme-item">
        <h4>${this.escapeHtml(theme.theme)}</h4>
        <p>${this.escapeHtml(theme.summary)}</p>
        <div class="theme-stats">
          <span class="sentiment ${theme.sentiment}">${theme.sentiment}</span>
          <span class="share">${Math.round(theme.share * 100)}% of comments</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = themesHtml;
  }

  /**
   * Display sample comments
   */
  displaySampleComments(type, comments) {
    const container = document.getElementById(`${type}-comments-display`);
    if (!container || !Array.isArray(comments)) return;

    const commentsHtml = comments.slice(0, 3).map(comment => `
      <div class="comment-item">
        <p class="comment-text">${this.escapeHtml(comment.text)}</p>
        <div class="comment-meta">
          <span class="author">${this.escapeHtml(comment.author)}</span>
          <span class="upvotes">${comment.upvotes} upvotes</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = commentsHtml;
  }

  /**
   * Display sarcasm detection
   */
  displaySarcasmDetection(sarcasmFlags) {
    const container = document.getElementById('sarcasm-display');
    if (!container || !Array.isArray(sarcasmFlags)) return;

    const sarcasmHtml = sarcasmFlags.slice(0, 3).map(flag => `
      <div class="sarcasm-item">
        <p class="sarcasm-text">${this.escapeHtml(flag.text)}</p>
        <p class="sarcasm-reason">${this.escapeHtml(flag.reason)}</p>
        <div class="sarcasm-meta">
          <span class="confidence">${Math.round(flag.confidence * 100)}% confidence</span>
          <span class="author">${this.escapeHtml(flag.author)}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = sarcasmHtml;
  }

  /**
   * Display meme detection
   */
  displayMemeDetection(memeDetection) {
    const container = document.getElementById('meme-display');
    if (!container || !Array.isArray(memeDetection)) return;

    const memeHtml = memeDetection.slice(0, 3).map(meme => `
      <div class="meme-item">
        <p class="meme-text">${this.escapeHtml(meme.text)}</p>
        <p class="meme-format">${this.escapeHtml(meme.meme_format)}</p>
        <div class="meme-meta">
          <span class="confidence">${Math.round(meme.confidence * 100)}% confidence</span>
          <span class="author">${this.escapeHtml(meme.author)}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = memeHtml;
  }

  /**
   * Reveal a section with animation
   */
  revealSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('hidden');
      section.classList.add('animate-fade-in');
    }
  }

  /**
   * Show analysis complete
   */
  showAnalysisComplete() {
    const progressElement = document.getElementById('analysis-progress');
    if (progressElement) {
      progressElement.textContent = 'Analysis complete!';
      progressElement.classList.add('complete');
    }

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.classList.add('complete');
    }
  }

  /**
   * Show error
   */
  showError(message) {
    const progressElement = document.getElementById('analysis-progress');
    if (progressElement) {
      progressElement.textContent = `Error: ${message}`;
      progressElement.classList.add('error');
    }
  }

  /**
   * Stop analysis
   */
  stop() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isAnalyzing = false;
  }

  /**
   * Add progress callback
   */
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  /**
   * Add completion callback
   */
  onComplete(callback) {
    this.completionCallbacks.push(callback);
  }

  /**
   * Add error callback
   */
  onError(callback) {
    this.errorCallbacks.push(callback);
  }

  /**
   * Trigger progress callbacks
   */
  triggerProgressCallbacks(data) {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * Trigger completion callbacks
   */
  triggerCompletionCallbacks(data) {
    this.completionCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Completion callback error:', error);
      }
    });
  }

  /**
   * Trigger error callbacks
   */
  triggerErrorCallbacks(error) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error callback error:', callbackError);
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get current analysis data
   */
  getAnalysisData() {
    return { ...this.analysisData };
  }

  /**
   * Check if analysis is in progress
   */
  isAnalysisInProgress() {
    return this.isAnalyzing;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedditStreamingAnalyzer;
} else if (typeof window !== 'undefined') {
  window.RedditStreamingAnalyzer = RedditStreamingAnalyzer;
}

// Auto-initialize if script is loaded directly
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize global instance
    window.redditAnalyzer = new RedditStreamingAnalyzer();
    
    // Set up form handlers if they exist
    const form = document.getElementById('reddit-analysis-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const urlInput = document.getElementById('reddit-url');
        const redditUrl = urlInput?.value?.trim();
        
        if (!redditUrl) {
          alert('Please enter a Reddit URL');
          return;
        }

        try {
          // Show loading state
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Analyzing...';
          }

          // Start analysis
          const result = await window.redditAnalyzer.analyzeWithStreaming(redditUrl);
          
          // Handle completion
          console.log('Analysis complete:', result);
          
        } catch (error) {
          console.error('Analysis failed:', error);
          alert(`Analysis failed: ${error.message}`);
        } finally {
          // Reset button
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Analyze Sentiment';
          }
        }
      });
    }
  });
} 