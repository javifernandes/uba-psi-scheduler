import { expect, test } from '@playwright/test';

test.describe('Tour - Paso 1', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1120 });
  });

  test('abre dropdown de catedras al iniciar el recorrido', async ({ page }) => {
    await page.goto('/uba/psicologia/oferta/lic-psicologia/scheduler');

    await page.getByRole('button', { name: 'Tour' }).click();

    await expect(page.getByText('Bienvenido al planificador')).toBeVisible();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await expect(page.getByText('Paso 1: elegir catedra')).toBeVisible();
    await expect
      .poll(async () => page.evaluate(() => document.body.dataset.schedulerTourStep), {
        timeout: 3_000,
      })
      .toBe('select-subject');

    const subjectDropdown = page.getByTestId('subject-dropdown');
    await expect(subjectDropdown).toBeVisible();

    const subjectOptions = page.getByTestId('subject-option');
    await expect
      .poll(async () => subjectOptions.count(), {
        timeout: 3_000,
      })
      .toBeGreaterThan(1);
    await expect(subjectOptions.first()).toBeVisible();

    // Detecta flicker: el dropdown debe seguir abierto y usable durante un rato.
    await page.waitForTimeout(1200);
    await expect(subjectDropdown).toBeVisible();
    await expect(subjectOptions.first()).toBeVisible();

    // Debe permitir seleccionar una opción durante el paso 1.
    await subjectOptions.first().click();
    await expect(page.getByText('Paso 2: lectura general')).toBeVisible();
  });

  test('con estado previo persiste paso 1 usable y abierto', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('uba_psico_scheduler_tour_seen_v1', '1');
      localStorage.setItem('uba_psico_planner_v1', JSON.stringify({ random_subject: '999' }));
    });

    await page.goto('/uba/psicologia/oferta/lic-psicologia/scheduler');
    await page.getByRole('button', { name: 'Tour' }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    await expect(page.getByText('Paso 1: elegir catedra')).toBeVisible();
    await expect(page.getByTestId('subject-dropdown')).toBeVisible();
    await expect
      .poll(async () => page.getByTestId('subject-option').count(), {
        timeout: 3_000,
      })
      .toBeGreaterThan(1);
  });
});
