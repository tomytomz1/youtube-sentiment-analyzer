import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringManager } from '../scripts/monitoring.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue('[]'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock console.log to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('MonitoringManager', () => {
  let monitoringManager;
  
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    
    monitoringManager = new MonitoringManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with proper default values', () => {
      expect(monitoringManager.sessionId).toMatch(/^session_\d+_/);
      expect(monitoringManager.startTime).toBeDefined();
      expect(Array.isArray(monitoringManager.events)).toBe(true);
      expect(monitoringManager.metrics).toEqual({
        pageViews: 1,
        analyses: 0,
        errors: 0,
        shares: 0,
        averageAnalysisTime: 0,
        userEngagement: 0
      });
    });

    it('should generate unique session IDs', () => {
      const manager1 = new MonitoringManager();
      const manager2 = new MonitoringManager();
      expect(manager1.sessionId).not.toBe(manager2.sessionId);
    });
  });

  describe('Event Tracking', () => {
    it('should track events correctly', () => {
      const initialEventCount = monitoringManager.events.length;
      monitoringManager.trackEvent('test_event', { key: 'value' });
      
      expect(monitoringManager.events.length).toBe(initialEventCount + 1);
      const event = monitoringManager.events.find(e => e.name === 'test_event');
      expect(event).toBeDefined();
      expect(event.data.key).toBe('value');
      expect(event.sessionId).toBe(monitoringManager.sessionId);
    });

    it('should generate unique event IDs', () => {
      monitoringManager.trackEvent('event1');
      monitoringManager.trackEvent('event2');
      
      const event1 = monitoringManager.events.find(e => e.name === 'event1');
      const event2 = monitoringManager.events.find(e => e.name === 'event2');
      
      expect(event1.id).not.toBe(event2.id);
    });

    it('should persist events to localStorage', () => {
      monitoringManager.trackEvent('test_event');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'analytics_events',
        expect.stringContaining('test_event')
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should rate performance metrics correctly', () => {
      expect(monitoringManager.getRating('FCP', 1500)).toBe('good');
      expect(monitoringManager.getRating('FCP', 2500)).toBe('needs_improvement');
      expect(monitoringManager.getRating('FCP', 4000)).toBe('poor');
      
      expect(monitoringManager.getRating('LCP', 2000)).toBe('good');
      expect(monitoringManager.getRating('LCP', 3000)).toBe('needs_improvement');
      expect(monitoringManager.getRating('LCP', 5000)).toBe('poor');
    });

    it('should handle unknown metrics', () => {
      expect(monitoringManager.getRating('UNKNOWN', 1000)).toBe('unknown');
    });
  });

  describe('Error Monitoring', () => {
    it('should track JavaScript errors', () => {
      const initialErrors = monitoringManager.metrics.errors;
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });
      
      window.dispatchEvent(errorEvent);
      
      expect(monitoringManager.metrics.errors).toBe(initialErrors + 1);
      const event = monitoringManager.events.find(e => e.name === 'javascript_error');
      expect(event).toBeDefined();
      expect(event.data.message).toBe('Test error');
    });

    it('should track unhandled promise rejections', () => {
      const initialErrors = monitoringManager.metrics.errors;
      
      // Create a custom event since PromiseRejectionEvent may not be available in test environment
      const rejectionEvent = new CustomEvent('unhandledrejection', {
        detail: {
          reason: new Error('Promise rejection'),
          promise: Promise.reject('test')
        }
      });
      
      // Mock the event structure to match actual PromiseRejectionEvent
      Object.defineProperty(rejectionEvent, 'reason', {
        value: new Error('Promise rejection')
      });
      
      window.dispatchEvent(rejectionEvent);
      
      expect(monitoringManager.metrics.errors).toBe(initialErrors + 1);
      const event = monitoringManager.events.find(e => e.name === 'unhandled_rejection');
      expect(event).toBeDefined();
    });
  });

  describe('User Engagement Tracking', () => {
    it('should track click events', () => {
      const button = document.createElement('button');
      button.id = 'test-button';
      button.className = 'test-class';
      document.body.appendChild(button);
      
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: button });
      
      document.dispatchEvent(clickEvent);
      
      const event = monitoringManager.events.find(e => e.name === 'user_interaction');
      expect(event).toBeDefined();
      expect(event.data.type).toBe('click');
    });
  });

  describe('Analytics Summary', () => {
    it('should generate analytics summary', () => {
      monitoringManager.trackEvent('test_event');
      
      const summary = monitoringManager.getAnalyticsSummary();
      
      expect(summary.session.id).toBe(monitoringManager.sessionId);
      expect(summary.metrics).toEqual(monitoringManager.metrics);
      expect(summary.events).toBe(monitoringManager.events.length);
      expect(summary.performance).toBeDefined();
    });

    it('should get Core Web Vitals summary', () => {
      monitoringManager.trackEvent('core_web_vital', {
        metric: 'FCP',
        value: 1500,
        rating: 'good'
      });
      
      const vitals = monitoringManager.getCoreWebVitals();
      expect(vitals.FCP).toEqual({
        value: 1500,
        rating: 'good'
      });
    });

    it('should get custom metrics summary', () => {
      monitoringManager.trackEvent('custom_metric', {
        metric: 'page_load_time',
        value: 2000,
        rating: 'good'
      });
      
      const metrics = monitoringManager.getCustomMetrics();
      expect(metrics.page_load_time).toEqual({
        value: 2000,
        rating: 'good'
      });
    });
  });

  describe('Metrics Dashboard', () => {
    it('should create metrics dashboard', () => {
      const dashboard = document.getElementById('metrics-dashboard');
      expect(dashboard).toBeTruthy();
      expect(dashboard.style.display).toBe('none');
    });

    it('should update metrics dashboard', () => {
      const dashboard = document.getElementById('metrics-dashboard');
      dashboard.style.display = 'block';
      
      monitoringManager.updateMetricsDashboard();
      
      expect(dashboard.innerHTML).toContain('Real-Time Metrics');
      expect(dashboard.innerHTML).toContain('Session:');
      expect(dashboard.innerHTML).toContain('Page Views:');
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique event IDs', () => {
      const id1 = monitoringManager.generateEventId();
      const id2 = monitoringManager.generateEventId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^event_\d+_/);
    });

    it('should generate unique session IDs', () => {
      const id1 = monitoringManager.generateSessionId();
      const id2 = monitoringManager.generateSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^session_\d+_/);
    });
  });
});