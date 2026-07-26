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

test('dashboard route accessible', async ({ page }) => {
  await page.goto('/dashboard');
  // The dashboard heading comes from the i18n `dashboard.heading` namespace.
  await expect(page.getByRole('heading', { name: /Huascar Builder/i })).toBeVisible();
});
