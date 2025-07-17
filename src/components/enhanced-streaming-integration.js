/**
 * Enhanced Streaming Integration
 * Connects the streaming analysis with the enhanced UI components
 */

class EnhancedStreamingIntegration {
  constructor() {
    this.streamingAnalyzer = null;
    this.enhancedUI = null;
    this.interactiveCharts = null;
    this.themeExplorer = null;
    this.isInitialized = false;
    this.currentAnalysis = null;
    
    this.initializeComponents();
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    // Wait for all components to be available
    await this.waitForComponents();
    
    // Get component instances
    this.streamingAnalyzer = window.redditAnalyzer;
    this.enhancedUI = window.enhancedUI;
    this.interactiveCharts = window.interactiveCharts;
    this.themeExplorer = window.themeExplorer;
    
    // Initialize Chart.js
    await this.interactiveCharts.initializeChartJS();
    
    // Setup integration
    this.setupStreamingIntegration();
    this.setupProgressTracking();
    
    this.isInitialized = true;
    console.log('Enhanced streaming integration initialized');
  }

  /**
   * Wait for all components to be available
   */
  async waitForComponents() {
    const checkComponent = (name) => {
      return new Promise((resolve) => {
        const check = () => {
          if (window[name]) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    await Promise.all([
      checkComponent('redditAnalyzer'),
      checkComponent('enhancedUI'),
      checkComponent('interactiveCharts'),
      checkComponent('themeExplorer')
    ]);
  }

  /**
   * Setup streaming integration
   */
  setupStreamingIntegration() {
    // Override the original streaming analyzer callbacks
    this.streamingAnalyzer.onProgress((data) => {
      this.handleProgressUpdate(data);
    });

    this.streamingAnalyzer.onComplete((data) => {
      this.handleAnalysisComplete(data);
    });

    this.streamingAnalyzer.onError((error) => {
      this.handleAnalysisError(error);
    });

    // Override the original display functions
    this.overrideDisplayFunctions();
  }

  /**
   * Override original display functions with enhanced versions
   */
  overrideDisplayFunctions() {
    // Override sentiment display
    this.streamingAnalyzer.displaySentimentData = (sentiment) => {
      this.displayEnhancedSentiment(sentiment);
    };

    // Override themes display
    this.streamingAnalyzer.displayThemes = (themes) => {
      this.displayEnhancedThemes(themes);
    };

    // Override comments display
    this.streamingAnalyzer.displaySampleComments = (type, comments) => {
      this.displayEnhancedComments(type, comments);
    };

    // Override sarcasm display
    this.streamingAnalyzer.displaySarcasmDetection = (sarcasmFlags) => {
      this.displayEnhancedSarcasm(sarcasmFlags);
    };

    // Override meme display
    this.streamingAnalyzer.displayMemeDetection = (memeDetection) => {
      this.displayEnhancedMemes(memeDetection);
    };
  }

  /**
   * Handle progress updates
   */
  handleProgressUpdate(data) {
    console.log('Progress update:', data);
    
    // Update progress indicators
    this.updateProgressIndicators(data);
    
    // Show progressive insights
    this.showProgressiveInsights(data);
  }

  /**
   * Handle analysis completion
   */
  handleAnalysisComplete(data) {
    console.log('Analysis complete:', data);
    
    this.currentAnalysis = data;
    
    // Initialize enhanced UI with complete data
    this.enhancedUI.initialize(data);
    
    // Initialize theme explorer
    this.themeExplorer.initialize(data.themes, data.emerging_topics, data.community_lingo);
    
    // Create all charts
    this.createAllCharts(data);
    
    // Setup interactive features
    this.setupInteractiveFeatures();
    
    // Hide original sections and show enhanced UI
    this.transitionToEnhancedUI();
  }

  /**
   * Handle analysis errors
   */
  handleAnalysisError(error) {
    console.error('Analysis error:', error);
    
    // Show enhanced error display
    this.showEnhancedError(error);
  }

  /**
   * Display enhanced sentiment
   */
  displayEnhancedSentiment(sentiment) {
    // Create sentiment wheel
    if (document.getElementById('sentiment-wheel')) {
      this.interactiveCharts.createSentimentWheel('sentiment-wheel', { overall_sentiment: sentiment });
    }
    
    // Update progress indicators
    this.updateSentimentProgress(sentiment);
  }

  /**
   * Display enhanced themes
   */
  displayEnhancedThemes(themes) {
    // Update theme explorer
    if (this.themeExplorer) {
      this.themeExplorer.initialize(themes, [], []);
    }
    
    // Create theme charts
    this.createThemeCharts(themes);
  }

  /**
   * Display enhanced comments
   */
  displayEnhancedComments(type, comments) {
    // Enhanced comment display with interaction
    this.createInteractiveComments(type, comments);
  }

  /**
   * Display enhanced sarcasm detection
   */
  displayEnhancedSarcasm(sarcasmFlags) {
    // Enhanced sarcasm display with analysis
    this.createSarcasmAnalysis(sarcasmFlags);
  }

  /**
   * Display enhanced memes
   */
  displayEnhancedMemes(memeDetection) {
    // Enhanced meme display with context
    this.createMemeAnalysis(memeDetection);
  }

  /**
   * Create all charts
   */
  createAllCharts(data) {
    // Overview charts
    this.createOverviewCharts(data);
    
    // Sentiment charts
    this.createSentimentCharts(data);
    
    // Analytics charts
    this.createAnalyticsCharts(data);
    
    // Quality charts
    this.createQualityCharts(data);
  }

  /**
   * Create overview charts
   */
  createOverviewCharts(data) {
    // Sentiment wheel
    if (document.getElementById('sentiment-wheel')) {
      this.interactiveCharts.createSentimentWheel('sentiment-wheel', data);
    }
  }

  /**
   * Create sentiment charts
   */
  createSentimentCharts(data) {
    // Sentiment by depth
    if (document.getElementById('sentiment-depth-chart')) {
      this.interactiveCharts.createSentimentDepthChart('sentiment-depth-chart', data);
    }
    
    // Sentiment over time
    if (document.getElementById('sentiment-time-chart')) {
      this.interactiveCharts.createSentimentTimeChart('sentiment-time-chart', data);
    }
    
    // Raw distribution
    if (document.getElementById('raw-distribution-chart')) {
      this.interactiveCharts.createRawDistributionChart('raw-distribution-chart', data);
    }
  }

  /**
   * Create analytics charts
   */
  createAnalyticsCharts(data) {
    // Demographics charts
    if (document.getElementById('age-distribution-chart')) {
      this.interactiveCharts.createAgeDistributionChart('age-distribution-chart', data);
    }
    
    if (document.getElementById('gender-distribution-chart')) {
      this.interactiveCharts.createGenderDistributionChart('gender-distribution-chart', data);
    }
    
    // Depth distribution
    if (document.getElementById('depth-distribution-chart')) {
      this.interactiveCharts.createDepthDistributionChart('depth-distribution-chart', data);
    }
  }

  /**
   * Create quality charts
   */
  createQualityCharts(data) {
    // Language distribution
    if (document.getElementById('language-distribution-chart')) {
      this.interactiveCharts.createLanguageDistributionChart('language-distribution-chart', data);
    }
    
    // Feedback trends
    if (document.getElementById('feedback-trends-chart')) {
      this.interactiveCharts.createFeedbackTrendsChart('feedback-trends-chart', data);
    }
  }

  /**
   * Create theme charts
   */
  createThemeCharts(themes) {
    // Theme sentiment distribution
    if (document.getElementById('theme-sentiment-chart')) {
      this.interactiveCharts.createThemeSentimentChart('theme-sentiment-chart', themes);
    }
  }

  /**
   * Setup interactive features
   */
  setupInteractiveFeatures() {
    // Setup tab switching
    this.setupTabSwitching();
    
    // Setup filters and search
    this.setupFiltersAndSearch();
    
    // Setup export functionality
    this.setupExportFunctionality();
    
    // Setup real-time updates
    this.setupRealTimeUpdates();
  }

  /**
   * Setup tab switching
   */
  setupTabSwitching() {
    // Tab switching is handled by the enhanced UI
    // Add any additional logic here
  }

  /**
   * Setup filters and search
   */
  setupFiltersAndSearch() {
    // Filters are handled by theme explorer
    // Add any additional logic here
  }

  /**
   * Setup export functionality
   */
  setupExportFunctionality() {
    // Add export buttons
    this.addExportButtons();
  }

  /**
   * Add export buttons
   */
  addExportButtons() {
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-container';
    exportContainer.innerHTML = `
      <div class="export-buttons">
        <button class="export-btn" onclick="window.enhancedStreaming.exportAnalysis('json')">
          <span class="btn-icon">📄</span>
          Export JSON
        </button>
        <button class="export-btn" onclick="window.enhancedStreaming.exportAnalysis('csv')">
          <span class="btn-icon">📊</span>
          Export CSV
        </button>
        <button class="export-btn" onclick="window.enhancedStreaming.exportCharts()">
          <span class="btn-icon">📈</span>
          Export Charts
        </button>
        <button class="export-btn" onclick="window.enhancedStreaming.exportReport()">
          <span class="btn-icon">📋</span>
          Export Report
        </button>
      </div>
    `;
    
    // Add to appropriate location
    const tabsContainer = document.querySelector('.analysis-nav-tabs');
    if (tabsContainer) {
      tabsContainer.parentElement.appendChild(exportContainer);
    }
  }

  /**
   * Setup real-time updates
   */
  setupRealTimeUpdates() {
    // Setup periodic updates if needed
    // This could be used for live monitoring
  }

  /**
   * Update progress indicators
   */
  updateProgressIndicators(data) {
    // Update progress bars, status indicators, etc.
    this.updateProgressBar(data);
    this.updateStatusIndicators(data);
  }

  /**
   * Update progress bar
   */
  updateProgressBar(data) {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && data.progress) {
      progressBar.style.width = `${data.progress}%`;
      progressBar.setAttribute('aria-valuenow', data.progress);
    }
  }

  /**
   * Update status indicators
   */
  updateStatusIndicators(data) {
    const statusElement = document.getElementById('analysis-progress');
    if (statusElement && data.message) {
      statusElement.textContent = data.message;
    }
  }

  /**
   * Show progressive insights
   */
  showProgressiveInsights(data) {
    // Show insights as they become available
    if (data.stage === 'sentiment_analyzed' && data.data) {
      this.displayEnhancedSentiment(data.data);
    }
  }

  /**
   * Transition to enhanced UI
   */
  transitionToEnhancedUI() {
    // Hide original sections
    document.querySelectorAll('.analysis-section').forEach(section => {
      section.style.display = 'none';
    });
    
    // Show enhanced UI
    const enhancedContainer = document.querySelector('.enhanced-analysis-container');
    if (enhancedContainer) {
      enhancedContainer.style.display = 'block';
    }
    
    // Add transition animation
    this.addTransitionAnimation();
  }

  /**
   * Add transition animation
   */
  addTransitionAnimation() {
    const container = document.querySelector('.enhanced-analysis-container');
    if (container) {
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        container.style.transition = 'all 0.5s ease-in-out';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      }, 100);
    }
  }

  /**
   * Show enhanced error
   */
  showEnhancedError(error) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'enhanced-error-container';
    errorContainer.innerHTML = `
      <div class="error-card">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h3>Analysis Error</h3>
          <p>${error.message}</p>
          <div class="error-actions">
            <button class="retry-btn" onclick="window.enhancedStreaming.retryAnalysis()">
              Retry Analysis
            </button>
            <button class="report-btn" onclick="window.enhancedStreaming.reportError()">
              Report Issue
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Replace progress container with error
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.innerHTML = '';
      progressContainer.appendChild(errorContainer);
    }
  }

  /**
   * Export analysis data
   */
  exportAnalysis(format) {
    if (!this.currentAnalysis) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reddit-analysis-${timestamp}`;
    
    switch (format) {
      case 'json':
        this.exportJSON(this.currentAnalysis, `${filename}.json`);
        break;
      case 'csv':
        this.exportCSV(this.currentAnalysis, `${filename}.csv`);
        break;
      default:
        console.warn('Unsupported export format:', format);
    }
  }

  /**
   * Export as JSON
   */
  exportJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadFile(blob, filename);
  }

  /**
   * Export as CSV
   */
  exportCSV(data, filename) {
    // Convert themes to CSV
    const themes = data.themes || [];
    const headers = ['Theme', 'Sentiment', 'Share', 'Confidence', 'Summary'];
    const rows = themes.map(theme => [
      theme.theme,
      theme.sentiment,
      theme.share,
      theme.confidence,
      theme.summary.replace(/,/g, ';') // Replace commas to avoid CSV issues
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadFile(blob, filename);
  }

  /**
   * Export all charts
   */
  exportCharts() {
    const charts = this.interactiveCharts.chartInstances;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    charts.forEach((chart, elementId) => {
      const filename = `chart-${elementId}-${timestamp}.png`;
      this.interactiveCharts.exportChart(elementId, filename);
    });
  }

  /**
   * Export comprehensive report
   */
  exportReport() {
    if (!this.currentAnalysis) return;
    
    const report = this.generateReport(this.currentAnalysis);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reddit-analysis-report-${timestamp}.html`;
    
    const blob = new Blob([report], { type: 'text/html' });
    this.downloadFile(blob, filename);
  }

  /**
   * Generate HTML report
   */
  generateReport(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reddit Sentiment Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; }
          .theme { background: #f9f9f9; padding: 15px; margin: 10px 0; }
          .comment { background: #f5f5f5; padding: 10px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reddit Sentiment Analysis Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Thread: ${data.thread_title}</p>
          <p>Subreddit: r/${data.subreddit}</p>
        </div>
        
        <div class="section">
          <h2>Overall Sentiment</h2>
          <div class="metric">Positive: ${data.overall_sentiment.positive}%</div>
          <div class="metric">Neutral: ${data.overall_sentiment.neutral}%</div>
          <div class="metric">Negative: ${data.overall_sentiment.negative}%</div>
          <div class="metric">Confidence: ${Math.round(data.overall_sentiment.confidence * 100)}%</div>
        </div>
        
        <div class="section">
          <h2>Key Themes</h2>
          ${data.themes.map(theme => `
            <div class="theme">
              <h3>${theme.theme}</h3>
              <p><strong>Sentiment:</strong> ${theme.sentiment}</p>
              <p><strong>Share:</strong> ${Math.round(theme.share * 100)}%</p>
              <p><strong>Summary:</strong> ${theme.summary}</p>
            </div>
          `).join('')}
        </div>
        
        <div class="section">
          <h2>Analysis Quality</h2>
          <div class="metric">Comments Analyzed: ${data.analyzed_count}</div>
          <div class="metric">Sample Rate: ${Math.round(data.analyzed_sample_rate * 100)}%</div>
          <div class="metric">Representativeness: ${data.sampling_quality.sample_representativeness}</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Download file
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Retry analysis
   */
  retryAnalysis() {
    // Retry the last analysis
    const form = document.getElementById('reddit-analysis-form');
    if (form) {
      form.dispatchEvent(new Event('submit'));
    }
  }

  /**
   * Report error
   */
  reportError() {
    // Open feedback form or email
    const feedbackUrl = 'https://www.senti-meter.com/reddit-sentiment-analyzer/feedback';
    window.open(feedbackUrl, '_blank');
  }

  /**
   * Setup progress tracking
   */
  setupProgressTracking() {
    // Track analysis progress for analytics
    this.progressSteps = [
      'fetching_comments',
      'comments_fetched',
      'sentiment_analyzed',
      'themes_identified',
      'sarcasm_detected',
      'complete'
    ];
    
    this.currentStep = 0;
    this.startTime = Date.now();
  }

  /**
   * Update progress step
   */
  updateProgressStep(stage) {
    const stepIndex = this.progressSteps.indexOf(stage);
    if (stepIndex > this.currentStep) {
      this.currentStep = stepIndex;
      this.trackProgress();
    }
  }

  /**
   * Track progress for analytics
   */
  trackProgress() {
    const elapsed = Date.now() - this.startTime;
    const currentStep = this.progressSteps[this.currentStep];
    
    console.log(`Progress: ${currentStep} at ${elapsed}ms`);
    
    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'analysis_progress', {
        step: currentStep,
        elapsed_time: elapsed
      });
    }
  }

  /**
   * Get integration statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      currentAnalysis: !!this.currentAnalysis,
      chartCount: this.interactiveCharts?.chartInstances?.size || 0,
      memoryUsage: this.interactiveCharts?.estimateMemoryUsage() || '0 KB'
    };
  }
}

// Initialize global enhanced streaming integration
window.enhancedStreaming = new EnhancedStreamingIntegration();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Enhanced streaming integration loaded');
});