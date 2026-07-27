import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LocaleProvider } from '@/i18n';

/**
 * Custom render that wraps components with providers.
 * Add global providers here as they're added to the app.
 */
function Providers({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
