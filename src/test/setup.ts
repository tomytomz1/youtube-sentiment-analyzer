/**
 * Vitest Test Setup
 * Basic configuration for running tests
 */

import { beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Global test setup
beforeEach(() => {
  // Clean up before each test
  document.body.innerHTML = '';
  
  // Mock console methods to avoid noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Global mocks for browser APIs
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true,
});

Object.defineProperty(window, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock ResizeObserver (if not available in test environment)
if (!global.ResizeObserver) {
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })) as any;
}

// Mock IntersectionObserver (if not available in test environment)
if (!global.IntersectionObserver) {
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })) as any;
}

// Export common test utilities
export const createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

export const createMockFetch = (response: any, status = 200) => {
  const mockResponse = createMockResponse(response, status);
  return vi.fn(() => Promise.resolve(mockResponse));
};

export const waitFor = (callback: () => void | Promise<void>, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = async () => {
      try {
        await callback();
        resolve(undefined);
      } catch (error) {
        if (Date.now() - start > timeout) {
          reject(error);
        } else {
          setTimeout(check, 10);
        }
      }
    };
    check();
  });
};