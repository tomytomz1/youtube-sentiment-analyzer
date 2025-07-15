// Advanced accessibility features for perfect a11y compliance
export class AccessibilityManager {
  constructor() {
    this.prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    this.currentContrastMode = 'normal';
    this.announcements = [];
    
    this.init();
  }

  init() {
    this.setupContrastModes();
    this.setupScreenReader();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupMotionPreferences();
    this.setupAnnouncements();
  }

  // Set up contrast modes
  setupContrastModes() {
    // Create contrast mode toggle button
    const contrastToggle = document.createElement('button');
    contrastToggle.id = 'contrast-toggle';
    contrastToggle.className = 'fixed top-20 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    contrastToggle.setAttribute('aria-label', 'Toggle high contrast mode');
    contrastToggle.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
      </svg>
    `;

    document.body.appendChild(contrastToggle);

    // Add contrast mode styles
    const contrastStyles = document.createElement('style');
    contrastStyles.id = 'contrast-styles';
    contrastStyles.textContent = `
      .high-contrast {
        --bg-primary: #000000 !important;
        --bg-secondary: #1a1a1a !important;
        --text-primary: #ffffff !important;
        --text-secondary: #e0e0e0 !important;
        --border-color: #ffffff !important;
        --button-bg: #ffffff !important;
        --button-text: #000000 !important;
        --link-color: #ffff00 !important;
        --focus-ring: #ffff00 !important;
      }

      .high-contrast * {
        background-color: var(--bg-primary) !important;
        color: var(--text-primary) !important;
        border-color: var(--border-color) !important;
      }

      .high-contrast button {
        background-color: var(--button-bg) !important;
        color: var(--button-text) !important;
        border: 2px solid var(--border-color) !important;
      }

      .high-contrast a {
        color: var(--link-color) !important;
        text-decoration: underline !important;
      }

      .high-contrast input, .high-contrast textarea {
        background-color: var(--bg-secondary) !important;
        color: var(--text-primary) !important;
        border: 2px solid var(--border-color) !important;
      }

      .high-contrast :focus {
        outline: 3px solid var(--focus-ring) !important;
        outline-offset: 2px !important;
      }

      /* Reduced motion styles */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(contrastStyles);

    // Toggle contrast mode
    contrastToggle.addEventListener('click', () => {
      this.toggleContrastMode();
    });

    // Keyboard shortcut for contrast toggle (Ctrl+Shift+C)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.toggleContrastMode();
      }
    });

    // Respect system preference
    if (this.prefersHighContrast.matches) {
      this.enableHighContrast();
    }
  }

  // Toggle contrast mode
  toggleContrastMode() {
    if (this.currentContrastMode === 'normal') {
      this.enableHighContrast();
    } else {
      this.disableHighContrast();
    }
  }

  // Enable high contrast mode
  enableHighContrast() {
    document.body.classList.add('high-contrast');
    this.currentContrastMode = 'high';
    this.announceToScreenReader('High contrast mode enabled');
    localStorage.setItem('contrastMode', 'high');
  }

  // Disable high contrast mode
  disableHighContrast() {
    document.body.classList.remove('high-contrast');
    this.currentContrastMode = 'normal';
    this.announceToScreenReader('High contrast mode disabled');
    localStorage.setItem('contrastMode', 'normal');
  }

  // Set up screen reader announcements
  setupScreenReader() {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'screen-reader-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);

    // Create urgent announcement region
    const urgentRegion = document.createElement('div');
    urgentRegion.id = 'urgent-announcements';
    urgentRegion.setAttribute('aria-live', 'assertive');
    urgentRegion.setAttribute('aria-atomic', 'true');
    urgentRegion.className = 'sr-only';
    urgentRegion.style.cssText = liveRegion.style.cssText;
    document.body.appendChild(urgentRegion);
  }

  // Announce to screen reader
  announceToScreenReader(message, urgent = false) {
    const regionId = urgent ? 'urgent-announcements' : 'screen-reader-announcements';
    const region = document.getElementById(regionId);
    
    if (region) {
      // Clear previous announcement
      region.textContent = '';
      
      // Add new announcement after a brief delay
      setTimeout(() => {
        region.textContent = message;
        
        // Clear after 1 second to prevent clutter (shorter for testing)
        setTimeout(() => {
          region.textContent = '';
        }, 1000);
      }, 100);
    }
  }

  // Set up enhanced keyboard navigation
  setupKeyboardNavigation() {
    // Add skip links
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#analysis-form" class="skip-link">Skip to analyzer</a>
      <a href="#faq" class="skip-link">Skip to FAQ</a>
    `;

    // Style skip links
    const skipStyles = document.createElement('style');
    skipStyles.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        z-index: 1000;
      }
      
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1001;
      }
      
      .skip-link:focus {
        top: 6px;
        outline: 2px solid #ffff00;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(skipStyles);
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Enhanced focus indicators
    const focusStyles = document.createElement('style');
    focusStyles.textContent = `
      *:focus {
        outline: 3px solid #2563eb !important;
        outline-offset: 2px !important;
      }
      
      button:focus,
      input:focus,
      textarea:focus,
      select:focus {
        outline: 3px solid #2563eb !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 1px #2563eb !important;
      }
    `;
    document.head.appendChild(focusStyles);

    // Keyboard shortcut help
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F1' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        this.showKeyboardHelp();
      }
    });
  }

  // Show keyboard help modal
  showKeyboardHelp() {
    const helpModal = document.createElement('div');
    helpModal.id = 'keyboard-help-modal';
    helpModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    helpModal.setAttribute('role', 'dialog');
    helpModal.setAttribute('aria-labelledby', 'keyboard-help-title');
    helpModal.setAttribute('aria-modal', 'true');
    
    helpModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h2 id="keyboard-help-title" class="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
        <div class="space-y-2 text-sm">
          <div><kbd class="bg-gray-100 px-2 py-1 rounded">Ctrl+Shift+C</kbd> - Toggle high contrast</div>
          <div><kbd class="bg-gray-100 px-2 py-1 rounded">Ctrl+Enter</kbd> - Analyze video (when URL input focused)</div>
          <div><kbd class="bg-gray-100 px-2 py-1 rounded">Escape</kbd> - Clear results</div>
          <div><kbd class="bg-gray-100 px-2 py-1 rounded">F1</kbd> - Show this help</div>
          <div><kbd class="bg-gray-100 px-2 py-1 rounded">Tab</kbd> - Navigate forward</div>
          <div><kbd class="bg-gray-100 px-2 py-1 rounded">Shift+Tab</kbd> - Navigate backward</div>
        </div>
        <button id="close-keyboard-help" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Focus management
    const closeButton = helpModal.querySelector('#close-keyboard-help');
    closeButton.focus();
    
    // Close modal
    const closeModal = () => {
      helpModal.remove();
      this.announceToScreenReader('Keyboard help closed');
    };
    
    closeButton.addEventListener('click', closeModal);
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) closeModal();
    });
    
    // Escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    this.announceToScreenReader('Keyboard help opened');
  }

  // Set up focus management
  setupFocusManagement() {
    // Focus trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
          if (modal.style.display !== 'none' && !modal.classList.contains('hidden')) {
            this.trapFocus(modal, e);
          }
        });
      }
    });
  }

  // Trap focus within element
  trapFocus(element, event) {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        event.preventDefault();
      }
    }
  }

  // Set up motion preferences
  setupMotionPreferences() {
    if (this.prefersReducedMotion.matches) {
      document.body.classList.add('reduce-motion');
    }
    
    this.prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
    });
  }

  // Set up dynamic announcements
  setupAnnouncements() {
    // Announce when analysis starts
    const observeAnalysis = () => {
      const loadingState = document.getElementById('loading-state');
      if (loadingState) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const isHidden = loadingState.classList.contains('hidden');
              if (!isHidden) {
                this.announceToScreenReader('Analysis started. Please wait while we analyze the video comments.');
              }
            }
          });
        });
        
        observer.observe(loadingState, { attributes: true });
      }
    };

    // Announce when results are ready
    const observeResults = () => {
      const resultsContainer = document.getElementById('results-container');
      if (resultsContainer) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              const isHidden = resultsContainer.classList.contains('hidden');
              if (!isHidden) {
                setTimeout(() => {
                  const positive = document.getElementById('positive-percentage')?.textContent || '0%';
                  const neutral = document.getElementById('neutral-percentage')?.textContent || '0%';
                  const negative = document.getElementById('negative-percentage')?.textContent || '0%';
                  
                  this.announceToScreenReader(
                    `Analysis complete. Results: ${positive} positive, ${neutral} neutral, ${negative} negative sentiment.`
                  );
                }, 500);
              }
            }
          });
        });
        
        observer.observe(resultsContainer, { attributes: true });
      }
    };

    // Set up observers when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        observeAnalysis();
        observeResults();
      });
    } else {
      observeAnalysis();
      observeResults();
    }
  }

  // Load saved preferences
  loadPreferences() {
    const savedContrast = localStorage.getItem('contrastMode');
    if (savedContrast === 'high') {
      this.enableHighContrast();
    }
  }
}

// Initialize accessibility manager
export const accessibilityManager = new AccessibilityManager();

// Load preferences on page load
document.addEventListener('DOMContentLoaded', () => {
  accessibilityManager.loadPreferences();
});