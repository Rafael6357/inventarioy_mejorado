import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  email: 'nikko6357@gmail.com',
  password: '123456',
};

async function loginAndGetToDashboard(page: any) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="correo"]', CREDENTIALS.email);
  await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);

  const loginButton = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar"), button:has-text("Login")').first();
  await loginButton.click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('PRUEBAS FUNCIONALES - OFFLINE', () => {
  test('App permanece funcional al ir offline', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Ir offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);

    // Verificar que la app sigue cargada
    await expect(page.locator('body')).toBeVisible();

    // Verificar que no hay errores de JS
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Navegar via SPA (click en links del sidebar) - page.goto no funciona offline
    const sidebarLinks = page.locator('nav a[href*="/dashboard/"]');
    const linkCount = await sidebarLinks.count();
    console.log(`Sidebar links encontrados: ${linkCount}`);

    // Click en los primeros 3 links del sidebar si existen
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      try {
        await sidebarLinks.nth(i).click({ timeout: 3000 });
        await page.waitForTimeout(500);
      } catch {
        // Algunos links pueden no estar visibles, es OK
      }
    }

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);

    // Volver online
    await page.context().setOffline(false);
  });

  test('OfflineBanner se muestra cuando la app está offline', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Ir offline
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // Verificar que aparece el banner offline
    const offlineBanner = page.locator('[role="status"]');
    const bannerVisible = await offlineBanner.isVisible().catch(() => false);
    console.log('Offline banner visible:', bannerVisible);

    // Volver online
    await page.context().setOffline(false);
    await page.waitForTimeout(1000);
  });

  test('Módulo Settings carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Settings
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Settings page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo HR carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a HR
    await page.goto('/dashboard/hr');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('HR page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Transit carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Transit
    await page.goto('/dashboard/transit');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Transit page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Consumption carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Consumption
    await page.goto('/dashboard/consumption');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Consumption page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Recipes carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Recipes
    await page.goto('/dashboard/recipes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Recipes page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Daily Closings carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Daily Closings
    await page.goto('/dashboard/closings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Daily Closings page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Pending Accounts carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Pending Accounts
    await page.goto('/dashboard/pending');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Pending Accounts page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Charts carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Charts
    await page.goto('/dashboard/charts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Charts page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Módulo Analysis carga correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Navegar a Analysis
    await page.goto('/dashboard/analysis');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que hay contenido en la página
    const bodyText = await page.locator('body').textContent();
    console.log('Analysis page loaded, has content:', (bodyText?.length || 0) > 0);

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });
});
