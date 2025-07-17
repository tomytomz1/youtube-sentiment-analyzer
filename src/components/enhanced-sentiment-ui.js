/**
 * Enhanced Sentiment Analysis UI Components
 * Comprehensive visualization for all backend data fields
 */

class EnhancedSentimentUI {
  constructor() {
    this.analysisData = null;
    this.activeTab = 'overview';
    this.chartInstances = new Map();
    this.initializeEventListeners();
  }

  /**
   * Initialize the enhanced UI with analysis data
   */
  initialize(analysisData) {
    this.analysisData = analysisData;
    this.render();
  }

  /**
   * Main render method
   */
  render() {
    if (!this.analysisData) return;

    // Create main container
    const container = document.getElementById('analysis-results');
    if (!container) return;

    container.innerHTML = `
      <div class="enhanced-analysis-container">
        ${this.renderNavigationTabs()}
        ${this.renderTabContent()}
      </div>
    `;

    // Initialize interactive components
    this.initializeCharts();
    this.initializeInteractions();
  }

  /**
   * Render navigation tabs
   */
  renderNavigationTabs() {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: '📊' },
      { id: 'sentiment', label: 'Sentiment Analysis', icon: '🎭' },
      { id: 'themes', label: 'Themes & Topics', icon: '🏷️' },
      { id: 'comments', label: 'Notable Comments', icon: '💬' },
      { id: 'analytics', label: 'Advanced Analytics', icon: '📈' },
      { id: 'quality', label: 'Data Quality', icon: '🔍' },
      { id: 'insights', label: 'Community Insights', icon: '👥' }
    ];

    return `
      <div class="analysis-nav-tabs">
        ${tabs.map(tab => `
          <button 
            class="tab-button ${this.activeTab === tab.id ? 'active' : ''}" 
            data-tab="${tab.id}"
            onclick="window.enhancedUI.switchTab('${tab.id}')"
          >
            <span class="tab-icon">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render tab content
   */
  renderTabContent() {
    return `
      <div class="tab-content-container">
        <div class="tab-content ${this.activeTab === 'overview' ? 'active' : ''}" id="overview-tab">
          ${this.renderOverviewTab()}
        </div>
        <div class="tab-content ${this.activeTab === 'sentiment' ? 'active' : ''}" id="sentiment-tab">
          ${this.renderSentimentTab()}
        </div>
        <div class="tab-content ${this.activeTab === 'themes' ? 'active' : ''}" id="themes-tab">
          ${this.renderThemesTab()}
        </div>
        <div class="tab-content ${this.activeTab === 'comments' ? 'active' : ''}" id="comments-tab">
          ${this.renderCommentsTab()}
        </div>
        <div class="tab-content ${this.activeTab === 'analytics' ? 'active' : ''}" id="analytics-tab">
          ${this.renderAnalyticsTab()}
        </div>
        <div class="tab-content ${this.activeTab === 'quality' ? 'active' : ''}" id="quality-tab">
          ${this.renderQualityTab()}
        </div>
        <div class="tab-content ${this.activeTab === 'insights' ? 'active' : ''}" id="insights-tab">
          ${this.renderInsightsTab()}
        </div>
      </div>
    `;
  }

  /**
   * Overview Tab - Key metrics and highlights
   */
  renderOverviewTab() {
    const data = this.analysisData;
    const sentiment = data.overall_sentiment;
    const themes = data.themes.slice(0, 3);
    const riskAlerts = data.risk_alerts.slice(0, 2);

    return `
      <div class="overview-grid">
        <!-- Key Metrics Card -->
        <div class="metric-card primary">
          <div class="metric-header">
            <h3>📊 Analysis Overview</h3>
            <span class="timestamp">${new Date(data.analysis_timestamp).toLocaleString()}</span>
          </div>
          <div class="metric-stats">
            <div class="stat-item">
              <div class="stat-value">${data.analyzed_count}</div>
              <div class="stat-label">Comments Analyzed</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${(data.analyzed_sample_rate * 100).toFixed(1)}%</div>
              <div class="stat-label">Sample Rate</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${(sentiment.confidence * 100).toFixed(0)}%</div>
              <div class="stat-label">Confidence</div>
            </div>
          </div>
        </div>

        <!-- Sentiment Overview -->
        <div class="metric-card sentiment-overview">
          <div class="metric-header">
            <h3>🎭 Sentiment Breakdown</h3>
            <span class="volatility-badge ${sentiment.sentiment_volatility}">
              ${sentiment.sentiment_volatility} volatility
            </span>
          </div>
          <div class="sentiment-wheel" id="sentiment-wheel"></div>
          <div class="sentiment-legend">
            <div class="legend-item positive">
              <span class="legend-color"></span>
              <span>Positive ${sentiment.positive}%</span>
            </div>
            <div class="legend-item neutral">
              <span class="legend-color"></span>
              <span>Neutral ${sentiment.neutral}%</span>
            </div>
            <div class="legend-item negative">
              <span class="legend-color"></span>
              <span>Negative ${sentiment.negative}%</span>
            </div>
          </div>
        </div>

        <!-- Top Themes -->
        <div class="metric-card themes-preview">
          <div class="metric-header">
            <h3>🏷️ Top Discussion Themes</h3>
            <button class="view-all-btn" onclick="window.enhancedUI.switchTab('themes')">
              View All →
            </button>
          </div>
          <div class="themes-list">
            ${themes.map(theme => `
              <div class="theme-preview-item">
                <div class="theme-info">
                  <h4>${theme.theme}</h4>
                  <p>${theme.summary}</p>
                </div>
                <div class="theme-meta">
                  <span class="sentiment-badge ${theme.sentiment}">${theme.sentiment}</span>
                  <span class="share-badge">${Math.round(theme.share * 100)}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Risk Alerts -->
        ${riskAlerts.length > 0 ? `
          <div class="metric-card risk-alerts">
            <div class="metric-header">
              <h3>⚠️ Risk Alerts</h3>
              <span class="alert-count">${data.risk_alerts.length} alerts</span>
            </div>
            <div class="alerts-list">
              ${riskAlerts.map(alert => `
                <div class="alert-item ${alert.severity}">
                  <div class="alert-icon">
                    ${alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div class="alert-content">
                    <h4>${alert.alert_type}</h4>
                    <p>${alert.explanation}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Data Quality -->
        <div class="metric-card data-quality">
          <div class="metric-header">
            <h3>🔍 Data Quality</h3>
            <span class="quality-score ${data.sampling_quality.sample_representativeness}">
              ${data.sampling_quality.sample_representativeness}
            </span>
          </div>
          <div class="quality-metrics">
            <div class="quality-item">
              <span class="quality-label">Sample Size</span>
              <span class="quality-value">${data.sampling_quality.comments_analyzed}/${data.sampling_quality.total_comments_available}</span>
            </div>
            <div class="quality-item">
              <span class="quality-label">Sampling Method</span>
              <span class="quality-value">${data.sampling_quality.sampling_method}</span>
            </div>
            <div class="quality-item">
              <span class="quality-label">Primary Language</span>
              <span class="quality-value">${data.language_analysis.primary_language}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Sentiment Tab - Detailed sentiment analysis
   */
  renderSentimentTab() {
    const data = this.analysisData;
    const sentiment = data.overall_sentiment;
    const byDepth = data.sentiment_by_depth;
    const overTime = data.sentiment_over_time;

    return `
      <div class="sentiment-analysis-container">
        <!-- Overall Sentiment -->
        <div class="section-card">
          <div class="section-header">
            <h3>📊 Overall Sentiment Analysis</h3>
            <div class="confidence-indicator">
              <span class="confidence-label">Confidence:</span>
              <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${sentiment.confidence * 100}%"></div>
              </div>
              <span class="confidence-value">${(sentiment.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div class="sentiment-detailed">
            <div class="sentiment-bars-enhanced">
              <div class="sentiment-bar positive" style="width: ${sentiment.positive}%">
                <div class="bar-content">
                  <span class="bar-label">Positive</span>
                  <span class="bar-value">${sentiment.positive}%</span>
                </div>
                <div class="confidence-range">
                  CI: ${data.sampling_quality.confidence_interval.positive[0].toFixed(1)}%-${data.sampling_quality.confidence_interval.positive[1].toFixed(1)}%
                </div>
              </div>
              <div class="sentiment-bar neutral" style="width: ${sentiment.neutral}%">
                <div class="bar-content">
                  <span class="bar-label">Neutral</span>
                  <span class="bar-value">${sentiment.neutral}%</span>
                </div>
                <div class="confidence-range">
                  CI: ${data.sampling_quality.confidence_interval.neutral[0].toFixed(1)}%-${data.sampling_quality.confidence_interval.neutral[1].toFixed(1)}%
                </div>
              </div>
              <div class="sentiment-bar negative" style="width: ${sentiment.negative}%">
                <div class="bar-content">
                  <span class="bar-label">Negative</span>
                  <span class="bar-value">${sentiment.negative}%</span>
                </div>
                <div class="confidence-range">
                  CI: ${data.sampling_quality.confidence_interval.negative[0].toFixed(1)}%-${data.sampling_quality.confidence_interval.negative[1].toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div class="sentiment-insights">
              <div class="insight-item">
                <h4>💡 Key Insights</h4>
                <p>${sentiment.explainability}</p>
              </div>
              <div class="insight-item">
                <h4>📈 Volatility Analysis</h4>
                <p><strong>${sentiment.sentiment_volatility}</strong> volatility: ${sentiment.volatility_reason}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sentiment by Depth -->
        ${byDepth.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🔍 Sentiment by Discussion Depth</h3>
              <p class="section-description">How sentiment changes in reply threads</p>
            </div>
            <div class="depth-chart" id="sentiment-depth-chart"></div>
            <div class="depth-insights">
              ${byDepth.map(depth => `
                <div class="depth-item">
                  <div class="depth-level">Level ${depth.depth}</div>
                  <div class="depth-stats">
                    <div class="depth-sentiment">
                      <span class="positive">${depth.positive}%</span>
                      <span class="neutral">${depth.neutral}%</span>
                      <span class="negative">${depth.negative}%</span>
                    </div>
                    <div class="depth-count">${depth.comment_count} comments</div>
                  </div>
                  <div class="depth-note">${depth.note}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Sentiment Over Time -->
        ${overTime.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>⏱️ Sentiment Evolution Over Time</h3>
              <p class="section-description">How sentiment changed throughout the discussion</p>
            </div>
            <div class="time-chart" id="sentiment-time-chart"></div>
            <div class="time-insights">
              ${overTime.map(time => `
                <div class="time-item">
                  <div class="time-stamp">${new Date(time.timestamp).toLocaleString()}</div>
                  <div class="time-sentiment">
                    <span class="positive">${time.positive}%</span>
                    <span class="neutral">${time.neutral}%</span>
                    <span class="negative">${time.negative}%</span>
                  </div>
                  <div class="time-context">${time.event_context}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Raw Distribution -->
        <div class="section-card">
          <div class="section-header">
            <h3>📊 Raw Sentiment Distribution</h3>
            <p class="section-description">Detailed breakdown of sentiment scores</p>
          </div>
          <div class="raw-distribution">
            <div class="distribution-chart" id="raw-distribution-chart"></div>
            <div class="distribution-legend">
              ${Object.entries(sentiment.raw_distribution).map(([score, count]) => `
                <div class="legend-item">
                  <span class="legend-score">${score}</span>
                  <span class="legend-count">${count} comments</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Themes Tab - Detailed theme analysis
   */
  renderThemesTab() {
    const data = this.analysisData;
    const themes = data.themes;
    const emergingTopics = data.emerging_topics;

    return `
      <div class="themes-container">
        <!-- Main Themes -->
        <div class="section-card">
          <div class="section-header">
            <h3>🏷️ Discussion Themes</h3>
            <div class="theme-controls">
              <button class="filter-btn active" data-filter="all">All</button>
              <button class="filter-btn" data-filter="positive">Positive</button>
              <button class="filter-btn" data-filter="neutral">Neutral</button>
              <button class="filter-btn" data-filter="negative">Negative</button>
            </div>
          </div>
          
          <div class="themes-grid" id="themes-grid">
            ${themes.map((theme, index) => `
              <div class="theme-card ${theme.sentiment}" data-theme-id="${index}">
                <div class="theme-header">
                  <h4>${theme.theme}</h4>
                  <div class="theme-meta">
                    <span class="sentiment-badge ${theme.sentiment}">${theme.sentiment}</span>
                    <span class="share-badge">${Math.round(theme.share * 100)}%</span>
                    <span class="confidence-badge">${Math.round(theme.confidence * 100)}%</span>
                  </div>
                </div>
                
                <div class="theme-summary">
                  <p>${theme.summary}</p>
                </div>
                
                <div class="theme-keywords">
                  <div class="keywords-label">Key Terms:</div>
                  <div class="keywords-list">
                    ${theme.top_keywords.map(keyword => `
                      <span class="keyword-tag">${keyword}</span>
                    `).join('')}
                  </div>
                </div>
                
                <div class="theme-volatility">
                  <span class="volatility-indicator ${theme.theme_volatility}">
                    ${theme.theme_volatility} volatility
                  </span>
                </div>
                
                <div class="theme-actions">
                  <button class="action-btn" onclick="window.enhancedUI.showThemeDetails(${index})">
                    View Details
                  </button>
                  <button class="action-btn" onclick="window.enhancedUI.showThemeComments(${index})">
                    Sample Comments
                  </button>
                </div>
                
                <div class="theme-recommendation">
                  <strong>💡 Recommendation:</strong> ${theme.actionable_recommendation}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Emerging Topics -->
        ${emergingTopics.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🚀 Emerging Topics</h3>
              <p class="section-description">New themes gaining traction</p>
            </div>
            <div class="emerging-topics-list">
              ${emergingTopics.map(topic => `
                <div class="emerging-topic-item">
                  <div class="topic-header">
                    <h4>${topic.topic}</h4>
                    <div class="topic-meta">
                      <span class="sentiment-badge ${topic.sentiment}">${topic.sentiment}</span>
                      <span class="trend-badge ${topic.trend_direction}">${topic.trend_direction}</span>
                    </div>
                  </div>
                  <div class="topic-explanation">${topic.explanation}</div>
                  <div class="topic-sample">"${topic.sample_comment}"</div>
                  <div class="topic-volatility">
                    <span class="volatility-indicator ${topic.topic_volatility}">
                      ${topic.topic_volatility} volatility
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Community Lingo -->
        ${data.community_lingo.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🗣️ Community Language</h3>
              <p class="section-description">Subreddit-specific terms and expressions</p>
            </div>
            <div class="lingo-grid">
              ${data.community_lingo.map(lingo => `
                <div class="lingo-item">
                  <div class="lingo-term">${lingo.term}</div>
                  <div class="lingo-frequency">${lingo.frequency} uses</div>
                  <div class="lingo-context">${lingo.context}</div>
                  <div class="lingo-specificity">${lingo.subreddit_specificity}</div>
                  <div class="lingo-explanation">${lingo.explanation}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Comments Tab - Notable comments analysis
   */
  renderCommentsTab() {
    const data = this.analysisData;
    const topPositive = data.top_positive_comments;
    const topNegative = data.top_negative_comments;
    const sarcasm = data.sarcasm_flags;
    const memes = data.meme_detection;
    const controversial = data.controversial_comments;

    return `
      <div class="comments-container">
        <!-- Top Comments -->
        <div class="comments-section">
          <div class="section-card">
            <div class="section-header">
              <h3>⭐ Most Impactful Comments</h3>
              <div class="comment-type-tabs">
                <button class="comment-tab active" data-type="positive">Positive</button>
                <button class="comment-tab" data-type="negative">Negative</button>
                <button class="comment-tab" data-type="controversial">Controversial</button>
              </div>
            </div>
            
            <div class="comment-content active" id="positive-comments">
              ${topPositive.map(comment => `
                <div class="comment-item positive">
                  <div class="comment-header">
                    <div class="comment-author">👤 ${comment.author}</div>
                    <div class="comment-meta">
                      <span class="upvotes">👍 ${comment.upvotes}</span>
                      <span class="confidence">🎯 ${Math.round(comment.confidence * 100)}%</span>
                      <span class="controversy">⚡ ${comment.controversial_score}</span>
                    </div>
                  </div>
                  <div class="comment-text">${comment.text}</div>
                  <div class="comment-explanation">
                    <strong>Why this matters:</strong> ${comment.explainability}
                  </div>
                  <div class="comment-actions">
                    <a href="${comment.permalink}" target="_blank" class="permalink-btn">View on Reddit</a>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="comment-content" id="negative-comments">
              ${topNegative.map(comment => `
                <div class="comment-item negative">
                  <div class="comment-header">
                    <div class="comment-author">👤 ${comment.author}</div>
                    <div class="comment-meta">
                      <span class="upvotes">👍 ${comment.upvotes}</span>
                      <span class="confidence">🎯 ${Math.round(comment.confidence * 100)}%</span>
                      <span class="controversy">⚡ ${comment.controversial_score}</span>
                    </div>
                  </div>
                  <div class="comment-text">${comment.text}</div>
                  <div class="comment-explanation">
                    <strong>Why this matters:</strong> ${comment.explainability}
                  </div>
                  <div class="comment-actions">
                    <a href="${comment.permalink}" target="_blank" class="permalink-btn">View on Reddit</a>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="comment-content" id="controversial-comments">
              ${controversial.map(comment => `
                <div class="comment-item controversial">
                  <div class="comment-header">
                    <div class="comment-author">👤 ${comment.author}</div>
                    <div class="comment-meta">
                      <span class="upvotes">👍 ${comment.upvotes}</span>
                      <span class="controversy">⚡ ${comment.controversial_score}</span>
                    </div>
                  </div>
                  <div class="comment-text">${comment.text}</div>
                  <div class="comment-explanation">
                    <strong>Why controversial:</strong> ${comment.controversy_reason}
                  </div>
                  <div class="comment-actions">
                    <a href="${comment.permalink}" target="_blank" class="permalink-btn">View on Reddit</a>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Sarcasm Detection -->
        ${sarcasm.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>😏 Sarcasm Detection</h3>
              <p class="section-description">Comments flagged as potentially sarcastic</p>
            </div>
            <div class="sarcasm-list">
              ${sarcasm.map(item => `
                <div class="sarcasm-item">
                  <div class="sarcasm-header">
                    <div class="sarcasm-author">👤 ${item.author}</div>
                    <div class="sarcasm-meta">
                      <span class="confidence">🎯 ${Math.round(item.confidence * 100)}%</span>
                      <span class="upvotes">👍 ${item.upvotes}</span>
                    </div>
                  </div>
                  <div class="sarcasm-text">${item.text}</div>
                  <div class="sarcasm-reason">
                    <strong>Detection reason:</strong> ${item.reason}
                  </div>
                  <div class="sarcasm-details">
                    <div class="actual-sentiment">
                      <span>Actual sentiment: <strong>${item.actual_sentiment}</strong></span>
                    </div>
                    <div class="sarcasm-indicators">
                      <span>Indicators:</span>
                      ${item.sarcasm_indicators.map(indicator => `
                        <span class="indicator-tag">${indicator}</span>
                      `).join('')}
                    </div>
                  </div>
                  <div class="community-calibration">
                    <strong>Community context:</strong> ${item.community_calibration}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Meme Detection -->
        ${memes.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🎭 Meme Detection</h3>
              <p class="section-description">Identified memes and formats</p>
            </div>
            <div class="memes-list">
              ${memes.map(meme => `
                <div class="meme-item">
                  <div class="meme-header">
                    <div class="meme-author">👤 ${meme.author}</div>
                    <div class="meme-meta">
                      <span class="confidence">🎯 ${Math.round(meme.confidence * 100)}%</span>
                      <span class="upvotes">👍 ${meme.upvotes}</span>
                    </div>
                  </div>
                  <div class="meme-text">${meme.text}</div>
                  <div class="meme-format">
                    <strong>Format:</strong> ${meme.meme_format}
                  </div>
                  <div class="meme-indicators">
                    <span>Indicators:</span>
                    ${meme.meme_indicators.map(indicator => `
                      <span class="indicator-tag">${indicator}</span>
                    `).join('')}
                  </div>
                  <div class="sentiment-impact">
                    <strong>Sentiment impact:</strong> ${meme.sentiment_impact}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Analytics Tab - Advanced analytics and demographics
   */
  renderAnalyticsTab() {
    const data = this.analysisData;
    const demographics = data.demographic_insights;
    const technical = data.technical_metrics;
    const replyChains = data.reply_chain_depth_breakdown;

    return `
      <div class="analytics-container">
        <!-- Demographics -->
        <div class="section-card">
          <div class="section-header">
            <h3>👥 Demographic Analysis</h3>
            <div class="confidence-indicator">
              <span class="confidence-label">Confidence:</span>
              <span class="confidence-value">${Math.round(demographics.confidence * 100)}%</span>
            </div>
          </div>
          
          <div class="demographics-content">
            <div class="demo-charts">
              <div class="chart-container">
                <h4>Age Distribution</h4>
                <div class="age-chart" id="age-distribution-chart"></div>
                <div class="age-legend">
                  ${Object.entries(demographics.age_groups).map(([group, percentage]) => `
                    <div class="legend-item">
                      <span class="legend-color" data-group="${group}"></span>
                      <span>${group}: ${percentage}%</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div class="chart-container">
                <h4>Gender Distribution</h4>
                <div class="gender-chart" id="gender-distribution-chart"></div>
                <div class="gender-legend">
                  ${Object.entries(demographics.gender_distribution).map(([gender, percentage]) => `
                    <div class="legend-item">
                      <span class="legend-color" data-gender="${gender}"></span>
                      <span>${gender}: ${percentage}%</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="demo-insights">
              <div class="insight-card">
                <h4>📊 Methodology</h4>
                <p>${demographics.methodology}</p>
              </div>
              <div class="insight-card">
                <h4>⚠️ Limitations</h4>
                <p>${demographics.limitations}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Technical Metrics -->
        <div class="section-card">
          <div class="section-header">
            <h3>⚙️ Technical Analysis</h3>
            <div class="performance-badge ${technical.performance_metrics.analysis_quality}">
              ${technical.performance_metrics.analysis_quality} quality
            </div>
          </div>
          
          <div class="technical-metrics">
            <div class="metrics-grid">
              <div class="metric-item">
                <div class="metric-label">Processing Time</div>
                <div class="metric-value">${technical.processing_stats.total_processing_time}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Tokens Analyzed</div>
                <div class="metric-value">${technical.processing_stats.tokens_analyzed.toLocaleString()}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Confidence Score</div>
                <div class="metric-value">${Math.round(technical.processing_stats.confidence_score * 100)}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">API Calls</div>
                <div class="metric-value">${technical.processing_stats.api_calls}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Cache Hit Rate</div>
                <div class="metric-value">${Math.round(technical.processing_stats.cache_hit_rate * 100)}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value">${technical.processing_stats.memory_usage}</div>
              </div>
            </div>
            
            <div class="processing-steps">
              <h4>Processing Pipeline</h4>
              <div class="steps-list">
                ${technical.processing_stats.processing_steps.map((step, index) => `
                  <div class="step-item">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-name">${step}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Reply Chain Analysis -->
        <div class="section-card">
          <div class="section-header">
            <h3>🔗 Reply Chain Analysis</h3>
            <div class="chain-stats">
              <span>Max Depth: ${replyChains.max_depth_analyzed}</span>
              <span>Total Chains: ${replyChains.total_reply_chains}</span>
            </div>
          </div>
          
          <div class="reply-chain-content">
            <div class="depth-distribution">
              <h4>Distribution by Depth</h4>
              <div class="depth-chart" id="depth-distribution-chart"></div>
            </div>
            
            <div class="chain-insights">
              <div class="insight-item">
                <h4>🔍 Patterns</h4>
                <p>${replyChains.reply_chain_sentiment_patterns}</p>
              </div>
              <div class="insight-item">
                <h4>⚠️ Context Impact</h4>
                <p>${replyChains.missing_context_impact}</p>
              </div>
              <div class="insight-item">
                <h4>📊 Analysis Coverage</h4>
                <p>${replyChains.depth_analysis_warning}</p>
              </div>
            </div>
            
            ${replyChains.deep_chain_outliers.length > 0 ? `
              <div class="outliers-section">
                <h4>🎯 Notable Deep Comments</h4>
                <div class="outliers-list">
                  ${replyChains.deep_chain_outliers.map(outlier => `
                    <div class="outlier-item">
                      <div class="outlier-depth">Depth ${outlier.depth}</div>
                      <div class="outlier-text">${outlier.text}</div>
                      <div class="outlier-meta">
                        <span class="sentiment ${outlier.sentiment}">${outlier.sentiment}</span>
                        <span class="upvotes">${outlier.upvotes} upvotes</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Quality Tab - Data quality and reliability metrics
   */
  renderQualityTab() {
    const data = this.analysisData;
    const sampling = data.sampling_quality;
    const freshness = data.data_freshness;
    const language = data.language_analysis;
    const modelPerf = data.model_performance;

    return `
      <div class="quality-container">
        <!-- Sampling Quality -->
        <div class="section-card">
          <div class="section-header">
            <h3>📊 Sampling Quality</h3>
            <div class="quality-score ${sampling.sample_representativeness}">
              ${sampling.sample_representativeness} representativeness
            </div>
          </div>
          
          <div class="sampling-metrics">
            <div class="sample-stats">
              <div class="stat-item">
                <div class="stat-label">Total Available</div>
                <div class="stat-value">${sampling.total_comments_available.toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Analyzed</div>
                <div class="stat-value">${sampling.comments_analyzed.toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Sample Rate</div>
                <div class="stat-value">${((sampling.comments_analyzed / sampling.total_comments_available) * 100).toFixed(1)}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Method</div>
                <div class="stat-value">${sampling.sampling_method}</div>
              </div>
            </div>
            
            <div class="confidence-intervals">
              <h4>Confidence Intervals (95%)</h4>
              <div class="ci-list">
                <div class="ci-item positive">
                  <span class="ci-label">Positive</span>
                  <span class="ci-range">${sampling.confidence_interval.positive[0].toFixed(1)}% - ${sampling.confidence_interval.positive[1].toFixed(1)}%</span>
                </div>
                <div class="ci-item neutral">
                  <span class="ci-label">Neutral</span>
                  <span class="ci-range">${sampling.confidence_interval.neutral[0].toFixed(1)}% - ${sampling.confidence_interval.neutral[1].toFixed(1)}%</span>
                </div>
                <div class="ci-item negative">
                  <span class="ci-label">Negative</span>
                  <span class="ci-range">${sampling.confidence_interval.negative[0].toFixed(1)}% - ${sampling.confidence_interval.negative[1].toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            <div class="sampling-warnings">
              <h4>⚠️ Sampling Considerations</h4>
              <ul>
                ${sampling.sampling_warnings.map(warning => `
                  <li>${warning}</li>
                `).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Data Freshness -->
        <div class="section-card">
          <div class="section-header">
            <h3>⏰ Data Freshness</h3>
            <div class="freshness-timestamp">
              Last fetch: ${new Date(freshness.last_reddit_fetch).toLocaleString()}
            </div>
          </div>
          
          <div class="freshness-metrics">
            <div class="freshness-stats">
              <div class="freshness-item">
                <div class="freshness-label">Thread Age</div>
                <div class="freshness-value">${freshness.time_since_thread_created}</div>
              </div>
              <div class="freshness-item">
                <div class="freshness-label">Last Comment</div>
                <div class="freshness-value">${freshness.time_since_last_comment}</div>
              </div>
            </div>
            
            <div class="freshness-warning">
              <h4>📋 Freshness Assessment</h4>
              <p>${freshness.freshness_warning}</p>
            </div>
          </div>
        </div>

        <!-- Language Analysis -->
        <div class="section-card">
          <div class="section-header">
            <h3>🌐 Language Analysis</h3>
            <div class="language-confidence">
              Confidence: ${Math.round(language.language_detection_confidence * 100)}%
            </div>
          </div>
          
          <div class="language-content">
            <div class="language-distribution">
              <h4>Language Distribution</h4>
              <div class="language-chart" id="language-distribution-chart"></div>
              <div class="language-legend">
                ${Object.entries(language.language_distribution).map(([lang, percentage]) => `
                  <div class="legend-item">
                    <span class="legend-color" data-lang="${lang}"></span>
                    <span>${lang}: ${percentage}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="language-insights">
              <div class="insight-item">
                <h4>🗣️ Primary Language</h4>
                <p>${language.primary_language}</p>
              </div>
              <div class="insight-item">
                <h4>📝 Translation Notes</h4>
                <p>${language.translation_notes}</p>
              </div>
            </div>
            
            ${language.non_english_comments.length > 0 ? `
              <div class="non-english-section">
                <h4>🌍 Non-English Comments</h4>
                <div class="non-english-list">
                  ${language.non_english_comments.map(comment => `
                    <div class="non-english-item">
                      <div class="comment-lang">${comment.language}</div>
                      <div class="comment-text">${comment.comment}</div>
                      <div class="comment-sentiment">${comment.sentiment}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Model Performance -->
        <div class="section-card">
          <div class="section-header">
            <h3>🤖 Model Performance</h3>
            <div class="model-version">
              Last updated: ${new Date(data.last_model_update).toLocaleString()}
            </div>
          </div>
          
          <div class="model-metrics">
            <div class="performance-grid">
              <div class="perf-item">
                <div class="perf-label">Sarcasm Detection</div>
                <div class="perf-value">${Math.round(modelPerf.sarcasm_detection_accuracy * 100)}%</div>
                <div class="perf-bar">
                  <div class="perf-fill" style="width: ${modelPerf.sarcasm_detection_accuracy * 100}%"></div>
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">Sentiment Confidence</div>
                <div class="perf-value">${Math.round(modelPerf.sentiment_confidence_avg * 100)}%</div>
                <div class="perf-bar">
                  <div class="perf-fill" style="width: ${modelPerf.sentiment_confidence_avg * 100}%"></div>
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">Community Lingo</div>
                <div class="perf-value">${Math.round(modelPerf.community_lingo_recognition * 100)}%</div>
                <div class="perf-bar">
                  <div class="perf-fill" style="width: ${modelPerf.community_lingo_recognition * 100}%"></div>
                </div>
              </div>
            </div>
            
            <div class="quality-warnings">
              <h4>📋 Quality Warnings</h4>
              <ul>
                ${data.quality_warnings.map(warning => `
                  <li>${warning}</li>
                `).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Insights Tab - Community insights and behavioral patterns
   */
  renderInsightsTab() {
    const data = this.analysisData;
    const drama = data.drama_indicators;
    const brigading = data.brigading_indicators;
    const modActions = data.mod_actions_detected;
    const feedback = data.user_feedback_stats;

    return `
      <div class="insights-container">
        <!-- Drama Indicators -->
        ${drama.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🎭 Drama Indicators</h3>
              <div class="drama-count">${drama.length} indicators detected</div>
            </div>
            <div class="drama-list">
              ${drama.map(indicator => `
                <div class="drama-item ${indicator.severity}">
                  <div class="drama-header">
                    <div class="drama-type">${indicator.indicator}</div>
                    <div class="drama-severity ${indicator.severity}">
                      ${indicator.severity} severity
                    </div>
                  </div>
                  <div class="drama-stats">
                    <span>Affected comments: ${indicator.affected_comments}</span>
                  </div>
                  <div class="drama-explanation">
                    ${indicator.explanation}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Brigading Indicators -->
        ${brigading.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🚨 Brigading Indicators</h3>
              <div class="brigading-count">${brigading.length} patterns detected</div>
            </div>
            <div class="brigading-list">
              ${brigading.map(indicator => `
                <div class="brigading-item ${indicator.severity}">
                  <div class="brigading-header">
                    <div class="brigading-pattern">${indicator.pattern}</div>
                    <div class="brigading-severity ${indicator.severity}">
                      ${indicator.severity} severity
                    </div>
                  </div>
                  <div class="brigading-explanation">
                    ${indicator.explanation}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Moderator Actions -->
        ${modActions.length > 0 ? `
          <div class="section-card">
            <div class="section-header">
              <h3>🛡️ Moderator Actions</h3>
              <div class="mod-count">${modActions.length} actions detected</div>
            </div>
            <div class="mod-actions-list">
              ${modActions.map(action => `
                <div class="mod-action-item">
                  <div class="mod-action-header">
                    <div class="mod-action-type">${action.action_type}</div>
                    <div class="mod-action-time">${new Date(action.timestamp).toLocaleString()}</div>
                  </div>
                  <div class="mod-action-details">
                    <div class="mod-action-target">${action.target}</div>
                    <div class="mod-action-reason">${action.reason}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- User Feedback Stats -->
        <div class="section-card">
          <div class="section-header">
            <h3>📊 User Feedback Analysis</h3>
            <div class="feedback-score ${feedback.feedback_quality_score.replace(/\s+/g, '_').toLowerCase()}">
              ${feedback.feedback_quality_score}
            </div>
          </div>
          
          <div class="feedback-content">
            <div class="feedback-stats">
              <div class="stat-item">
                <div class="stat-label">Total Feedback</div>
                <div class="stat-value">${feedback.total_feedback_received}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Disputed Outputs</div>
                <div class="stat-value">${feedback.disputed_outputs_percentage.toFixed(1)}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Corrections Accepted</div>
                <div class="stat-value">${feedback.corrections_accepted_percentage.toFixed(1)}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Moderator Acceptance</div>
                <div class="stat-value">${feedback.moderator_acceptance_rate.toFixed(1)}%</div>
              </div>
            </div>
            
            <div class="feedback-trends">
              <h4>Feedback Trends</h4>
              <div class="trends-chart" id="feedback-trends-chart"></div>
            </div>
            
            <div class="satisfaction-trend">
              <h4>📈 Satisfaction Trend</h4>
              <p>${feedback.user_satisfaction_trend}</p>
            </div>
          </div>
        </div>

        <!-- Privacy & Compliance -->
        <div class="section-card">
          <div class="section-header">
            <h3>🔒 Privacy & Compliance</h3>
            <div class="privacy-status">
              ${data.privacy_warnings.length} warnings
            </div>
          </div>
          
          <div class="privacy-content">
            <div class="privacy-warnings">
              ${data.privacy_warnings.map(warning => `
                <div class="privacy-warning ${warning.severity}">
                  <div class="warning-header">
                    <div class="warning-type">${warning.warning_type}</div>
                    <div class="warning-severity ${warning.severity}">
                      ${warning.severity}
                    </div>
                  </div>
                  <div class="warning-description">
                    ${warning.description}
                  </div>
                  <div class="compliance-status">
                    Status: <span class="${warning.compliance_status}">${warning.compliance_status}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="data-sources">
              <h4>📋 Data Sources</h4>
              <div class="sources-list">
                ${data.data_sources.map(source => `
                  <span class="source-tag">${source}</span>
                `).join('')}
              </div>
            </div>
            
            <div class="dispute-resolution">
              <h4>⚖️ Dispute Resolution</h4>
              <div class="dispute-info">
                <div class="dispute-deadline">
                  Appeal deadline: ${new Date(data.dispute_resolution.appeal_deadline).toLocaleString()}
                </div>
                <div class="dispute-grounds">
                  Grounds: ${data.dispute_resolution.dispute_grounds.join(', ')}
                </div>
                <div class="dispute-actions">
                  <a href="${data.dispute_resolution.dispute_url}" class="dispute-link">File Dispute</a>
                  <a href="${data.user_feedback_url}" class="feedback-link">Provide Feedback</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Switch between tabs
   */
  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
    
    // Initialize tab-specific components
    this.initializeTabSpecificComponents(tabId);
  }

  /**
   * Initialize tab-specific interactive components
   */
  initializeTabSpecificComponents(tabId) {
    switch (tabId) {
      case 'overview':
        this.initializeSentimentWheel();
        break;
      case 'sentiment':
        this.initializeSentimentCharts();
        break;
      case 'themes':
        this.initializeThemeFilters();
        break;
      case 'comments':
        this.initializeCommentTabs();
        break;
      case 'analytics':
        this.initializeAnalyticsCharts();
        break;
      case 'quality':
        this.initializeQualityCharts();
        break;
      case 'insights':
        this.initializeInsightCharts();
        break;
    }
  }

  /**
   * Initialize interactive charts and components
   */
  initializeCharts() {
    // This will be implemented with Chart.js or similar
    console.log('Initializing charts...');
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Global event listeners will be added here
    console.log('Initializing event listeners...');
  }

  /**
   * Initialize interactions (filters, search, etc.)
   */
  initializeInteractions() {
    // Interactive features will be implemented here
    console.log('Initializing interactions...');
  }

  /**
   * Initialize sentiment wheel chart
   */
  initializeSentimentWheel() {
    // Implementation for sentiment wheel visualization
    console.log('Initializing sentiment wheel...');
  }

  /**
   * Initialize sentiment analysis charts
   */
  initializeSentimentCharts() {
    // Implementation for detailed sentiment charts
    console.log('Initializing sentiment charts...');
  }

  /**
   * Initialize theme filters
   */
  initializeThemeFilters() {
    // Implementation for theme filtering
    console.log('Initializing theme filters...');
  }

  /**
   * Initialize comment tabs
   */
  initializeCommentTabs() {
    // Implementation for comment tab switching
    console.log('Initializing comment tabs...');
  }

  /**
   * Initialize analytics charts
   */
  initializeAnalyticsCharts() {
    // Implementation for analytics visualizations
    console.log('Initializing analytics charts...');
  }

  /**
   * Initialize quality charts
   */
  initializeQualityCharts() {
    // Implementation for quality visualizations
    console.log('Initializing quality charts...');
  }

  /**
   * Initialize insight charts
   */
  initializeInsightCharts() {
    // Implementation for insight visualizations
    console.log('Initializing insight charts...');
  }

  /**
   * Show theme details modal
   */
  showThemeDetails(themeIndex) {
    const theme = this.analysisData.themes[themeIndex];
    // Implementation for theme details modal
    console.log('Showing theme details for:', theme.theme);
  }

  /**
   * Show theme comments modal
   */
  showThemeComments(themeIndex) {
    const theme = this.analysisData.themes[themeIndex];
    // Implementation for theme comments modal
    console.log('Showing theme comments for:', theme.theme);
  }
}

// Initialize global instance
window.enhancedUI = new EnhancedSentimentUI();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Enhanced Sentiment UI loaded');
});