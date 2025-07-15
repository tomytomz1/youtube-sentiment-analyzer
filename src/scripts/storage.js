// Storage utilities for managing local storage and history
export class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'analyzedVideos';
    this.MAX_HISTORY = 10;
  }

  // Load analysis history from localStorage
  loadHistory() {
    try {
      const history = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      return history;
    } catch (error) {
      console.warn('Could not load history:', error);
      return [];
    }
  }

  // Add item to history
  addToHistory(url, title) {
    try {
      const history = this.loadHistory();
      const existing = history.findIndex(item => item.url === url);
      if (existing !== -1) {
        history.splice(existing, 1);
      }
      history.unshift({ url, title, date: Date.now() });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history.slice(0, this.MAX_HISTORY)));
      return history;
    } catch (error) {
      console.warn('Could not save to history:', error);
      return [];
    }
  }

  // Display history in UI
  displayHistory(historyContainer, historyList, elements) {
    const history = this.loadHistory();
    if (history.length > 0 && historyContainer && historyList) {
      historyContainer.classList.remove('hidden');
      historyList.innerHTML = '';
      history.slice(0, 5).forEach(item => {
        if (item && typeof item.title === 'string' && typeof item.url === 'string') {
          const button = document.createElement('button');
          button.className = 'text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700 truncate max-w-xs';
          button.textContent = item.title;
          button.title = item.url;
          button.onclick = () => {
            if (elements.urlInput && elements.form) {
              elements.urlInput.value = item.url;
              elements.form.dispatchEvent(new Event('submit'));
            }
          };
          historyList.appendChild(button);
        }
      });
    }
  }

  // Clear history
  clearHistory() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn('Could not clear history:', error);
      return false;
    }
  }
}