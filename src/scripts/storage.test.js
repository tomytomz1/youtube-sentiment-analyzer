import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from './storage.js';

describe('StorageManager', () => {
  let storageManager;
  let localStorageMock;

  beforeEach(() => {
    storageManager = new StorageManager();
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  describe('loadHistory', () => {
    it('should load history from localStorage', () => {
      const mockHistory = [
        { url: 'https://youtube.com/watch?v=123', title: 'Test Video', date: Date.now() }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));

      const result = storageManager.loadHistory();
      expect(result).toEqual(mockHistory);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('analyzedVideos');
    });

    it('should return empty array if no history exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = storageManager.loadHistory();
      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = storageManager.loadHistory();
      expect(result).toEqual([]);
    });
  });

  describe('addToHistory', () => {
    it('should add new item to history', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      const result = storageManager.addToHistory('https://youtube.com/watch?v=123', 'Test Video');
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(result[0]).toMatchObject({
        url: 'https://youtube.com/watch?v=123',
        title: 'Test Video'
      });
    });

    it('should move existing item to top', () => {
      const existingHistory = [
        { url: 'https://youtube.com/watch?v=456', title: 'Other Video', date: Date.now() - 1000 },
        { url: 'https://youtube.com/watch?v=123', title: 'Test Video', date: Date.now() - 2000 }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));

      const result = storageManager.addToHistory('https://youtube.com/watch?v=123', 'Test Video');
      
      expect(result[0].url).toBe('https://youtube.com/watch?v=123');
      expect(result).toHaveLength(2);
    });

    it('should limit history to MAX_HISTORY items', () => {
      const existingHistory = Array.from({ length: 10 }, (_, i) => ({
        url: `https://youtube.com/watch?v=${i}`,
        title: `Video ${i}`,
        date: Date.now() - i * 1000
      }));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));

      storageManager.addToHistory('https://youtube.com/watch?v=new', 'New Video');
      
      // Check that setItem was called with correct data
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const savedData = JSON.parse(setItemCall[1]);
      expect(savedData).toHaveLength(10);
      expect(savedData[0].url).toBe('https://youtube.com/watch?v=new');
    });
  });

  describe('clearHistory', () => {
    it('should clear localStorage', () => {
      const result = storageManager.clearHistory();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('analyzedVideos');
      expect(result).toBe(true);
    });

    it('should handle localStorage errors', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = storageManager.clearHistory();
      expect(result).toBe(false);
    });
  });

  describe('displayHistory', () => {
    it('should display history in UI', () => {
      const mockHistory = [
        { url: 'https://youtube.com/watch?v=123', title: 'Test Video', date: Date.now() }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));

      const historyContainer = document.createElement('div');
      const historyList = document.createElement('div');
      const elements = { urlInput: document.createElement('input'), form: document.createElement('form') };

      storageManager.displayHistory(historyContainer, historyList, elements);

      expect(historyContainer.classList.contains('hidden')).toBe(false);
      expect(historyList.children.length).toBe(1);
      expect(historyList.children[0].textContent).toBe('Test Video');
    });

    it('should handle empty history', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const historyContainer = document.createElement('div');
      historyContainer.classList.add('hidden'); // Start hidden
      const historyList = document.createElement('div');
      const elements = {};

      storageManager.displayHistory(historyContainer, historyList, elements);

      expect(historyContainer.classList.contains('hidden')).toBe(true);
    });
  });
});