/**
 * Theme Explorer Component
 * Advanced theme exploration and drilldown functionality
 */

class ThemeExplorer {
  constructor() {
    this.themes = [];
    this.filteredThemes = [];
    this.currentFilter = 'all';
    this.currentSort = 'share';
    this.searchTerm = '';
    this.selectedTheme = null;
    this.detailsModal = null;
    this.commentsModal = null;
    
    this.initializeEventListeners();
  }

  /**
   * Initialize theme explorer with data
   */
  initialize(themes, emergingTopics = [], communityLingo = []) {
    // Validate input data
    if (!Array.isArray(themes)) {
      console.warn('ThemeExplorer: themes must be an array, received:', typeof themes);
      themes = [];
    }
    
    if (!Array.isArray(emergingTopics)) {
      console.warn('ThemeExplorer: emergingTopics must be an array, received:', typeof emergingTopics);
      emergingTopics = [];
    }
    
    if (!Array.isArray(communityLingo)) {
      console.warn('ThemeExplorer: communityLingo must be an array, received:', typeof communityLingo);
      communityLingo = [];
    }
    
    // Validate individual theme objects
    const validThemes = themes.filter(theme => {
      if (!theme || typeof theme !== 'object') {
        console.warn('ThemeExplorer: Invalid theme object:', theme);
        return false;
      }
      return true;
    });
    
    // Prevent re-initialization with empty data if already initialized with data
    if (this.themes && this.themes.length > 0 && validThemes.length === 0) {
      console.log('ThemeExplorer: Skipping re-initialization with empty themes data');
      return;
    }
    
    this.themes = validThemes;
    this.emergingTopics = emergingTopics;
    this.communityLingo = communityLingo;
    this.filteredThemes = [...this.themes];
    
    console.log('ThemeExplorer initialized with:', {
      themesCount: this.themes.length,
      emergingTopicsCount: this.emergingTopics.length,
      communityLingoCount: this.communityLingo.length
    });
    
    this.createModals();
    this.setupInteractiveElements();
  }

  /**
   * Create modal containers
   */
  createModals() {
    // Theme details modal
    this.detailsModal = document.createElement('div');
    this.detailsModal.className = 'theme-modal-overlay';
    this.detailsModal.innerHTML = `
      <div class="theme-modal">
        <div class="theme-modal-header">
          <h3 id="theme-modal-title"></h3>
          <button class="theme-modal-close" onclick="window.themeExplorer.closeDetailsModal()">&times;</button>
        </div>
        <div class="theme-modal-content" id="theme-modal-content">
          <!-- Dynamic content will be inserted here -->
        </div>
      </div>
    `;
    document.body.appendChild(this.detailsModal);

    // Comments modal
    this.commentsModal = document.createElement('div');
    this.commentsModal.className = 'theme-modal-overlay';
    this.commentsModal.innerHTML = `
      <div class="theme-modal large">
        <div class="theme-modal-header">
          <h3 id="comments-modal-title"></h3>
          <button class="theme-modal-close" onclick="window.themeExplorer.closeCommentsModal()">&times;</button>
        </div>
        <div class="theme-modal-content" id="comments-modal-content">
          <!-- Dynamic content will be inserted here -->
        </div>
      </div>
    `;
    document.body.appendChild(this.commentsModal);
  }

  /**
   * Setup interactive elements
   */
  setupInteractiveElements() {
    // Theme filters
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.applyFilter(filter);
      });
    });

    // Search functionality
    this.createSearchInput();
    
    // Sort functionality
    this.createSortControls();
    
    // Theme cards interactions
    this.setupThemeCardInteractions();
  }

  /**
   * Create search input
   */
  createSearchInput() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'theme-search-container';
    searchContainer.innerHTML = `
      <div class="search-input-wrapper">
        <input type="text" id="theme-search" placeholder="Search themes..." class="theme-search-input">
        <button class="search-clear-btn" onclick="window.themeExplorer.clearSearch()">×</button>
      </div>
    `;

    const themesHeader = document.querySelector('#themes-tab .section-header');
    if (themesHeader) {
      themesHeader.appendChild(searchContainer);
    }

    // Add search event listener
    const searchInput = document.getElementById('theme-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.updateThemeDisplay();
      });
    }
  }

  /**
   * Create sort controls
   */
  createSortControls() {
    const sortContainer = document.createElement('div');
    sortContainer.className = 'theme-sort-container';
    sortContainer.innerHTML = `
      <label for="theme-sort">Sort by:</label>
      <select id="theme-sort" class="theme-sort-select">
        <option value="share">Share %</option>
        <option value="confidence">Confidence</option>
        <option value="alphabetical">Alphabetical</option>
        <option value="sentiment">Sentiment</option>
        <option value="volatility">Volatility</option>
      </select>
    `;

    const themeControls = document.querySelector('.theme-controls');
    if (themeControls) {
      themeControls.appendChild(sortContainer);
    }

    // Add sort event listener
    const sortSelect = document.getElementById('theme-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.updateThemeDisplay();
      });
    }
  }

  /**
   * Setup theme card interactions
   */
  setupThemeCardInteractions() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-card')) {
        const themeCard = e.target.closest('.theme-card');
        const themeId = themeCard.dataset.themeId;
        
        // Add selection highlighting
        document.querySelectorAll('.theme-card').forEach(card => {
          card.classList.remove('selected');
        });
        themeCard.classList.add('selected');
        
        this.selectedTheme = this.themes[themeId];
        this.updateThemeDetails(themeId);
      }
    });

    // Add hover effects
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('.theme-card')) {
        const themeCard = e.target.closest('.theme-card');
        this.showThemePreview(themeCard);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.theme-card')) {
        this.hideThemePreview();
      }
    });
  }

  /**
   * Apply filter to themes
   */
  applyFilter(filter) {
    this.currentFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    this.updateThemeDisplay();
  }

  /**
   * Update theme display based on filters, search, and sort
   */
  updateThemeDisplay() {
    // Filter themes
    this.filteredThemes = this.themes.filter(theme => {
      // Apply sentiment filter
      if (this.currentFilter !== 'all' && theme.sentiment !== this.currentFilter) {
        return false;
      }

      // Apply search filter
      if (this.searchTerm && !this.matchesSearch(theme, this.searchTerm)) {
        return false;
      }

      return true;
    });

    // Sort themes
    this.sortThemes();

    // Re-render theme grid
    this.renderThemeGrid();
  }

  /**
   * Check if theme matches search term
   */
  matchesSearch(theme, searchTerm) {
    const searchableText = [
      theme.theme,
      theme.summary,
      ...theme.top_keywords,
      ...theme.community_specific_terms
    ].join(' ').toLowerCase();

    return searchableText.includes(searchTerm);
  }

  /**
   * Sort themes based on current sort criteria
   */
  sortThemes() {
    this.filteredThemes.sort((a, b) => {
      switch (this.currentSort) {
        case 'share':
          return b.share - a.share;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'alphabetical':
          return a.theme.localeCompare(b.theme);
        case 'sentiment':
          const sentimentOrder = { positive: 2, neutral: 1, negative: 0 };
          return sentimentOrder[b.sentiment] - sentimentOrder[a.sentiment];
        case 'volatility':
          const volatilityOrder = { high: 2, medium: 1, low: 0 };
          return volatilityOrder[b.theme_volatility] - volatilityOrder[a.theme_volatility];
        default:
          return 0;
      }
    });
  }

  /**
   * Render theme grid with current filtered themes
   */
  renderThemeGrid() {
    const themesGrid = document.getElementById('themes-grid');
    if (!themesGrid) return;

    if (this.filteredThemes.length === 0) {
      themesGrid.innerHTML = `
        <div class="no-themes-message">
          <p>No themes match the current filters.</p>
          <button onclick="window.themeExplorer.clearSearch()" class="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      `;
      return;
    }

    themesGrid.innerHTML = this.filteredThemes.map((theme, index) => {
      const originalIndex = this.themes.indexOf(theme);
      
      return `
        <div class="theme-card ${theme.sentiment}" data-theme-id="${originalIndex}">
          <div class="theme-header">
            <h4>${theme.theme || 'Unknown Theme'}</h4>
            <div class="theme-meta">
              <span class="sentiment-badge ${theme.sentiment}">${theme.sentiment}</span>
              <span class="share-badge">${Math.round((theme.share || 0) * 100)}%</span>
              <span class="confidence-badge">${Math.round((theme.confidence || 0) * 100)}%</span>
            </div>
          </div>
          
          <div class="theme-summary">
            <p>${theme.summary || 'No summary available'}</p>
          </div>
          
          <div class="theme-keywords">
            <div class="keywords-label">Key Terms:</div>
            <div class="keywords-list">
              ${(theme.top_keywords || []).map(keyword => `
                <span class="keyword-tag">${keyword}</span>
              `).join('')}
            </div>
          </div>
          
          <div class="theme-stats">
            <div class="stat-item">
              <span class="stat-label">Comments</span>
              <span class="stat-value">${(theme.sample_comments || []).length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Volatility</span>
              <span class="stat-value volatility-indicator ${theme.theme_volatility || 'medium'}">
                ${theme.theme_volatility || 'medium'}
              </span>
            </div>
          </div>
          
          <div class="theme-actions">
            <button class="action-btn primary" onclick="window.themeExplorer.showThemeDetails(${originalIndex})">
              <span class="btn-icon">📊</span>
              View Details
            </button>
            <button class="action-btn secondary" onclick="window.themeExplorer.showThemeComments(${originalIndex})">
              <span class="btn-icon">💬</span>
              Sample Comments
            </button>
            <button class="action-btn tertiary" onclick="window.themeExplorer.analyzeTheme(${originalIndex})">
              <span class="btn-icon">🔍</span>
              Deep Analysis
            </button>
          </div>
          
          <div class="theme-recommendation">
            <strong>💡 Recommendation:</strong> ${theme.actionable_recommendation || 'No specific recommendation available'}
          </div>
        </div>
      `;
    }).join('');

    // Add animation to theme cards
    const themeCards = themesGrid.querySelectorAll('.theme-card');
    themeCards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add('fade-in');
    });
  }

  /**
   * Show theme preview on hover
   */
  showThemePreview(themeCard) {
    const themeId = themeCard.dataset.themeId;
    const theme = this.themes[themeId];
    
    if (!theme) return;
    
    // Create preview tooltip
    const preview = document.createElement('div');
    preview.className = 'theme-preview-tooltip';
    preview.innerHTML = `
      <div class="preview-header">
        <h4>${theme.theme || 'Unknown Theme'}</h4>
        <span class="preview-sentiment ${theme.sentiment}">${theme.sentiment}</span>
      </div>
      <div class="preview-stats">
        <div class="preview-stat">
          <span class="stat-label">Share:</span>
          <span class="stat-value">${Math.round((theme.share || 0) * 100)}%</span>
        </div>
        <div class="preview-stat">
          <span class="stat-label">Confidence:</span>
          <span class="stat-value">${Math.round((theme.confidence || 0) * 100)}%</span>
        </div>
      </div>
      <div class="preview-keywords">
        ${(theme.top_keywords || []).slice(0, 3).map(keyword => `
          <span class="preview-keyword">${keyword}</span>
        `).join('')}
      </div>
    `;
    
    document.body.appendChild(preview);
    
    // Position tooltip
    const rect = themeCard.getBoundingClientRect();
    preview.style.left = `${rect.right + 10}px`;
    preview.style.top = `${rect.top}px`;
    
    // Store reference for cleanup
    this.currentPreview = preview;
  }

  /**
   * Hide theme preview
   */
  hideThemePreview() {
    if (this.currentPreview) {
      this.currentPreview.remove();
      this.currentPreview = null;
    }
  }

  /**
   * Update theme details panel
   */
  updateThemeDetails(themeId) {
    const theme = this.themes[themeId];
    const detailsPanel = document.getElementById('theme-details-panel');
    
    if (!detailsPanel) {
      this.createDetailsPanel();
    }
    
    // Update details panel content
    // This would be implemented based on the specific layout
  }

  /**
   * Show theme details modal
   */
  showThemeDetails(themeIndex) {
    const theme = this.themes[themeIndex];
    if (!theme) return;
    
    const modalTitle = document.getElementById('theme-modal-title');
    const modalContent = document.getElementById('theme-modal-content');
    
    if (!modalTitle || !modalContent) return;
    
    modalTitle.textContent = theme.theme || 'Unknown Theme';
    modalContent.innerHTML = `
      <div class="theme-details-grid">
        <div class="theme-overview">
          <h4>📊 Overview</h4>
          <div class="overview-stats">
            <div class="stat-card">
              <div class="stat-icon">📈</div>
              <div class="stat-info">
                <div class="stat-value">${Math.round((theme.share || 0) * 100)}%</div>
                <div class="stat-label">Discussion Share</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <div class="stat-value">${Math.round((theme.confidence || 0) * 100)}%</div>
                <div class="stat-label">Confidence</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎭</div>
              <div class="stat-info">
                <div class="stat-value sentiment-${theme.sentiment}">${theme.sentiment}</div>
                <div class="stat-label">Sentiment</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📊</div>
              <div class="stat-info">
                <div class="stat-value volatility-${theme.theme_volatility || 'medium'}">${theme.theme_volatility || 'medium'}</div>
                <div class="stat-label">Volatility</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="theme-analysis">
          <h4>🔍 Analysis</h4>
          <div class="analysis-content">
            <div class="analysis-item">
              <strong>Summary:</strong>
              <p>${theme.summary || 'No summary available'}</p>
            </div>
            <div class="analysis-item">
              <strong>Key Keywords:</strong>
              <div class="keywords-cloud">
                ${(theme.top_keywords || []).map(keyword => `
                  <span class="keyword-bubble">${keyword}</span>
                `).join('')}
              </div>
            </div>
            <div class="analysis-item">
              <strong>Community Terms:</strong>
              <div class="community-terms">
                ${(theme.community_specific_terms || []).map(term => `
                  <span class="community-term">${term}</span>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
        
        <div class="theme-insights">
          <h4>💡 Insights</h4>
          <div class="insights-content">
            <div class="insight-card">
              <div class="insight-icon">🎯</div>
              <div class="insight-text">
                <strong>Actionable Recommendation:</strong>
                <p>${theme.actionable_recommendation || 'No specific recommendation available'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.detailsModal.style.display = 'flex';
  }

  /**
   * Show theme comments modal
   */
  showThemeComments(themeIndex) {
    const theme = this.themes[themeIndex];
    if (!theme) return;
    
    const modalTitle = document.getElementById('comments-modal-title');
    const modalContent = document.getElementById('comments-modal-content');
    
    if (!modalTitle || !modalContent) return;
    
    modalTitle.textContent = `Comments for: ${theme.theme || 'Unknown Theme'}`;
    
    const comments = theme.sample_comments || [];
    
    modalContent.innerHTML = `
      <div class="theme-comments-container">
        <div class="comments-header">
          <div class="comments-stats">
            <div class="stat-item">
              <span class="stat-value">${comments.length}</span>
              <span class="stat-label">Total Comments</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${Math.round((theme.share || 0) * 100)}%</span>
              <span class="stat-label">Discussion Share</span>
            </div>
            <div class="stat-item">
              <span class="stat-value sentiment-${theme.sentiment}">${theme.sentiment}</span>
              <span class="stat-label">Overall Sentiment</span>
            </div>
          </div>
          
          <div class="comments-filters">
            <button class="comment-filter-btn active" data-filter="all">All</button>
            <button class="comment-filter-btn" data-filter="positive">Positive</button>
            <button class="comment-filter-btn" data-filter="neutral">Neutral</button>
            <button class="comment-filter-btn" data-filter="negative">Negative</button>
            <button class="comment-filter-btn" data-filter="high-engagement">High Engagement</button>
          </div>
        </div>
        
        <div class="comments-list" id="theme-comments-list">
          ${comments.length === 0 ? 
            '<div class="no-comments-message">No sample comments available for this theme.</div>' :
            comments.map((comment, index) => `
              <div class="theme-comment-item ${comment.sentiment || 'neutral'}" data-sentiment="${comment.sentiment || 'neutral'}" data-upvotes="${comment.upvotes || 0}">
                <div class="comment-header">
                  <div class="comment-author">
                    <span class="author-name">👤 ${comment.author || 'Anonymous'}</span>
                    <span class="comment-timestamp">${comment.timestamp ? new Date(comment.timestamp).toLocaleDateString() : 'Unknown date'}</span>
                  </div>
                  <div class="comment-badges">
                    <span class="sentiment-badge ${comment.sentiment || 'neutral'}">${comment.sentiment || 'neutral'}</span>
                    <span class="confidence-badge">${Math.round((comment.confidence || 0) * 100)}%</span>
                    <span class="upvotes-badge">👍 ${comment.upvotes || 0}</span>
                    ${comment.comment_depth ? `<span class="depth-badge">Level ${comment.comment_depth}</span>` : ''}
                    ${(comment.controversial_score || 0) > 0.5 ? '<span class="controversial-badge">⚡ Controversial</span>' : ''}
                    ${comment.flagged_sarcasm ? '<span class="sarcasm-badge">😏 Sarcasm</span>' : ''}
                  </div>
                </div>
                
                <div class="comment-content">
                  <div class="comment-text">${comment.text || 'No text available'}</div>
                  ${comment.explainability ? `
                    <div class="comment-explanation">
                      <strong>Why this matters:</strong> ${comment.explainability}
                    </div>
                  ` : ''}
                </div>
                
                <div class="comment-actions">
                  ${comment.permalink ? `<a href="${comment.permalink}" target="_blank" class="comment-link">View on Reddit</a>` : ''}
                  <button class="analyze-comment-btn" onclick="window.themeExplorer.analyzeComment(${themeIndex}, ${index})">
                    Deep Analysis
                  </button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
    
    // Setup comment filters
    this.setupCommentFilters();
    
    this.commentsModal.style.display = 'flex';
  }

  /**
   * Setup comment filters
   */
  setupCommentFilters() {
    const filterButtons = document.querySelectorAll('.comment-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        
        // Update active button
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Filter comments
        this.filterComments(filter);
      });
    });
  }

  /**
   * Filter comments in modal
   */
  filterComments(filter) {
    const commentItems = document.querySelectorAll('.theme-comment-item');
    
    commentItems.forEach(item => {
      let show = true;
      
      switch (filter) {
        case 'all':
          show = true;
          break;
        case 'positive':
        case 'neutral':
        case 'negative':
          show = item.dataset.sentiment === filter;
          break;
        case 'high-engagement':
          show = parseInt(item.dataset.upvotes) > 10;
          break;
      }
      
      item.style.display = show ? 'block' : 'none';
    });
  }

  /**
   * Analyze individual comment
   */
  analyzeComment(themeIndex, commentIndex) {
    const theme = this.themes[themeIndex];
    if (!theme) return;
    
    const comments = theme.sample_comments || [];
    const comment = comments[commentIndex];
    if (!comment) return;
    
    // Create detailed comment analysis
    const analysis = {
      text: comment.text || 'No text available',
      sentiment: comment.sentiment || 'neutral',
      confidence: comment.confidence || 0,
      upvotes: comment.upvotes || 0,
      author: comment.author || 'Anonymous',
      depth: comment.comment_depth || 0,
      controversial: comment.controversial_score || 0,
      sarcasm: comment.flagged_sarcasm || false,
      explainability: comment.explainability || 'No explanation available'
    };
    
    // Show analysis in a toast or mini-modal
    this.showCommentAnalysis(analysis);
  }

  /**
   * Show comment analysis
   */
  showCommentAnalysis(analysis) {
    const toast = document.createElement('div');
    toast.className = 'comment-analysis-toast';
    toast.innerHTML = `
      <div class="toast-header">
        <h4>Comment Analysis</h4>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="toast-content">
        <div class="analysis-row">
          <span class="analysis-label">Sentiment:</span>
          <span class="analysis-value sentiment-${analysis.sentiment}">${analysis.sentiment}</span>
        </div>
        <div class="analysis-row">
          <span class="analysis-label">Confidence:</span>
          <span class="analysis-value">${Math.round(analysis.confidence * 100)}%</span>
        </div>
        <div class="analysis-row">
          <span class="analysis-label">Engagement:</span>
          <span class="analysis-value">${analysis.upvotes} upvotes</span>
        </div>
        <div class="analysis-row">
          <span class="analysis-label">Depth:</span>
          <span class="analysis-value">Level ${analysis.depth}</span>
        </div>
        ${analysis.controversial > 0.5 ? `
          <div class="analysis-row">
            <span class="analysis-label">Controversial:</span>
            <span class="analysis-value controversial">Yes (${Math.round(analysis.controversial * 100)}%)</span>
          </div>
        ` : ''}
        ${analysis.sarcasm ? `
          <div class="analysis-row">
            <span class="analysis-label">Sarcasm:</span>
            <span class="analysis-value sarcasm">Detected</span>
          </div>
        ` : ''}
        <div class="analysis-explanation">
          <strong>Explanation:</strong> ${analysis.explainability}
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 10000);
  }

  /**
   * Perform deep theme analysis
   */
  analyzeTheme(themeIndex) {
    const theme = this.themes[themeIndex];
    if (!theme) return;
    
    // Create comprehensive theme analysis
    const analysis = {
      theme: theme.theme || 'Unknown Theme',
      sentiment_distribution: this.calculateSentimentDistribution(theme),
      engagement_patterns: this.analyzeEngagementPatterns(theme),
      temporal_trends: this.analyzeTemporalTrends(theme),
      user_behavior: this.analyzeUserBehavior(theme),
      recommendations: this.generateRecommendations(theme)
    };
    
    // Show analysis in a dedicated modal or panel
    this.showThemeAnalysis(analysis);
  }

  /**
   * Calculate sentiment distribution for theme
   */
  calculateSentimentDistribution(theme) {
    const comments = theme.sample_comments || [];
    const distribution = { positive: 0, neutral: 0, negative: 0 };
    
    comments.forEach(comment => {
      const sentiment = comment.sentiment || 'neutral';
      distribution[sentiment]++;
    });
    
    const total = comments.length || 1;
    return {
      positive: Math.round((distribution.positive / total) * 100),
      neutral: Math.round((distribution.neutral / total) * 100),
      negative: Math.round((distribution.negative / total) * 100)
    };
  }

  /**
   * Analyze engagement patterns for theme
   */
  analyzeEngagementPatterns(theme) {
    const comments = theme.sample_comments || [];
    const upvotes = comments.map(comment => comment.upvotes || 0);
    
    const totalUpvotes = upvotes.reduce((sum, upvote) => sum + upvote, 0);
    const avgUpvotes = comments.length > 0 ? totalUpvotes / comments.length : 0;
    const maxUpvotes = Math.max(...upvotes, 0);
    
    return {
      total_engagement: totalUpvotes,
      average_engagement: Math.round(avgUpvotes),
      max_engagement: maxUpvotes,
      engagement_distribution: this.categorizeEngagement(upvotes)
    };
  }

  /**
   * Categorize engagement levels
   */
  categorizeEngagement(upvotes) {
    const categories = { low: 0, medium: 0, high: 0 };
    
    upvotes.forEach(upvote => {
      if (upvote < 5) categories.low++;
      else if (upvote < 20) categories.medium++;
      else categories.high++;
    });
    
    return categories;
  }

  /**
   * Analyze temporal trends for theme
   */
  analyzeTemporalTrends(theme) {
    const comments = theme.sample_comments || [];
    const timestamps = comments
      .map(comment => comment.timestamp)
      .filter(timestamp => timestamp)
      .map(timestamp => new Date(timestamp).getTime());
    
    if (timestamps.length === 0) {
      return {
        time_span: 'No temporal data available',
        trend_direction: 'unknown',
        activity_pattern: 'No activity data'
      };
    }
    
    const sortedTimestamps = timestamps.sort((a, b) => a - b);
    const timeSpan = sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0];
    
    return {
      time_span: this.formatTimeSpan(timeSpan),
      trend_direction: this.calculateTrendDirection(sortedTimestamps),
      activity_pattern: this.analyzeActivityPattern(sortedTimestamps)
    };
  }

  /**
   * Format time span in human readable format
   */
  formatTimeSpan(milliseconds) {
    const hours = Math.floor(milliseconds / 3600000);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  }

  /**
   * Calculate trend direction from timestamps
   */
  calculateTrendDirection(timestamps) {
    if (timestamps.length < 2) return 'stable';
    
    const recent = timestamps.slice(-Math.floor(timestamps.length / 2));
    const older = timestamps.slice(0, Math.floor(timestamps.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze activity pattern from timestamps
   */
  analyzeActivityPattern(timestamps) {
    if (timestamps.length === 0) return 'No activity data';
    
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 604800000;
    
    const last24h = timestamps.filter(t => t > oneDayAgo).length;
    const lastWeek = timestamps.filter(t => t > oneWeekAgo).length;
    
    if (last24h > 0) return 'Recent activity (last 24 hours)';
    if (lastWeek > 0) return 'Recent activity (last week)';
    return 'Historical activity';
  }

  /**
   * Analyze user behavior patterns
   */
  analyzeUserBehavior(theme) {
    const comments = theme.sample_comments || [];
    const authors = comments.map(comment => comment.author || 'Anonymous');
    const uniqueAuthors = [...new Set(authors)];
    
    return {
      total_participants: uniqueAuthors.length,
      average_comments_per_user: comments.length > 0 ? Math.round(comments.length / uniqueAuthors.length) : 0,
      most_active_user: this.findMostActiveUser(authors),
      participation_distribution: this.calculateParticipationDistribution(authors)
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(theme) {
    const recommendations = [];
    
    // Sentiment-based recommendations
    if (theme.sentiment === 'negative') {
      recommendations.push('Monitor for escalation and consider proactive engagement');
    } else if (theme.sentiment === 'positive') {
      recommendations.push('Leverage positive sentiment for community building');
    }
    
    // Engagement-based recommendations
    const comments = theme.sample_comments || [];
    if (comments.length > 10) {
      recommendations.push('High engagement theme - prioritize for content strategy');
    }
    
    // Share-based recommendations
    if ((theme.share || 0) > 0.3) {
      recommendations.push('Major discussion theme - consider dedicated response');
    }
    
    return recommendations.length > 0 ? recommendations : ['Continue monitoring for developments'];
  }

  /**
   * Show theme analysis
   */
  showThemeAnalysis(analysis) {
    // Implementation for showing detailed theme analysis
    console.log('Theme Analysis:', analysis);
  }

  /**
   * Get volatility explanation
   */
  getVolatilityExplanation(volatility) {
    const explanations = {
      high: 'rapid changes in sentiment and high unpredictability',
      medium: 'moderate fluctuations with some predictable patterns',
      low: 'stable sentiment with minimal fluctuation'
    };
    return explanations[volatility] || 'unknown volatility pattern';
  }

  /**
   * Clear search
   */
  clearSearch() {
    const searchInput = document.getElementById('theme-search');
    if (searchInput) {
      searchInput.value = '';
      this.searchTerm = '';
      this.updateThemeDisplay();
    }
  }

  /**
   * Close details modal
   */
  closeDetailsModal() {
    this.detailsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  /**
   * Close comments modal
   */
  closeCommentsModal() {
    this.commentsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Close modals on background click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('theme-modal-overlay')) {
        this.closeDetailsModal();
        this.closeCommentsModal();
      }
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDetailsModal();
        this.closeCommentsModal();
      }
    });
  }

  /**
   * Destroy theme explorer
   */
  destroy() {
    if (this.detailsModal) {
      this.detailsModal.remove();
    }
    if (this.commentsModal) {
      this.commentsModal.remove();
    }
    this.hideThemePreview();
  }

  /**
   * Find most active user
   */
  findMostActiveUser(authors) {
    if (authors.length === 0) return 'No users';
    
    const userCounts = {};
    authors.forEach(author => {
      userCounts[author] = (userCounts[author] || 0) + 1;
    });
    
    const mostActive = Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostActive ? `${mostActive[0]} (${mostActive[1]} comments)` : 'No users';
  }

  /**
   * Calculate participation distribution
   */
  calculateParticipationDistribution(authors) {
    if (authors.length === 0) return { single: 0, multiple: 0 };
    
    const userCounts = {};
    authors.forEach(author => {
      userCounts[author] = (userCounts[author] || 0) + 1;
    });
    
    const singleCommentUsers = Object.values(userCounts).filter(count => count === 1).length;
    const multipleCommentUsers = Object.values(userCounts).filter(count => count > 1).length;
    
    return { single: singleCommentUsers, multiple: multipleCommentUsers };
  }
}

// Initialize global theme explorer
window.themeExplorer = new ThemeExplorer();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Theme Explorer initialized');
});