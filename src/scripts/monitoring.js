// Advanced monitoring and analytics system
export class MonitoringManager {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];
    this.metrics = {
      pageViews: 0,
      analyses: 0,
      errors: 0,
      shares: 0,
      averageAnalysisTime: 0,
      userEngagement: 0
    };
    this.performanceObserver = null;
    this.mutationObserver = null;
    
    this.init();
  }

  // Initialize monitoring system
  init() {
    this.trackPageView();
    this.setupPerformanceMonitoring();
    this.setupErrorMonitoring();
    this.setupUserEngagementTracking();
    this.setupAnalyticsTracking();
    this.setupRealTimeMetrics();
  }

  // Generate unique session ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }

  // Track page view
  trackPageView() {
    this.metrics.pageViews++;
    this.trackEvent('page_view', {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }

  // Track custom events
  trackEvent(eventName, data = {}) {
    const event = {
      id: this.generateEventId(),
      name: eventName,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href
    };
    
    this.events.push(event);
    this.sendAnalytics(event);
    
    // Store in localStorage for persistence
    this.persistEvent(event);
  }

  // Generate unique event ID
  generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    // Track Core Web Vitals
    this.trackCoreWebVitals();
    
    // Track custom performance metrics
    this.trackCustomMetrics();
    
    // Monitor resource loading
    this.trackResourceLoading();
  }

  // Track Core Web Vitals
  trackCoreWebVitals() {
    // Track First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.trackEvent('core_web_vital', {
          metric: 'FCP',
          value: entry.startTime,
          rating: this.getRating('FCP', entry.startTime)
        });
      }
    });

    // Track Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.trackEvent('core_web_vital', {
        metric: 'LCP',
        value: entry.startTime,
        rating: this.getRating('LCP', entry.startTime)
      });
    });

    // Track Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.trackEvent('core_web_vital', {
          metric: 'CLS',
          value: entry.value,
          rating: this.getRating('CLS', entry.value)
        });
      }
    });

    // Track First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entry) => {
      this.trackEvent('core_web_vital', {
        metric: 'FID',
        value: entry.processingStart - entry.startTime,
        rating: this.getRating('FID', entry.processingStart - entry.startTime)
      });
    });
  }

  // Observe performance entries
  observePerformanceEntry(entryType, callback) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ entryTypes: [entryType] });
    } catch (error) {
      console.warn(`Performance observer for ${entryType} not supported:`, error);
    }
  }

  // Get performance rating
  getRating(metric, value) {
    const thresholds = {
      'FCP': { good: 1800, needs_improvement: 3000 },
      'LCP': { good: 2500, needs_improvement: 4000 },
      'FID': { good: 100, needs_improvement: 300 },
      'CLS': { good: 0.1, needs_improvement: 0.25 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs_improvement) return 'needs_improvement';
    return 'poor';
  }

  // Track custom metrics
  trackCustomMetrics() {
    // Track time to interactive
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.trackEvent('custom_metric', {
        metric: 'page_load_time',
        value: loadTime,
        rating: loadTime < 2000 ? 'good' : loadTime < 4000 ? 'needs_improvement' : 'poor'
      });
    });

    // Track API response times
    this.monitorApiCalls();
  }

  // Monitor API calls
  monitorApiCalls() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.trackEvent('api_call', {
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          success: response.ok,
          rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs_improvement' : 'poor'
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.trackEvent('api_error', {
          url,
          method: args[1]?.method || 'GET',
          error: error.message,
          duration
        });
        
        throw error;
      }
    };
  }

  // Track resource loading
  trackResourceLoading() {
    this.observePerformanceEntry('resource', (entry) => {
      this.trackEvent('resource_load', {
        name: entry.name,
        type: entry.initiatorType,
        size: entry.transferSize,
        duration: entry.duration,
        rating: entry.duration < 1000 ? 'good' : entry.duration < 3000 ? 'needs_improvement' : 'poor'
      });
    });
  }

  // Setup error monitoring
  setupErrorMonitoring() {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.metrics.errors++;
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        type: 'runtime_error'
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errors++;
      this.trackEvent('unhandled_rejection', {
        reason: event.reason?.message || event.reason,
        stack: event.reason?.stack,
        type: 'promise_rejection'
      });
    });

    // Track network errors
    this.monitorNetworkErrors();
  }

  // Monitor network errors
  monitorNetworkErrors() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.trackEvent('network_error', {
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            type: 'http_error'
          });
        }
        return response;
      } catch (error) {
        this.trackEvent('network_error', {
          url: args[0],
          error: error.message,
          type: 'fetch_error'
        });
        throw error;
      }
    };
  }

  // Setup user engagement tracking
  setupUserEngagementTracking() {
    let engagementScore = 0;
    let lastActivity = Date.now();

    // Track clicks
    document.addEventListener('click', (event) => {
      engagementScore += 1;
      lastActivity = Date.now();
      
      this.trackEvent('user_interaction', {
        type: 'click',
        element: event.target.tagName,
        className: event.target.className,
        id: event.target.id
      });
    });

    // Track scrolling
    let scrollDepth = 0;
    window.addEventListener('scroll', () => {
      const currentScrollDepth = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (currentScrollDepth > scrollDepth) {
        scrollDepth = currentScrollDepth;
        engagementScore += 0.1;
        lastActivity = Date.now();
        
        // Track scroll milestones
        if (scrollDepth % 25 === 0) {
          this.trackEvent('scroll_milestone', {
            depth: scrollDepth,
            timestamp: Date.now()
          });
        }
      }
    });

    // Track time on page
    setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity < 60000) { // Active in last minute
        engagementScore += 0.1;
      }
      
      this.metrics.userEngagement = engagementScore;
      
      // Track session duration
      const sessionDuration = Date.now() - this.startTime;
      this.trackEvent('session_update', {
        duration: sessionDuration,
        engagement: engagementScore,
        active: timeSinceActivity < 60000
      });
    }, 30000); // Every 30 seconds
  }

  // Setup analytics tracking
  setupAnalyticsTracking() {
    // Track sentiment analysis events
    this.trackAnalysisEvents();
    
    // Track sharing events
    this.trackSharingEvents();
    
    // Track form interactions
    this.trackFormInteractions();
  }

  // Track analysis events
  trackAnalysisEvents() {
    // Monitor for analysis start
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          
          // Track analysis start
          if (target.id === 'loading-state' && !target.classList.contains('hidden')) {
            this.analysisStartTime = Date.now();
            this.trackEvent('analysis_start', {
              timestamp: this.analysisStartTime
            });
          }
          
          // Track analysis completion
          if (target.id === 'results-container' && !target.classList.contains('hidden')) {
            const analysisTime = Date.now() - (this.analysisStartTime || Date.now());
            this.metrics.analyses++;
            this.metrics.averageAnalysisTime = 
              (this.metrics.averageAnalysisTime * (this.metrics.analyses - 1) + analysisTime) / this.metrics.analyses;
            
            this.trackEvent('analysis_complete', {
              duration: analysisTime,
              success: true,
              timestamp: Date.now()
            });
          }
        }
      });
    });

    // Observe the DOM for changes
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  // Track sharing events
  trackSharingEvents() {
    // Monitor share button clicks
    document.addEventListener('click', (event) => {
      if (event.target.id === 'share-results' || event.target.closest('#share-results')) {
        this.metrics.shares++;
        this.trackEvent('share_initiated', {
          timestamp: Date.now()
        });
      }
    });
  }

  // Track form interactions
  trackFormInteractions() {
    const form = document.getElementById('analysis-form');
    if (form) {
      form.addEventListener('submit', (event) => {
        this.trackEvent('form_submit', {
          url: event.target.querySelector('#youtube-url')?.value,
          timestamp: Date.now()
        });
      });
    }
  }

  // Setup real-time metrics
  setupRealTimeMetrics() {
    // Create metrics dashboard
    this.createMetricsDashboard();
    
    // Update metrics periodically
    setInterval(() => {
      this.updateMetricsDashboard();
    }, 5000); // Every 5 seconds
  }

  // Create metrics dashboard
  createMetricsDashboard() {
    const dashboard = document.createElement('div');
    dashboard.id = 'metrics-dashboard';
    dashboard.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      max-width: 300px;
      display: none;
    `;
    
    document.body.appendChild(dashboard);
    
    // Toggle dashboard with Ctrl+Shift+M
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // Update metrics dashboard
  updateMetricsDashboard() {
    const dashboard = document.getElementById('metrics-dashboard');
    if (dashboard && dashboard.style.display === 'block') {
      dashboard.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">📊 Real-Time Metrics</div>
        <div>Session: ${this.sessionId.substring(0, 12)}...</div>
        <div>Page Views: ${this.metrics.pageViews}</div>
        <div>Analyses: ${this.metrics.analyses}</div>
        <div>Errors: ${this.metrics.errors}</div>
        <div>Shares: ${this.metrics.shares}</div>
        <div>Avg Analysis Time: ${Math.round(this.metrics.averageAnalysisTime)}ms</div>
        <div>Engagement: ${Math.round(this.metrics.userEngagement)}</div>
        <div>Events: ${this.events.length}</div>
        <div>Uptime: ${Math.round((Date.now() - this.startTime) / 1000)}s</div>
      `;
    }
  }

  // Send analytics data
  sendAnalytics(event) {
    // In a real implementation, this would send to your analytics service
    console.log('Analytics Event:', event);
    
    // Example: Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', event.name, {
        event_category: 'user_interaction',
        event_label: event.data?.type || 'unknown',
        value: event.data?.value || 1
      });
    }
  }

  // Persist event to localStorage
  persistEvent(event) {
    try {
      const stored = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      stored.push(event);
      
      // Keep only last 100 events
      if (stored.length > 100) {
        stored.splice(0, stored.length - 100);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to persist analytics event:', error);
    }
  }

  // Get analytics summary
  getAnalyticsSummary() {
    const sessionDuration = Date.now() - this.startTime;
    
    return {
      session: {
        id: this.sessionId,
        duration: sessionDuration,
        startTime: this.startTime
      },
      metrics: this.metrics,
      events: this.events.length,
      performance: {
        coreWebVitals: this.getCoreWebVitals(),
        customMetrics: this.getCustomMetrics()
      }
    };
  }

  // Get Core Web Vitals summary
  getCoreWebVitals() {
    const vitals = this.events.filter(e => e.name === 'core_web_vital');
    return vitals.reduce((acc, event) => {
      acc[event.data.metric] = {
        value: event.data.value,
        rating: event.data.rating
      };
      return acc;
    }, {});
  }

  // Get custom metrics summary
  getCustomMetrics() {
    const metrics = this.events.filter(e => e.name === 'custom_metric');
    return metrics.reduce((acc, event) => {
      acc[event.data.metric] = {
        value: event.data.value,
        rating: event.data.rating
      };
      return acc;
    }, {});
  }

  // Export analytics data
  exportAnalytics() {
    const data = {
      summary: this.getAnalyticsSummary(),
      events: this.events,
      timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${this.sessionId}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// Initialize monitoring
export const monitoringManager = new MonitoringManager();

// Add export functionality
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'E') {
    monitoringManager.exportAnalytics();
  }
});

// Expose for debugging
window.monitoringManager = monitoringManager;