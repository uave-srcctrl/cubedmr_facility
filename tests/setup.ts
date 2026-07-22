/**
 * Vitest Setup File
 *
 * Configures the test environment before running tests. It is environment-aware:
 * DOM-specific mocks (matchMedia, localStorage, RTL cleanup) are only applied when
 * a `window` exists (jsdom environment). Pure-function tests that declare
 * `// @vitest-environment node` skip those and run without a DOM.
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

const hasWindow = typeof window !== 'undefined';

// Cleanup after each test (only meaningful when a DOM is present)
afterEach(() => {
  if (hasWindow) cleanup();
});

if (hasWindow) {
  // Mock window.matchMedia
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

  // Mock localStorage / sessionStorage
  const storageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: storageMock });
  Object.defineProperty(window, 'sessionStorage', { value: storageMock });
}

// Mock fetch (safe in both node and jsdom)
global.fetch = vi.fn();

// Mock crypto for secure-storage tests. Guarded: the Node runtime already
// provides a global `crypto`, and it may be non-configurable.
try {
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: {
      subtle: {
        importKey: vi.fn(),
        deriveKey: vi.fn(),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        generateKey: vi.fn(),
      },
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
  });
} catch {
  // crypto already provided by the runtime — leave it as-is
}

// Environment variables for tests
process.env.NODE_ENV = 'test';
