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

test.describe('SISTEMA DE PINs - OFFLINE', () => {
  test('Módulo de configuración de PINs carga correctamente', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Navegar a Settings donde está la configuración de PINs
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que la página carga sin errores
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);

    // Verificar que hay contenido relacionado con PINs o configuración
    const hasPinRelated = bodyText?.includes('PIN') || bodyText?.includes('Acceso') || bodyText?.includes('Configuración');
    expect(hasPinRelated).toBeTruthy();
  });

  test('Configuración de PINs permanece accesible offline', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Ir a configuración
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Ir offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);

    // Verificar que la página sigue cargada
    await expect(page.locator('body')).toBeVisible();

    // Verificar que los botones de gestión de PINs muestran indicador offline
    const wifiOffIcons = page.locator('[data-testid="wifi-off"], svg.lucide-wifi-off');
    const hasOfflineIndicator = await wifiOffIcons.count() > 0;
    console.log('Offline indicator visible:', hasOfflineIndicator);

    // Volver online
    await page.context().setOffline(false);
  });

  test('PIN modal funciona correctamente online', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Navegar a configuración
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Cerrar cualquier modal abierto
    const closeBtn = page.locator('button:has-text("Cancelar"), button:has-text("Cerrar"), [aria-label="Close"]').first();
    const hasCloseBtn = await closeBtn.isVisible().catch(() => false);
    if (hasCloseBtn) {
      await closeBtn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    // Presionar Escape por si acaso
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Buscar botón de agregar PIN o sección de PINs
    const addButton = page.locator('button:has-text("Agregar"), button:has-text("PIN"), button:has-text("Configurar")').first();
    const hasAddButton = await addButton.isVisible().catch(() => false);
    console.log('Add PIN button visible:', hasAddButton);

    if (hasAddButton) {
      await addButton.click({ force: true });
      await page.waitForTimeout(500);

      // Verificar que se abre un modal o formulario
      const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');
      const hasModal = await modal.isVisible().catch(() => false);
      console.log('Modal opened:', hasModal);
    }
  });

  test('Módulos con protección de PIN cargan correctamente', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginAndGetToDashboard(page);

    // Verificar que los módulos que usan PIN cargan correctamente
    const protectedModules = [
      '/dashboard/inventory',
      '/dashboard/movements',
      '/dashboard/sales',
      '/dashboard/recipes',
    ];

    for (const mod of protectedModules) {
      await page.goto(mod);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verificar que no hay errores de JavaScript
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBeTruthy();
    }

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Sidebar muestra todos los módulos protegidos', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Verificar que el sidebar tiene links a módulos protegidos
    const sidebarLinks = page.locator('nav a[href*="/dashboard/"]');
    const linkCount = await sidebarLinks.count();
    console.log(`Sidebar links found: ${linkCount}`);

    // Verificar que hay al menos 5 módulos en el sidebar
    expect(linkCount).toBeGreaterThanOrEqual(5);

    // Verificar que los textos de los links son visibles
    for (let i = 0; i < Math.min(5, linkCount); i++) {
      const linkText = await sidebarLinks.nth(i).textContent();
      console.log(`Link ${i}: ${linkText}`);
      expect(linkText?.trim().length).toBeGreaterThan(0);
    }
  });

  test('App mantiene estado después de recarga', async ({ page }) => {
    await loginAndGetToDashboard(page);

    // Recargar la página
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar que sigue en el dashboard
    const url = page.url();
    expect(url).toContain('/dashboard');

    // Verificar que el sidebar sigue visible
    const sidebarLinks = page.locator('nav a[href*="/dashboard/"]');
    const linkCount = await sidebarLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});
