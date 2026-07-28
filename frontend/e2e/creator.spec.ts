import { expect, test, type Page } from '@playwright/test';

import { waitForCreatorReady } from './helpers';

/**
 * End-to-end coverage of the Creator's four entry modes against a live
 * backend. These exercise the parts that unit tests cannot: the real workflow
 * contract (32 questions, 28 required), the real catalog (270+ items) and the
 * navigation between mode select, the question flow, review and completion.
 *
 * Requires the backend on http://localhost:3001.
 */

test.beforeEach(async ({ page }) => {
  // A leftover draft from a previous test would resume mid-flow.
  await page.goto('/agents/new');
  await waitForCreatorReady(page);
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto('/agents/new');
  await waitForCreatorReady(page);
});

async function currentPrompt(page: Page): Promise<string> {
  return (await page.getByRole('heading', { level: 2 }).first().innerText()).trim();
}

/** Answers whatever question is on screen, whatever its type. */
async function answerCurrentQuestion(page: Page) {
  // The panel morphs in over ~300ms; wait for a control before probing types.
  await page
    .locator('main input, main textarea, main [role="radio"], main [role="checkbox"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });

  const textarea = page.locator('main textarea');
  if (await textarea.count()) {
    await textarea.first().fill('Respuesta de prueba automatizada con suficiente detalle.');
    return;
  }
  const yes = page.getByRole('radio', { name: /^Sí/ });
  if (await yes.count()) {
    await yes.first().click();
    return;
  }
  const checkboxes = page.getByRole('checkbox');
  if (await checkboxes.count()) {
    await checkboxes.first().click();
    return;
  }
  const radios = page.getByRole('radio');
  if (await radios.count()) {
    await radios.first().click();
    return;
  }
  const text = page.locator('main input[type="text"]').first();
  if (await text.count()) {
    await text.fill('agente-de-prueba');
    return;
  }
  throw new Error(`No recognised input for question: ${await currentPrompt(page)}`);
}

/** Walks the question flow until Review appears. */
async function completeFlow(page: Page, maxSteps: number) {
  for (let step = 0; step < maxSteps; step++) {
    if (
      await page
        .getByRole('heading', { name: /Confirma antes de generar/ })
        .isVisible()
        .catch(() => false)
    )
      return;
    await answerCurrentQuestion(page);
    const advance = page.getByRole('button', { name: /Continuar|Guardar/ });
    await expect(advance).toBeEnabled();
    await advance.click();
    await page.waitForTimeout(250);
  }
  throw new Error(`Flow did not reach Review within ${maxSteps} steps`);
}

test('shows a loading state and then the four modes', async ({ page }) => {
  for (const label of ['Auto-corto', 'Auto-largo', 'Presets', 'Avanzado']) {
    await expect(page.getByRole('button', { name: new RegExp(label) })).toBeVisible();
  }
});

test('auto-corto reaches review and generates a bundle', async ({ page }) => {
  await page.getByRole('button', { name: /Auto-corto/ }).click();
  await expect(page.getByText(/Paso 1 de 8/)).toBeVisible();

  await completeFlow(page, 14);

  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible();
  // Issue #435: human labels, not internal ids.
  await expect(page.getByText('¿Cómo se llamará el agente?')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('agent_name');

  await page.getByRole('button', { name: /^Generar configuración$/ }).click();
  await expect(page.getByRole('heading', { name: /.+/, level: 2 }).first()).toBeVisible();
  await expect(page.getByText(/artefactos listos/)).toBeVisible({ timeout: 15000 });

  // The application guide and the manifest hashes must both be reachable.
  await page.getByRole('button', { name: /Cómo aplicarlo/ }).click();
  await expect(page.getByText(/Pasos de aplicación/)).toBeVisible();
  await page.getByRole('button', { name: /Manifest y hashes/ }).click();
  await expect(page.getByRole('columnheader', { name: 'SHA-256' })).toBeVisible();
});

test('auto-largo asks optional questions and lets them be skipped', async ({ page }) => {
  await page.getByRole('button', { name: /Auto-largo/ }).click();

  // agent_persona is the first optional question in declaration order.
  let sawOptional = false;
  for (let step = 0; step < 8; step++) {
    if (
      await page
        .getByText('Opcional', { exact: true })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      sawOptional = true;
      await expect(page.getByRole('button', { name: /Omitir/ })).toBeVisible();
      await page.getByRole('button', { name: /Omitir/ }).click();
      await page.waitForTimeout(250);
      break;
    }
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /Continuar/ }).click();
    await page.waitForTimeout(250);
  }
  expect(sawOptional, 'auto-largo must reach at least one optional question').toBe(true);
});

test('auto-largo walks the whole tree and generates a bundle', async ({ page }) => {
  // The strongest end-to-end proof: 32 questions, every conditional branch the
  // chosen answers open, then a real /generate call.
  await page.getByRole('button', { name: /Auto-largo/ }).click();

  for (let step = 0; step < 45; step++) {
    if (
      await page
        .getByRole('heading', { name: /Confirma antes de generar/ })
        .isVisible()
        .catch(() => false)
    )
      break;
    const optional = await page
      .getByText('Opcional', { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (optional) {
      await page
        .locator('main')
        .getByRole('button', { name: /Omitir/ })
        .click();
    } else {
      await answerCurrentQuestion(page);
      await page
        .locator('main')
        .getByRole('button', { name: /Continuar/ })
        .click();
    }
    await page.waitForTimeout(220);
  }

  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /^Generar configuración$/ }).click();
  await expect(page.getByText(/artefactos listos/)).toBeVisible({ timeout: 20000 });
});

test('the back button actually returns to the previous question', async ({ page }) => {
  await page.getByRole('button', { name: /Auto-largo/ }).click();

  const first = await currentPrompt(page);
  await answerCurrentQuestion(page);
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.waitForTimeout(400);

  const second = await currentPrompt(page);
  expect(second).not.toBe(first);

  // Two controls are labelled "Atrás": the fixed icon button and the action
  // bar. The action bar one is the flow control under test.
  await page
    .locator('main')
    .getByRole('button', { name: /^Atrás$/ })
    .last()
    .click();
  await page.waitForTimeout(600);
  expect(await currentPrompt(page)).toBe(first);

  // The previous answer is preserved rather than cleared.
  await expect(page.getByRole('button', { name: /Continuar/ })).toBeEnabled();
});

test('presets validate against the backend and open review', async ({ page }) => {
  await page.getByRole('button', { name: /Presets/ }).click();
  await expect(page.getByRole('heading', { name: /Elige un punto de partida/ })).toBeVisible();

  // The cards must describe what the preset decides, not just prose.
  await expect(page.getByText('Entorno').first()).toBeVisible();
  await expect(page.getByText('Autonomía').first()).toBeVisible();

  await page
    .getByRole('button', { name: /Usar preset/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /^Generar configuración$/ })).toBeEnabled();
});

test('review lets a single answer be edited and returns to review', async ({ page }) => {
  await page.getByRole('button', { name: /Presets/ }).click();
  await page
    .getByRole('button', { name: /Usar preset/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /^Editar: ¿Cómo se llamará el agente\?$/ }).click();
  await expect(page.getByRole('heading', { name: /¿Cómo se llamará el agente\?/ })).toBeVisible();

  await page.locator('input[type="text"]').first().fill('editado-por-e2e');
  await page.getByRole('button', { name: /^Guardar$/ }).click();

  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('editado-por-e2e')).toBeVisible();
});

test('advanced mode blocks generation until every required answer exists', async ({ page }) => {
  await page.getByRole('button', { name: /Avanzado/ }).click();

  const generate = page.getByRole('button', { name: /Revisar y generar/ });
  await expect(generate).toBeDisabled();
  await expect(page.getByText(/Respuestas obligatorias pendientes: \d+/)).toBeVisible();

  // The sections nav must expose which section is still incomplete and
  // navigate to its questions (the dashboard groups blockers by section
  // instead of listing every pending question).
  const sections = page.getByRole('navigation', { name: /secciones|sections/i });
  await expect(sections).toBeVisible();
  await sections.getByRole('button', { name: /Identidad/ }).click();
  await expect(page.locator('#advanced-question-agent_name')).toBeVisible();

  // Global search spans sections.
  await page.getByLabel('Buscar preguntas').fill('autonomía');
  await expect(page.getByText(/Resultados para/)).toBeVisible();
});

test('advanced mode reaches review from a preset baseline', async ({ page }) => {
  // Seed a complete answer set through Presets, then switch to Advanced: the
  // answers persist across modes, so Advanced must become generatable.
  await page.getByRole('button', { name: /Presets/ }).click();
  await page
    .getByRole('button', { name: /Usar preset/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible({ timeout: 15000 });

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: /¿Cómo quieres configurar tu agente\?/ })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: /Avanzado/ }).click();

  const generate = page.getByRole('button', { name: /Revisar y generar/ });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByRole('heading', { name: /Confirma antes de generar/ })).toBeVisible({ timeout: 15000 });
});

test('the draft survives a reload', async ({ page }) => {
  await page.getByRole('button', { name: /Auto-largo/ }).click();
  await answerCurrentQuestion(page);
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.waitForTimeout(400);
  const before = await currentPrompt(page);

  await page.reload();
  await expect(page.getByRole('heading', { name: before })).toBeVisible({ timeout: 15000 });
});

test('the shortcuts overlay opens with ?', async ({ page }) => {
  // Playwright's `press('?')` does not emit `key === '?'`; Shift+Slash does.
  await page.keyboard.press('Shift+Slash');
  await expect(page.getByRole('dialog', { name: /Atajos de teclado/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Atajos de teclado/ })).not.toBeVisible();
});
