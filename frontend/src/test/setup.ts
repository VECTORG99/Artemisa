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
  // Web storage survives between tests in the same jsdom environment, so a
  // test that persists state (e.g. `artemisa-locale=en` from the locale
  // switcher) changed the result of a later test depending on ordering. The
  // failure only showed up in CI, where the storage writes actually land.
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Storage may be unavailable in some environments; nothing to reset then.
  }
});
