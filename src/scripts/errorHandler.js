// Enhanced error handling and logging system
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.setupGlobalErrorHandling();
  }

  // Set up global error handling
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandledRejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
      
      // Prevent the default browser behavior
      event.preventDefault();
      
      // Show user-friendly error message
      this.showUserError('Something went wrong. Please try again.');
    });

    // Handle general JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'javascriptError',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Handle network errors
    window.addEventListener('offline', () => {
      this.showUserError('You appear to be offline. Please check your internet connection.');
    });
  }

  // Log error with structured format
  logError(error) {
    const errorEntry = {
      id: Date.now() + Math.random(),
      ...error,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorLog.push(errorEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorEntry);
    }

    // In production, you might want to send to an error tracking service
    // this.sendToErrorService(errorEntry);
  }

  // Show user-friendly error message
  showUserError(message, duration = 5000) {
    this.removeExistingErrorNotification();
    
    const errorNotification = document.createElement('div');
    errorNotification.id = 'error-notification';
    errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
    errorNotification.innerHTML = `
      <div class="flex items-center justify-between">
        <span>${this.escapeHtml(message)}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(errorNotification);

    // Auto-remove after specified duration
    setTimeout(() => {
      this.removeExistingErrorNotification();
    }, duration);
  }

  // Remove existing error notification
  removeExistingErrorNotification() {
    const existing = document.getElementById('error-notification');
    if (existing) {
      existing.remove();
    }
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Wrapper for API calls with error handling
  async handleApiCall(apiCall, options = {}) {
    const {
      retries = 3,
      retryDelay = 1000,
      fallbackMessage = 'An error occurred. Please try again.',
      onError = null
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        this.logError({
          type: 'apiError',
          message: error.message,
          stack: error.stack,
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    // All retries failed
    if (onError) {
      onError(lastError);
    } else {
      this.showUserError(fallbackMessage);
    }
    
    throw lastError;
  }

  // Create retry mechanism for failed operations
  createRetryFunction(operation, maxRetries = 3) {
    return async (...args) => {
      return this.handleApiCall(
        () => operation(...args),
        { retries: maxRetries }
      );
    };
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      recent: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
  }

  // Export error log for debugging
  exportErrorLog() {
    return JSON.stringify(this.errorLog, null, 2);
  }
}

// Create global instance
export const errorHandler = new ErrorHandler();