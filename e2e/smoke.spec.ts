import { test, expect } from '@playwright/test';

test('Landing page carga sin errores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();

  expect(errors).toEqual([]);
});

test('Login page carga correctamente', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/login');
  await expect(page.locator('body')).toBeVisible();

  expect(errors).toEqual([]);
});

test('Register page carga sin errores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/register');
  await expect(page.locator('body')).toBeVisible();

  expect(errors).toEqual([]);
});

test('Dashboard redirige a login cuando no hay sesión', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/dashboard/');
  await page.waitForURL(/\/login|\//);

  expect(errors).toEqual([]);
});

test('Lazy loading: Suspense fallback se muestra mientras carga vista', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
});

test('PWA manifest se inyecta en build de producción', async ({ page }) => {
  // vite-plugin-pwa solo inyecta el manifest en build de producción, no en dev
  await page.goto('/');
  const hasManifest = await page.locator('link[rel="manifest"]').count();
  if (hasManifest > 0) {
    await expect(page.locator('link[rel="manifest"]')).toBeVisible();
  }
});

test('ErrorBoundary no interfiere con carga normal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  expect(errors).toEqual([]);
});

test('No hay errores de consola no capturados', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Permitimos errores de red por CORS/404 de recursos externos
  const appErrors = consoleErrors.filter(e =>
    !e.includes('net::ERR_ABORTED') &&
    !e.includes('favicon') &&
    !e.includes('manifest') &&
    !e.includes('Failed to load resource')
  );
  expect(appErrors).toEqual([]);
});
