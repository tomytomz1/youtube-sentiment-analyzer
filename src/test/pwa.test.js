import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PWAManager } from '../scripts/pwa.js';

// Mock service worker
const mockServiceWorker = {
  register: vi.fn(),
  addEventListener: vi.fn(),
  controller: null,
  ready: Promise.resolve({
    active: {
      postMessage: vi.fn()
    },
    waiting: {
      postMessage: vi.fn()
    },
    installing: null,
    update: vi.fn(),
    sync: {
      register: vi.fn()
    }
  })
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
});

// Mock ServiceWorkerRegistration
global.ServiceWorkerRegistration = {
  prototype: {
    sync: true
  }
};

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('PWAManager', () => {
  let pwaManager;
  
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Reset mocks
    mockServiceWorker.register.mockClear();
    mockServiceWorker.addEventListener.mockClear();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true
    });
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });
    
    pwaManager = new PWAManager();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(pwaManager.deferredPrompt).toBe(null);
      expect(pwaManager.isInstalled).toBe(false);
      expect(pwaManager.updateAvailable).toBe(false);
    });

    it('should attempt to register service worker', () => {
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  describe('Install Prompt', () => {
    it('should handle beforeinstallprompt event', () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };
      
      // Simulate beforeinstallprompt event
      const event = new CustomEvent('beforeinstallprompt');
      Object.assign(event, mockEvent);
      
      window.dispatchEvent(event);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should create install banner', () => {
      const banner = document.getElementById('pwa-install-banner');
      expect(banner).toBeTruthy();
      expect(banner.classList.contains('hidden')).toBe(true);
    });

    it('should show install banner when prompt is available', () => {
      pwaManager.deferredPrompt = { prompt: vi.fn() };
      pwaManager.isInstalled = false;
      
      pwaManager.showInstallBanner();
      
      const banner = document.getElementById('pwa-install-banner');
      expect(banner.classList.contains('hidden')).toBe(false);
    });

    it('should hide install banner', () => {
      pwaManager.hideInstallBanner();
      
      const banner = document.getElementById('pwa-install-banner');
      expect(banner.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Installation Status', () => {
    it('should detect standalone mode', () => {
      // Mock standalone mode
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      const newManager = new PWAManager();
      expect(newManager.isInstalled).toBe(true);
    });

    it('should detect iOS standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true
      });
      
      const newManager = new PWAManager();
      expect(newManager.isInstalled).toBe(true);
    });
  });

  describe('Offline/Online Handling', () => {
    it('should handle online event', () => {
      const spy = vi.spyOn(pwaManager, 'handleOnline');
      
      window.dispatchEvent(new Event('online'));
      
      expect(spy).toHaveBeenCalled();
    });

    it('should handle offline event', () => {
      const spy = vi.spyOn(pwaManager, 'handleOffline');
      
      window.dispatchEvent(new Event('offline'));
      
      expect(spy).toHaveBeenCalled();
    });

    it('should show offline indicator', () => {
      pwaManager.showOfflineIndicator();
      
      const indicator = document.getElementById('pwa-offline-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator.textContent).toContain('offline');
    });

    it('should hide offline indicator', () => {
      pwaManager.showOfflineIndicator();
      pwaManager.hideOfflineIndicator();
      
      const indicator = document.getElementById('pwa-offline-indicator');
      expect(indicator).toBe(null);
    });
  });

  describe('Update Handling', () => {
    it('should show update notification', () => {
      pwaManager.showUpdateNotification();
      
      const notification = document.getElementById('pwa-update-notification');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('Update Available');
    });

    it('should handle update button click', () => {
      pwaManager.showUpdateNotification();
      
      const updateBtn = document.getElementById('pwa-update-btn');
      const applySpy = vi.spyOn(pwaManager, 'applyUpdate');
      
      updateBtn.click();
      
      expect(applySpy).toHaveBeenCalled();
    });
  });

  describe('Settings Panel', () => {
    it('should create settings panel', () => {
      pwaManager.createSettingsPanel();
      
      const panel = document.getElementById('pwa-settings-panel');
      expect(panel).toBeTruthy();
      expect(panel.classList.contains('hidden')).toBe(true);
    });

    it('should show settings panel', () => {
      pwaManager.showSettingsPanel();
      
      const panel = document.getElementById('pwa-settings-panel');
      expect(panel.classList.contains('hidden')).toBe(false);
    });

    it('should close settings panel', () => {
      pwaManager.showSettingsPanel();
      
      const closeBtn = document.getElementById('pwa-settings-close');
      closeBtn.click();
      
      const panel = document.getElementById('pwa-settings-panel');
      expect(panel.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should format cache size correctly', () => {
      expect(pwaManager.formatCacheSize(0)).toBe('0 B');
      expect(pwaManager.formatCacheSize(1024)).toBe('1 KB');
      expect(pwaManager.formatCacheSize(1024 * 1024)).toBe('1 MB');
      expect(pwaManager.formatCacheSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle cache info request', async () => {
      // Mock service worker registration
      pwaManager.swRegistration = {
        active: {
          postMessage: vi.fn()
        }
      };
      
      // Mock MessageChannel
      global.MessageChannel = vi.fn().mockImplementation(() => ({
        port1: {
          onmessage: null
        },
        port2: {}
      }));
      
      const cacheInfoPromise = pwaManager.getCacheInfo();
      
      // Simulate response
      const messageChannel = new MessageChannel();
      setTimeout(() => {
        messageChannel.port1.onmessage({
          data: { type: 'CACHE_SIZE', size: 1024, count: 5 }
        });
      }, 0);
      
      // Should not throw
      expect(cacheInfoPromise).toBeInstanceOf(Promise);
    });
  });

  describe('Share Target', () => {
    it('should handle shared URL', () => {
      const testUrl = 'https://www.youtube.com/watch?v=test123';
      
      // Mock URL input element
      const urlInput = document.createElement('input');
      urlInput.id = 'youtube-url';
      document.body.appendChild(urlInput);
      
      pwaManager.handleSharedUrl(testUrl);
      
      expect(urlInput.value).toBe(testUrl);
    });

    it('should process URL parameters for shared content', () => {
      const spy = vi.spyOn(pwaManager, 'handleSharedUrl');
      
      // Mock URLSearchParams
      const originalURLSearchParams = window.URLSearchParams;
      window.URLSearchParams = vi.fn().mockImplementation(() => ({
        get: vi.fn().mockReturnValue('https://youtube.com/watch?v=test')
      }));
      
      pwaManager.setupShareTarget();
      
      expect(spy).toHaveBeenCalledWith('https://youtube.com/watch?v=test');
      
      // Restore
      window.URLSearchParams = originalURLSearchParams;
    });
  });

  describe('Status and Utilities', () => {
    it('should return PWA status', () => {
      const status = pwaManager.getStatus();
      
      expect(status).toEqual({
        isInstalled: expect.any(Boolean),
        isOnline: expect.any(Boolean),
        hasServiceWorker: expect.any(Boolean),
        updateAvailable: expect.any(Boolean),
        canInstall: expect.any(Boolean)
      });
    });

    it('should track events', () => {
      const spy = vi.spyOn(console, 'log');
      
      pwaManager.trackEvent('test_event', { data: 'test' });
      
      expect(spy).toHaveBeenCalledWith('PWA Event:', 'test_event', { data: 'test' });
    });
  });

  describe('Event Listeners', () => {
    it('should handle app installed event', () => {
      const event = new CustomEvent('appinstalled');
      
      window.dispatchEvent(event);
      
      expect(pwaManager.isInstalled).toBe(true);
    });

    it('should handle keyboard shortcut for settings', () => {
      const spy = vi.spyOn(pwaManager, 'showSettingsPanel');
      
      const event = new KeyboardEvent('keydown', {
        key: 'P',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
      });
      
      document.dispatchEvent(event);
      
      expect(spy).toHaveBeenCalled();
    });
  });
});