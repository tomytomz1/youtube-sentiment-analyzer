// Progressive Web App (PWA) Manager
export class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.swRegistration = null;
    this.updateAvailable = false;
    
    this.init();
  }

  // Initialize PWA features
  async init() {
    await this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupUpdateHandling();
    this.setupOfflineHandling();
    this.setupShareTarget();
    this.createInstallBanner();
    this.trackInstallation();
  }

  // Register service worker
  async registerServiceWorker() {
    // Skip service worker registration in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('PWA: Development mode detected, skipping service worker registration');
      
      // Unregister any existing service workers in development
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('PWA: Unregistered existing service worker in development mode');
          }
        } catch (error) {
          console.log('PWA: No existing service workers to unregister');
        }
      }
      
      return;
    }
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
        
        console.log('PWA: Service worker registered successfully');
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate(registration);
        });
        
        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('PWA: New service worker activated');
          window.location.reload();
        });
        
      } catch (error) {
        console.error('PWA: Service worker registration failed:', error);
      }
    }
  }

  // Handle service worker updates
  handleServiceWorkerUpdate(registration) {
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        this.showUpdateNotification();
      }
    });
  }

  // Show update notification
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.className = 'fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-medium">Update Available</p>
          <p class="text-sm opacity-90">A new version is ready to install</p>
        </div>
        <button id="pwa-update-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
          Update
        </button>
        <button id="pwa-dismiss-btn" class="text-white opacity-75 hover:opacity-100">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Handle update button
    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      this.applyUpdate();
    });
    
    // Handle dismiss button
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  // Apply service worker update
  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
      notification.remove();
    }
  }

  // Setup install prompt handling
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully');
      this.isInstalled = true;
      this.hideInstallBanner();
      this.trackEvent('pwa_installed');
    });
  }

  // Create install banner
  createInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg z-50 hidden';
    banner.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-medium">Install App</h3>
            <p class="text-sm opacity-90">Add to your home screen for quick access</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button id="pwa-install-btn" class="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-gray-100">
            Install
          </button>
          <button id="pwa-close-banner" class="text-white opacity-75 hover:opacity-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // Handle install button
    document.getElementById('pwa-install-btn').addEventListener('click', () => {
      this.installApp();
    });
    
    // Handle close button
    document.getElementById('pwa-close-banner').addEventListener('click', () => {
      this.hideInstallBanner();
    });
  }

  // Show install banner
  showInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner && this.deferredPrompt && !this.isInstalled) {
      banner.classList.remove('hidden');
    }
  }

  // Hide install banner
  hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  // Install the app
  async installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        this.trackEvent('pwa_install_accepted');
      } else {
        console.log('PWA: User dismissed the install prompt');
        this.trackEvent('pwa_install_dismissed');
      }
      
      this.deferredPrompt = null;
      this.hideInstallBanner();
    }
  }

  // Setup update handling
  setupUpdateHandling() {
    // Check for updates periodically
    setInterval(() => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    }, 60000); // Check every minute
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.swRegistration) {
        this.swRegistration.update();
      }
    });
  }

  // Setup offline handling
  setupOfflineHandling() {
    // Monitor connection status
    window.addEventListener('online', () => {
      this.handleOnline();
    });
    
    window.addEventListener('offline', () => {
      this.handleOffline();
    });
    
    // Initial check
    if (!navigator.onLine) {
      this.handleOffline();
    }
  }

  // Handle online event
  handleOnline() {
    console.log('PWA: Back online');
    this.hideOfflineIndicator();
    this.trackEvent('pwa_online');
    
    // Sync pending requests
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.swRegistration.sync.register('background-sync');
    }
  }

  // Handle offline event
  handleOffline() {
    console.log('PWA: Gone offline');
    this.showOfflineIndicator();
    this.trackEvent('pwa_offline');
  }

  // Show offline indicator
  showOfflineIndicator() {
    let indicator = document.getElementById('pwa-offline-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pwa-offline-indicator';
      indicator.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50';
      indicator.innerHTML = `
        <div class="flex items-center justify-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>You're offline. Some features may not be available.</span>
        </div>
      `;
      
      document.body.appendChild(indicator);
    }
  }

  // Hide offline indicator
  hideOfflineIndicator() {
    const indicator = document.getElementById('pwa-offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Setup share target handling
  setupShareTarget() {
    // Handle shared URLs
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    
    if (sharedUrl) {
      // Process shared URL
      this.handleSharedUrl(sharedUrl);
    }
  }

  // Handle shared URL
  handleSharedUrl(url) {
    console.log('PWA: Handling shared URL:', url);
    
    // Fill in the YouTube URL input if it exists
    const urlInput = document.getElementById('youtube-url');
    if (urlInput) {
      urlInput.value = url;
      urlInput.focus();
    }
    
    this.trackEvent('pwa_url_shared', { url });
  }

  // Track installation status
  trackInstallation() {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('PWA: App is running in standalone mode');
      this.trackEvent('pwa_standalone_mode');
    }
    
    // Check if app is in scope
    if (window.navigator.standalone) {
      this.isInstalled = true;
      console.log('PWA: App is running in standalone mode (iOS)');
      this.trackEvent('pwa_ios_standalone');
    }
  }

  // Get cache information
  async getCacheInfo() {
    if (!this.swRegistration) {
      return { size: 0, count: 0 };
    }
    
    try {
      const channel = new MessageChannel();
      
      return new Promise((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            resolve({
              size: event.data.size,
              count: event.data.count || 0
            });
          }
        };
        
        this.swRegistration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [channel.port2]
        );
      });
    } catch (error) {
      console.error('PWA: Failed to get cache info:', error);
      return { size: 0, count: 0 };
    }
  }

  // Clear cache
  async clearCache() {
    if (!this.swRegistration) {
      return false;
    }
    
    try {
      const channel = new MessageChannel();
      
      return new Promise((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_CLEARED') {
            resolve(true);
          }
        };
        
        this.swRegistration.active.postMessage(
          { type: 'CLEAR_CACHE' },
          [channel.port2]
        );
      });
    } catch (error) {
      console.error('PWA: Failed to clear cache:', error);
      return false;
    }
  }

  // Format cache size
  formatCacheSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create PWA settings panel
  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'pwa-settings-panel';
    panel.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    panel.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">PWA Settings</h3>
          <button id="pwa-settings-close" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Installation Status</label>
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full ${this.isInstalled ? 'bg-green-500' : 'bg-gray-300'}"></span>
              <span class="text-sm">${this.isInstalled ? 'Installed' : 'Not Installed'}</span>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Cache Information</label>
            <div id="pwa-cache-info" class="text-sm text-gray-600">
              Loading cache information...
            </div>
          </div>
          
          <div class="flex space-x-3">
            <button id="pwa-clear-cache" class="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
              Clear Cache
            </button>
            ${!this.isInstalled ? `
              <button id="pwa-install-app" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                Install App
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Load cache info
    this.getCacheInfo().then(info => {
      const cacheInfoElement = document.getElementById('pwa-cache-info');
      if (cacheInfoElement) {
        cacheInfoElement.textContent = `Size: ${this.formatCacheSize(info.size)}`;
      }
    });
    
    // Setup event listeners
    document.getElementById('pwa-settings-close').addEventListener('click', () => {
      panel.classList.add('hidden');
    });
    
    document.getElementById('pwa-clear-cache').addEventListener('click', async () => {
      const success = await this.clearCache();
      if (success) {
        alert('Cache cleared successfully!');
        // Refresh cache info
        const info = await this.getCacheInfo();
        document.getElementById('pwa-cache-info').textContent = `Size: ${this.formatCacheSize(info.size)}`;
      } else {
        alert('Failed to clear cache');
      }
    });
    
    const installButton = document.getElementById('pwa-install-app');
    if (installButton) {
      installButton.addEventListener('click', () => {
        this.installApp();
        panel.classList.add('hidden');
      });
    }
  }

  // Show settings panel
  showSettingsPanel() {
    let panel = document.getElementById('pwa-settings-panel');
    if (!panel) {
      this.createSettingsPanel();
      panel = document.getElementById('pwa-settings-panel');
    }
    
    panel.classList.remove('hidden');
  }

  // Track events
  trackEvent(eventName, data = {}) {
    console.log('PWA Event:', eventName, data);
    
    // Send to analytics if available
    if (window.monitoringManager) {
      window.monitoringManager.trackEvent(eventName, data);
    }
  }

  // Get PWA status
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      isOnline: navigator.onLine,
      hasServiceWorker: !!this.swRegistration,
      updateAvailable: this.updateAvailable,
      canInstall: !!this.deferredPrompt
    };
  }
}

// Initialize PWA manager
export const pwaManager = new PWAManager();

// Add keyboard shortcut for PWA settings (Ctrl+Shift+P)
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'P') {
    event.preventDefault();
    pwaManager.showSettingsPanel();
  }
});

// Expose for debugging
window.pwaManager = pwaManager;