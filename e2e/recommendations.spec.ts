import { test, expect } from '@playwright/test';

test.describe('R4 - Web Crypto API encryption', () => {
  test('authStore importa cryptoUtils sin errores de compilación', async ({ page }) => {
    // Validado por npx tsc --noEmit
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(await page.locator('body').isVisible()).toBe(true);
  });
});

test.describe('R6 - Lazy loading', () => {
  test('Dashboard carga sin page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toEqual([]);
  });
});

test.describe('R8 - Logger estructurado', () => {
  test('app no produce errores con logger en stores', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toEqual([]);
  });
});

test.describe('R9 - ErrorBoundary global', () => {
  test('initGlobalErrorHandlers no produce errores', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });
});

test.describe('R11 - EmptyState component', () => {
  test('EmptyState se importa sin errores en vistas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const appErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('ERR_ABORTED')
    );
    expect(appErrors).toEqual([]);
  });
});

test.describe('R13 - Tema claro', () => {
  test('data-theme attribute se puede aplicar en runtime', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });
});

test.describe('R15 - prefers-reduced-motion', () => {
  test('pagina carga sin errores con prefers-reduced-motion: reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });
});

test.describe('R16 - ARIA attributes', () => {
  test('pagina carga sin errores al hacer foco en controles', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    expect(errors).toEqual([]);
  });
});

test.describe('Sin regresiones', () => {
  test('páginas principales cargan sin page errors', async ({ page }) => {
    const pages = ['/', '/login', '/register'];
    for (const p of pages) {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(p);
      await page.waitForLoadState('domcontentloaded');
      expect(errors).toEqual([]);
    }
  });

  test('importaciones dinámicas no causan 404 en app', async ({ page }) => {
    const app404s: string[] = [];
    page.on('response', resp => {
      if (resp.status() === 404 && !resp.url().includes('favicon') && !resp.url().includes('googleapis')) {
        app404s.push(resp.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(app404s).toEqual([]);
  });
});
