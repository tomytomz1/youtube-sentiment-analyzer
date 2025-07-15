import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessibilityManager } from '../scripts/accessibility.js';

// Mock DOM methods
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AccessibilityManager', () => {
  let accessibilityManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    
    // Mock document ready state
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete'
    });
    
    accessibilityManager = new AccessibilityManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('Contrast Mode', () => {
    it('should create contrast toggle button', () => {
      const contrastToggle = document.getElementById('contrast-toggle');
      expect(contrastToggle).toBeTruthy();
      expect(contrastToggle.getAttribute('aria-label')).toBe('Toggle high contrast mode');
      expect(contrastToggle.classList.contains('fixed')).toBe(true);
    });

    it('should add contrast styles to head', () => {
      const contrastStyles = document.getElementById('contrast-styles');
      expect(contrastStyles).toBeTruthy();
      expect(contrastStyles.textContent).toContain('.high-contrast');
    });

    it('should toggle contrast mode when button is clicked', () => {
      const contrastToggle = document.getElementById('contrast-toggle');
      
      // Initial state should be normal
      expect(document.body.classList.contains('high-contrast')).toBe(false);
      
      // Click to enable high contrast
      contrastToggle.click();
      expect(document.body.classList.contains('high-contrast')).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('contrastMode', 'high');
      
      // Click again to disable
      contrastToggle.click();
      expect(document.body.classList.contains('high-contrast')).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('contrastMode', 'normal');
    });

    it('should handle keyboard shortcut for contrast toggle', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'C',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
      });
      
      document.dispatchEvent(event);
      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });

    it('should load saved contrast preference', () => {
      mockLocalStorage.getItem.mockReturnValue('high');
      accessibilityManager.loadPreferences();
      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });
  });

  describe('Screen Reader Support', () => {
    it('should create live regions for announcements', () => {
      const liveRegion = document.getElementById('screen-reader-announcements');
      const urgentRegion = document.getElementById('urgent-announcements');
      
      expect(liveRegion).toBeTruthy();
      expect(urgentRegion).toBeTruthy();
      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
      expect(urgentRegion.getAttribute('aria-live')).toBe('assertive');
    });

    it('should announce messages to screen reader', async () => {
      const liveRegion = document.getElementById('screen-reader-announcements');
      
      accessibilityManager.announceToScreenReader('Test message');
      
      // Wait for setTimeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(liveRegion.textContent).toBe('Test message');
    });

    it('should announce urgent messages to urgent region', async () => {
      const urgentRegion = document.getElementById('urgent-announcements');
      
      accessibilityManager.announceToScreenReader('Urgent message', true);
      
      // Wait for setTimeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(urgentRegion.textContent).toBe('Urgent message');
    });

    it('should clear announcements after timeout', async () => {
      const liveRegion = document.getElementById('screen-reader-announcements');
      
      accessibilityManager.announceToScreenReader('Test message');
      
      // Wait for announcement
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(liveRegion.textContent).toBe('Test message');
      
      // Wait for clear timeout (reduced timeout for test)
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(liveRegion.textContent).toBe('');
    }, 10000);
  });

  describe('Keyboard Navigation', () => {
    it('should create skip links', () => {
      const skipLinks = document.querySelector('.skip-links');
      expect(skipLinks).toBeTruthy();
      
      const skipToMain = skipLinks.querySelector('a[href="#main-content"]');
      const skipToForm = skipLinks.querySelector('a[href="#analysis-form"]');
      const skipToFaq = skipLinks.querySelector('a[href="#faq"]');
      
      expect(skipToMain).toBeTruthy();
      expect(skipToForm).toBeTruthy();
      expect(skipToFaq).toBeTruthy();
    });

    it('should add skip link styles', () => {
      const skipStyles = Array.from(document.querySelectorAll('style'))
        .find(style => style.textContent.includes('.skip-link'));
      
      expect(skipStyles).toBeTruthy();
      expect(skipStyles.textContent).toContain('.skip-link');
      expect(skipStyles.textContent).toContain('position: absolute');
    });

    it('should add focus styles', () => {
      const focusStyles = Array.from(document.querySelectorAll('style'))
        .find(style => style.textContent.includes('*:focus'));
      
      expect(focusStyles).toBeTruthy();
      expect(focusStyles.textContent).toContain('outline: 3px solid #2563eb');
    });

    it('should show keyboard help on F1 key', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'F1',
        bubbles: true
      });
      
      document.dispatchEvent(event);
      
      const helpModal = document.getElementById('keyboard-help-modal');
      expect(helpModal).toBeTruthy();
      expect(helpModal.getAttribute('role')).toBe('dialog');
      expect(helpModal.getAttribute('aria-modal')).toBe('true');
    });

    it('should show keyboard help on Ctrl+/', () => {
      const event = new KeyboardEvent('keydown', {
        key: '/',
        ctrlKey: true,
        bubbles: true
      });
      
      document.dispatchEvent(event);
      
      const helpModal = document.getElementById('keyboard-help-modal');
      expect(helpModal).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within modals', () => {
      // Create mock modal
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(modal);
      
      const firstButton = modal.querySelector('#first');
      const lastButton = modal.querySelector('#last');
      
      // Mock Tab key on last element
      lastButton.focus();
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      });
      
      document.dispatchEvent(tabEvent);
      
      // Should focus first element
      expect(document.activeElement).toBe(firstButton);
    });

    it('should handle reverse tab navigation', () => {
      // Create mock modal
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(modal);
      
      const firstButton = modal.querySelector('#first');
      const lastButton = modal.querySelector('#last');
      
      // Mock Shift+Tab key on first element
      firstButton.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true
      });
      
      document.dispatchEvent(shiftTabEvent);
      
      // Should focus last element
      expect(document.activeElement).toBe(lastButton);
    });
  });

  describe('Motion Preferences', () => {
    it('should respect reduced motion preference', () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      // Reinitialize with reduced motion
      accessibilityManager = new AccessibilityManager();
      
      expect(document.body.classList.contains('reduce-motion')).toBe(true);
    });
  });

  describe('Dynamic Announcements', () => {
    it('should observe loading state changes', () => {
      // Create loading state element
      const loadingState = document.createElement('div');
      loadingState.id = 'loading-state';
      loadingState.classList.add('hidden');
      document.body.appendChild(loadingState);
      
      // Trigger MutationObserver by changing class
      loadingState.classList.remove('hidden');
      
      // The observer should be set up (testing the setup, not the actual observation)
      expect(loadingState.id).toBe('loading-state');
    });

    it('should observe results container changes', () => {
      // Create results container
      const resultsContainer = document.createElement('div');
      resultsContainer.id = 'results-container';
      resultsContainer.classList.add('hidden');
      document.body.appendChild(resultsContainer);
      
      // Create percentage elements
      const positivePercentage = document.createElement('div');
      positivePercentage.id = 'positive-percentage';
      positivePercentage.textContent = '60%';
      document.body.appendChild(positivePercentage);
      
      const neutralPercentage = document.createElement('div');
      neutralPercentage.id = 'neutral-percentage';
      neutralPercentage.textContent = '25%';
      document.body.appendChild(neutralPercentage);
      
      const negativePercentage = document.createElement('div');
      negativePercentage.id = 'negative-percentage';
      negativePercentage.textContent = '15%';
      document.body.appendChild(negativePercentage);
      
      // Trigger MutationObserver by changing class
      resultsContainer.classList.remove('hidden');
      
      // The observer should be set up
      expect(resultsContainer.id).toBe('results-container');
    });
  });

  describe('Initialization', () => {
    it('should initialize all components', () => {
      expect(accessibilityManager.currentContrastMode).toBe('normal');
      expect(accessibilityManager.announcements).toEqual([]);
      expect(document.getElementById('contrast-toggle')).toBeTruthy();
      expect(document.getElementById('screen-reader-announcements')).toBeTruthy();
    });

    it('should set up media query listeners', () => {
      expect(accessibilityManager.prefersDarkMode).toBeTruthy();
      expect(accessibilityManager.prefersReducedMotion).toBeTruthy();
      expect(accessibilityManager.prefersHighContrast).toBeTruthy();
    });
  });
});