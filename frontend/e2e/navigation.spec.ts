import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /huascar/i })).toBeVisible();
});

test('creator route shows the mode selector', async ({ page }) => {
  await page.goto('/agents/new');
  // The Creator opens on mode select; it has no "Agent Creator" heading.
  await expect(page.getByRole('heading', { name: /¿Cómo quieres configurar tu agente\?/ })).toBeVisible();
});
