/**
 * Test environment setup, loaded before every suite.
 *
 * Clearing localStorage after each test matters here because the theme and the
 * session token both live there, so a leaked value would carry a signed-in or
 * light-mode state into the next test.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// jsdom does not implement matchMedia, which ThemeProvider reads on mount.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })
});
