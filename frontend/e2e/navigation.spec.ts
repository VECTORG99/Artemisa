import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /huascar/i })).toBeVisible();
});

test('landing remains scrollable and usable at 360x640', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const scrollContainer = page.locator('#space-scroll-container');
    await expect(page.getByRole('heading', { name: /huascar/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /inicio rápido/i })).toBeVisible();
    await expect
      .poll(() => scrollContainer.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);
    await page.getByRole('link', { name: /generar configuración/i }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: /generar configuración/i })).toBeInViewport();
  } finally {
    await context.close();
  }
});

test('creator route shows the mode selector', async ({ page }) => {
  await page.goto('/agents/new');
  // The Creator opens on mode select; it has no "Agent Creator" heading.
  await expect(page.getByRole('heading', { name: /¿Cómo quieres configurar tu agente\?/ })).toBeVisible();
});

// #571: the dense editor stays protected on mobile, but the fallback must
// provide useful actions instead of becoming a dead end.
test('creator mobile fallback offers prompt and documentation', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('/agents/new');
    await expect(page.getByRole('heading', { name: /pantalla más amplia/i })).toBeVisible();
    await expect(page.getByText(/gira el dispositivo a horizontal/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: /inicio rápido/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /leer documentación/i })).toHaveAttribute('href', '/docs');
    await expect(page.getByRole('link', { name: /volver al inicio/i })).toBeVisible();
  } finally {
    await context.close();
  }
});
