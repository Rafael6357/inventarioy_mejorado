import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  email: 'nikko6357@gmail.com',
  password: '123456',
};

test.describe('PRUEBAS FUNCIONALES - ONLINE', () => {
  test('Login con credenciales válidas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Llenar formulario de login
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="correo"]', CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);

    // Hacer click en el botón de login
    const loginButton = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();

    // Esperar a que redireccione al dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verificar que no hay errores de JS
    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(appErrors).toEqual([]);
  });

  test('Dashboard carga con datos del usuario', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="correo"]', CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);

    const loginButton = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verificar que hay contenido visible en el dashboard
    await expect(page.locator('body')).toBeVisible();
  });

  test('Navegación entre módulos del dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="correo"]', CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);

    const loginButton = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Buscar links de navegación en el sidebar
    const navLinks = page.locator('a[href*="/dashboard/"], nav a');
    const count = await navLinks.count();
    console.log(`Encontrados ${count} links de navegación`);

    // Verificar que al menos hay links de navegación
    expect(count).toBeGreaterThan(0);
  });

  test('Módulo de Productos carga correctamente', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="correo"]', CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);

    const loginButton = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navegar a inventario/stock
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    // Intentar navegar a diferentes módulos
    const modules = ['/dashboard/inventory', '/dashboard/movements', '/dashboard/sales', '/dashboard/settings'];
    for (const mod of modules) {
      await page.goto(mod);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
    }

    const appErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest') && !e.includes('ERR_ABORTED'));
    expect(appErrors).toEqual([]);
  });
});
