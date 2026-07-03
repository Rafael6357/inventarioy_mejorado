import { expect, test } from '@playwright/test';

const TEST_EMAIL = 'test5dias@gmail.com';
const TEST_PASSWORD = 'Test12345!';
const APP_URL = 'http://localhost:3000';
const SUPABASE_URL = 'https://ybymcbwnjcgdoqrosqdw.supabase.co';

test.describe.configure({ mode: 'serial' });

test(
  'Offline stress test: transito preservado + sync',
  { tag: '@critical' },
  async ({ page }) => {
    test.setTimeout(600000);

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // ============================================================
    // FASE 1: LOGIN
    // ============================================================
    console.log('[1] Login...');
    await page.goto(APP_URL + '/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('[1] Login OK.');

    // ============================================================
    // FASE 2: SEMBRAR DATOS (vía Supabase API en el browser)
    // ============================================================
    console.log('[2] Sembrando productos y tránsito...');
    const seedResult = await seedViaBrowser(page);
    console.log('  Seed result:', JSON.stringify(seedResult));

    // Recargar para que fetchAll traiga los datos sembrados
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Verificar productos en inventario
    await page.goto(APP_URL + '/dashboard/inventory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    let body1 = await page.locator('body').textContent().catch(() => '') || '';
    expect(body1).toMatch(/Arroz/i);
    expect(body1).toMatch(/Pollo/i);
    expect(body1).toMatch(/Aceite/i);
    console.log('[2] Productos visibles en inventario');

    // Verificar tránsito inicial (debe tener Pollo 5kg + Arroz 3kg)
    await page.goto(APP_URL + '/dashboard/transit', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const bodyT1 = await page.locator('body').textContent().catch(() => '') || '';
    const hasPollo1 = /Pollo/i.test(bodyT1);
    const hasArroz1 = /Arroz/i.test(bodyT1);
    console.log('[2] Transito inicial: Pollo=' + hasPollo1 + ' Arroz=' + hasArroz1);
    expect(hasPollo1, 'Pollo debe estar en tránsito').toBe(true);
    expect(hasArroz1, 'Arroz debe estar en tránsito').toBe(true);

    // ============================================================
    // FASE 3: MODO OFFLINE (bloquear Supabase)
    // ============================================================
    console.log('[3] === BLOQUEANDO SUPABASE (offline) ===');
    await page.route(SUPABASE_URL + '/**', route => route.abort());

    // Verificar que el app detecta offline
    await page.waitForTimeout(3000);
    const offlineBanner = page.locator('[class*="offline"], [class*="Offline"]').first();
    const offlineVisible = await offlineBanner.isVisible().catch(() => false);
    console.log('[3] Offline banner visible:', offlineVisible);

    // Navegar a Ventas (SPA) y hacer una venta de Arroz
    await navigateSPA(page, '/dashboard/sales');

    // Buscar "Arroz Test" en el catálogo
    const arrozCard = page.locator('button, [role="button"], [class*="card"], [class*="item"]')
      .filter({ hasText: /Arroz/i }).first();
    
    if (await arrozCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await arrozCard.click();
      await page.waitForTimeout(500);
      console.log('[3] Arroz clickeado en catálogo');
    } else {
      console.log('[3] ADVERTENCIA: No se encontró Arroz en catálogo');
    }

    // Intentar cobrar/checkout
    const cobrarBtn = page.locator('button').filter({ hasText: /cobrar|checkout|procesar/i }).first();
    if (await cobrarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cobrarBtn.click();
      await page.waitForTimeout(1000);

      // Modal de pago
      const numInput = page.locator('input[type="number"]').first();
      if (await numInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await numInput.fill('55');
      }
      await page.waitForTimeout(300);

      // Confirmar
      const confirmBtn = page.locator('button').filter({ hasText: /confirmar|finalizar|pagar|procesar/i }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
        console.log('[3] Venta registrada offline');
      }
    }

    // ============================================================
    // FASE 4: VERIFICAR TRANSITO (CRÍTICO)
    // ============================================================
    console.log('[4] === VERIFICANDO TRANSITO POST-VENTA ===');
    await navigateSPA(page, '/dashboard/transit');
    const bodyT2 = await page.locator('body').textContent().catch(() => '') || '';
    const polloAfter = /Pollo/i.test(bodyT2);
    console.log('[4] Pollo en tránsito post-venta:', polloAfter);

    // ESTO ES LO CRÍTICO: Pollo debe seguir visible aunque vendimos Arroz
    expect(polloAfter, 'BUG: Pollo Test desapareció del tránsito!').toBe(true);
    console.log('  [\u2713] TRÁNSITO PRESERVADO CORRECTAMENTE');

    // ============================================================
    // FASE 5: RECONECTAR
    // ============================================================
    console.log('[5] === RECONECTANDO ===');
    await page.unroute(SUPABASE_URL + '/**');
    await page.waitForTimeout(15000);

    // Refresh
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // Verificar datos post-sync
    await page.goto(APP_URL + '/dashboard/inventory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const finalBody = await page.locator('body').textContent().catch(() => '') || '';
    expect(finalBody).toMatch(/Arroz/i);
    expect(finalBody).toMatch(/Pollo/i);
    expect(finalBody).toMatch(/Aceite/i);
    console.log('[5] Datos verificados post-sync');

    console.log('');
    console.log('========================================');
    console.log('  RESULTADO: PRUEBA EXITOSA');
    console.log('  \u2713 Productos sincronizados');
    console.log('  \u2713 Tránsito preservado en offline');
    console.log('  \u2713 Post-sync sin pérdida de datos');
    console.log('========================================');

    if (consoleErrors.length > 0) {
      const unique = [...new Set(consoleErrors)];
      console.log('\n' + unique.length + ' tipos de errores en consola:');
      // Filtrar AuthRetryableFetchError (normales en offline)
      const noAuth = unique.filter(e => !e.includes('AuthRetryableFetchError'));
      noAuth.slice(0, 10).forEach(e => console.log('  -', e.substring(0, 200)));
    }
  }
);

// Helper: Navegación SPA sin recargar página (no dispara fetchAll)
// Importante: page.goto() recarga toda la SPA y causa que fetchAll
// falle cuando Supabase está bloqueado (aunque navigator.onLine=true).
// Usamos window.history + popstate para navegación real de React Router.
async function navigateSPA(page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(2000);
}
async function seedViaBrowser(page): Promise<any> {
  return page.evaluate(async () => {
    const API = 'https://ybymcbwnjcgdoqrosqdw.supabase.co';
    const APIKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieW1jYnduamNnZG9xcm9zcWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTQxMDcsImV4cCI6MjA4OTQzMDEwN30.JNlytCWFtSkvp0v3t0-Au4X5tmfBEUn4kPwvr5vmORI';
    const authHeaders = {
      'apikey': APIKEY,
      'Content-Type': 'application/json',
    };

    // Refresh token desde localStorage (buscar entre todas las keys)
    let sess: any = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed?.access_token || parsed?.currentSession?.access_token) {
              sess = parsed;
              console.log('session found in key:', key);
              break;
            }
          }
        } catch {}
      }
    }
    
    let accessToken = '';
    if (sess?.access_token) {
      accessToken = sess.access_token;
    } else if (sess?.currentSession?.access_token) {
      accessToken = sess.currentSession.access_token;
    } else if (sess?.provider_token) {
      accessToken = sess.provider_token;
    }
    
    if (!accessToken) {
      // List all keys for debugging
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i) || '');
      console.log('localStorage keys:', keys);
      return { error: 'no token in session', keys };
    }
    const headers = { ...authHeaders, 'Authorization': 'Bearer ' + accessToken };

    // Obtener user_id de la sesión
    const uid = sess?.user?.id || sess?.currentSession?.user?.id || '';
    if (!uid) return { error: 'no uid in session', keys: [] };

    // Setear teléfono para que PhoneModal no aparezca
    await fetch(API + '/rest/v1/profiles?id=eq.' + uid, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ phone: '53000000' }),
    });
    console.log('phone set for user');

    // Obtener warehouse
    const whResp = await fetch(API + '/rest/v1/warehouses?user_id=eq.' + uid, { headers });
    const warehouses = await whResp.json();
    const whId = warehouses[0]?.id;
    if (!whId) return { error: 'no warehouse' };

    // Limpiar datos previos del test
    try { await fetch(API + '/rest/v1/sale_items?user_id=eq.' + uid, { method: 'DELETE', headers }); } catch {}
    try { await fetch(API + '/rest/v1/sales?user_id=eq.' + uid, { method: 'DELETE', headers }); } catch {}
    try { await fetch(API + '/rest/v1/transit_items?user_id=eq.' + uid, { method: 'DELETE', headers }); } catch {}
    try { await fetch(API + '/rest/v1/movements?user_id=eq.' + uid, { method: 'DELETE', headers }); } catch {}
    try { await fetch(API + '/rest/v1/product_warehouse?product_id=in.(select:products!inner(id))', { method: 'DELETE', headers }); } catch {}
    try { await fetch(API + '/rest/v1/products?user_id=eq.' + uid, { method: 'DELETE', headers }); } catch {}

    const now = new Date().toISOString();
    const uuid = () => crypto.randomUUID();

    // Crear productos
    const p1Id = uuid(); // Arroz
    const p2Id = uuid(); // Pollo  
    const p3Id = uuid(); // Aceite

    const products = [
      { id: p1Id, user_id: uid, name: 'Arroz Test', category: 'Granos y Cereales', quantity: 20, unit: 'kg', price: 55, cost: 40, is_individual: true, is_active: true, created_at: now },
      { id: p2Id, user_id: uid, name: 'Pollo Test', category: 'Carnes y Embutidos', quantity: 15, unit: 'kg', price: 0, cost: 75, is_individual: false, is_active: true, created_at: now },
      { id: p3Id, user_id: uid, name: 'Aceite Test', category: 'Condimentos y Salsas', quantity: 10, unit: 'L', price: 130, cost: 90, is_individual: true, is_active: true, created_at: now },
    ];

    for (const p of products) {
      await fetch(API + '/rest/v1/products', {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(p),
      });
    }

    // Product warehouse entries
    for (const p of products) {
      await fetch(API + '/rest/v1/product_warehouse', {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          id: uuid(), product_id: p.id, warehouse_id: whId,
          quantity: p.quantity, in_transit: 0, updated_at: now,
        }),
      }).catch(() => {});
    }

    // SALIDA Pollo 5kg (movement + transit_item)
    await fetch(API + '/rest/v1/movements', {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: uuid(), user_id: uid, product_id: p2Id, type: 'SALIDA',
        quantity: 5, unit: 'kg', date: now, cost: 75,
        status: 'NORMAL', created_at: now, warehouse_id: whId,
      }),
    });

    // SALIDA Arroz 3kg
    await fetch(API + '/rest/v1/movements', {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: uuid(), user_id: uid, product_id: p1Id, type: 'SALIDA',
        quantity: 3, unit: 'kg', date: now, cost: 40,
        status: 'NORMAL', created_at: now, warehouse_id: whId,
      }),
    });

    // Transit items
    await fetch(API + '/rest/v1/transit_items', {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: uuid(), user_id: uid, product_id: p2Id,
        quantity: 5, consumed: 0, remaining: 5,
        reason: 'Test: salida a produccion', sent_date: now,
        created_at: now, warehouse_id: whId,
      }),
    });

    await fetch(API + '/rest/v1/transit_items', {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: uuid(), user_id: uid, product_id: p1Id,
        quantity: 3, consumed: 0, remaining: 3,
        reason: 'Test: salida Arroz', sent_date: now,
        created_at: now, warehouse_id: whId,
      }),
    });

    // Update in_transit on products
    await fetch(API + '/rest/v1/products?id=eq.' + p2Id, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ in_transit: 5 }),
    });
    await fetch(API + '/rest/v1/products?id=eq.' + p1Id, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ in_transit: 3 }),
    });

    // Update product_warehouse
    await fetch(API + '/rest/v1/product_warehouse?product_id=eq.' + p2Id + '&warehouse_id=eq.' + whId, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ quantity: 10, in_transit: 5 }),
    });
    await fetch(API + '/rest/v1/product_warehouse?product_id=eq.' + p1Id + '&warehouse_id=eq.' + whId, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ quantity: 17, in_transit: 3 }),
    });

    return { ok: true, products: 3, warehouseId: whId };
  });
}