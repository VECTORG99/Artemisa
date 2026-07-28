import { devices, expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /artemisa/i })).toBeVisible();
});

test('creator route shows the mode selector', async ({ page }) => {
  await page.goto('/agents/new');
  // The Creator opens on mode select; it has no "Agent Creator" heading.
  await expect(page.getByRole('heading', { name: /¿Cómo quieres configurar tu agente\?/ })).toBeVisible();
});

// #385: the Creator is blocked on touch-only devices (phones/tablets) with a
// friendly message instead of rendering the cramped catalog/bundle UI. The gate
// is `(pointer: coarse) and (hover: none)`, not a width breakpoint — a desktop
// with a narrow window still gets the Creator.
test('creator shows a desktop-only notice on touch devices', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  try {
    await page.goto('/agents/new');
    await expect(page.getByRole('heading', { name: /herramienta de escritorio/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ir al inicio/i })).toBeVisible();
  } finally {
    await context.close();
  }
});
