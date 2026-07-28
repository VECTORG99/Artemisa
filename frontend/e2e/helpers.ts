import { expect, type Page } from '@playwright/test';

/**
 * Waits until the Creator finished its initial load.
 *
 * `/agents/new` renders a loading state while it fetches the catalog and the
 * workflow from the backend, so any assertion made right after `goto` races
 * that request (issue #725). Every spec that lands on the Creator waits here
 * first, with a timeout sized for a cold backend on a shared runner.
 */
export async function waitForCreatorReady(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /¿Cómo quieres configurar tu agente\?/ })).toBeVisible({
    timeout: 30_000,
  });
}
