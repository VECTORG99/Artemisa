import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ServiceWorkerRegister } from './service-worker-register';

function createEventTarget() {
  const listeners = new Map<string, Set<EventListener>>();

  return {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener);
    }),
    dispatch(type: string) {
      for (const listener of listeners.get(type) || []) listener(new Event(type));
    },
  };
}

describe('ServiceWorkerRegister (#408)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

  it('shows an update notice for an installed update and asks it to activate on reload click', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const registration = createEventTarget() as ReturnType<typeof createEventTarget> & {
      installing:
        | (ReturnType<typeof createEventTarget> & {
            state: ServiceWorkerState;
            postMessage: ReturnType<typeof vi.fn>;
          })
        | null;
      waiting?: ServiceWorker;
    };
    const worker = {
      ...createEventTarget(),
      state: 'installing' as ServiceWorkerState,
      postMessage: vi.fn(),
    };
    registration.installing = null;
    const serviceWorker = {
      controller: {},
      register: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('navigator', { serviceWorker });
    render(<ServiceWorkerRegister />);

    await waitFor(() => expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js'));

    await act(async () => {
      registration.installing = worker;
      registration.dispatch('updatefound');
      worker.state = 'installed';
      worker.dispatch('statechange');
    });

    expect(screen.getByText('Hay una version nueva disponible.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('does not show the update notice during first service worker install', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const registration = createEventTarget() as ReturnType<typeof createEventTarget> & {
      installing: ReturnType<typeof createEventTarget> & {
        state: ServiceWorkerState;
        postMessage: ReturnType<typeof vi.fn>;
      };
    };
    const worker = {
      ...createEventTarget(),
      state: 'installing' as ServiceWorkerState,
      postMessage: vi.fn(),
    };
    registration.installing = worker;
    const serviceWorker = {
      controller: null,
      register: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('navigator', { serviceWorker });
    render(<ServiceWorkerRegister />);

    await waitFor(() => expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js'));

    await act(async () => {
      registration.dispatch('updatefound');
      worker.state = 'installed';
      worker.dispatch('statechange');
    });

    expect(screen.queryByText('Hay una version nueva disponible.')).not.toBeInTheDocument();
  });
});
