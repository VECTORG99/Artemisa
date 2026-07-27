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

// #385: the Creator is blocked on mobile (<768px) with a friendly message
// instead of rendering the cramped catalog/bundle UI.
test('creator shows a mobile block on small viewports', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('/agents/new');
    await expect(page.getByRole('heading', { name: /usa un computador/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /volver al inicio/i })).toBeVisible();
  } finally {
    await context.close();
  }
});
