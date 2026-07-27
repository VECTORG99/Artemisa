import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ServiceWorkerRegister } from './service-worker-register';

describe('ServiceWorkerRegister (#408)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not register in development', () => {
    const register = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    render(<ServiceWorkerRegister />);
    expect(register).not.toHaveBeenCalled();
  });

  it('does not throw when serviceWorker is unsupported', () => {
    vi.stubGlobal('navigator', {});
    expect(() => render(<ServiceWorkerRegister />)).not.toThrow();
  });
});
