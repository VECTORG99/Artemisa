import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement scrollIntoView; stub it so components that call
// it on mount (e.g. auto-scrolling terminal output) don't throw in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Automatic cleanup after each test
afterEach(() => {
  cleanup();
});
