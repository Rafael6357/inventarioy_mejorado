let db: any = null;

const DB_NAME = 'inventarioy.db';

async function getDatabase() {
  if (db) return db;
  
  const isTauriEnv = typeof window !== 'undefined' && (window as any).__TAURI__;
  if (!isTauriEnv) {
    throw new Error('SQLite solo disponible en la app de escritorio');
  }
  
  const Database = (await import('@tauri-apps/plugin-sql')).default;
  db = await Database.load(`sqlite:${DB_NAME}`);
  return db;
}

export async function initLocalDB(): Promise<any> {
  if (db) return db;

  try {
    db = await getDatabase();
    await createTables();
    console.log('Base de datos SQLite local inicializada');
    return db;
  } catch (error: any) {
    if (error.message === 'SQLite solo disponible en la app de escritorio') {
      console.log('Modo web: SQLite no disponible, usando Supabase directamente');
      return null;
    }
    console.error('Error al inicializar SQLite:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT DEFAULT 'unidad',
      price REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      rop REAL DEFAULT 0,
      eoq REAL DEFAULT 0,
      lead_time INTEGER,
      order_cost REAL,
      holding_cost REAL,
      expiration_date TEXT,
      description TEXT,
      is_individual INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      in_transit REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      date TEXT NOT NULL,
      cost REAL DEFAULT 0,
      reason TEXT,
      status TEXT,
      justification TEXT,
      justification_date TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      employee_id TEXT,
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      date TEXT NOT NULL,
      sale_type TEXT DEFAULT 'SALON',
      is_account_house INTEGER DEFAULT 0,
      notes TEXT,
      discount REAL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      selling_price REAL DEFAULT 0,
      ingredients TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      salary REAL DEFAULT 0,
      phone TEXT,
      email TEXT,
      nit_id TEXT,
      category TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_closings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      closing_date TEXT NOT NULL,
      total_sales REAL DEFAULT 0,
      total_discounts REAL DEFAULT 0,
      total_refunds REAL DEFAULT 0,
      closing_amount REAL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_by_name TEXT,
      cup_efectivo REAL,
      cup_transfer REAL,
      usd REAL,
      eur REAL,
      created_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transit_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      consumed REAL DEFAULT 0,
      remaining REAL NOT NULL,
      reason TEXT,
      sent_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pending_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      items TEXT DEFAULT '[]',
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      is_account_house INTEGER DEFAULT 0,
      sale_type TEXT DEFAULT 'SALON',
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0
    )
  `);

  console.log('Todas las tablas creadas');
}

export async function getDB(): Promise<any> {
  if (!db) {
    try {
      const result = await initLocalDB();
      return result;
    } catch (error) {
      console.warn('SQLite no disponible, getDB retorna null');
      return null;
    }
  }
  return db;
}

export async function isDBReady(): Promise<boolean> {
  const database = await getDB();
  return database !== null;
}

export async function isTauri(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return true;
  }
  
  try {
    await import('@tauri-apps/api/core');
    const hasTauriGlobal = typeof window !== 'undefined' && (window as any).__TAURI__;
    return !!hasTauriGlobal;
  } catch {
    return false;
  }
}

export async function queryProducts(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
}

export async function insertProduct(product: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO products (id, user_id, name, category, quantity, unit, price, cost, rop, eoq, lead_time, order_cost, holding_cost, expiration_date, description, is_individual, is_active, in_transit, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
    [
      product.id, product.user_id, product.name, product.category,
      product.quantity, product.unit, product.price, product.cost,
      product.rop, product.eoq, product.lead_time, product.order_cost,
      product.holding_cost, product.expiration_date, product.description,
      product.is_individual ? 1 : 0, product.is_active ? 1 : 0,
      product.in_transit || 0, product.created_at, product.updated_at
    ]
  );
}

export async function updateProduct(product: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE products SET name = $1, category = $2, quantity = $3, unit = $4, price = $5, cost = $6, rop = $7, eoq = $8, lead_time = $9, order_cost = $10, holding_cost = $11, expiration_date = $12, description = $13, is_individual = $14, is_active = $15, in_transit = $16, updated_at = $17 WHERE id = $18`,
    [
      product.name, product.category, product.quantity, product.unit,
      product.price, product.cost, product.rop, product.eoq,
      product.lead_time, product.order_cost, product.holding_cost,
      product.expiration_date, product.description,
      product.is_individual ? 1 : 0, product.is_active ? 1 : 0,
      product.in_transit || 0, product.updated_at, product.id
    ]
  );
}

export async function addToSyncQueue(tableName: string, operation: string, data: any): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.log('SQLite no disponible, saltando addToSyncQueue');
    return;
  }
  await database.execute(
    `INSERT INTO sync_queue (table_name, operation, data, created_at, synced, retry_count) VALUES ($1, $2, $3, $4, 0, 0)`,
    [tableName, operation, JSON.stringify(data), new Date().toISOString()]
  );
}

export async function getPendingSyncItems(): Promise<any[]> {
  const database = await getDB();
  if (!database) {
    console.log('SQLite no disponible, retornando array vacío');
    return [];
  }
  return await database.select('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at');
}

export async function markAsSynced(id: number): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('UPDATE sync_queue SET synced = 1 WHERE id = $1', [id]);
}

export async function incrementRetryCount(id: number): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = $1', [id]);
}

export async function clearSyncedItems(): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM sync_queue WHERE synced = 1');
}

export async function saveDailyClosingLocally(closing: any): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.log('SQLite no disponible para guardar cierre');
    return;
  }
  
  await database.execute(
    `INSERT OR REPLACE INTO daily_closings (id, user_id, closing_date, total_sales, total_discounts, total_refunds, closing_amount, notes, created_by, created_by_name, cup_efectivo, cup_transfer, usd, eur, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      closing.id,
      closing.user_id,
      closing.closing_date,
      closing.total_sales || 0,
      closing.total_discounts || 0,
      closing.total_refunds || 0,
      closing.closing_amount || 0,
      closing.notes || null,
      closing.created_by || null,
      closing.created_by_name || null,
      closing.cup_efectivo || null,
      closing.cup_transfer || null,
      closing.usd || null,
      closing.eur || null,
      closing.created_at || new Date().toISOString(),
    ]
  );
}

export async function getDailyClosingsLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM daily_closings WHERE user_id = $1 ORDER BY closing_date DESC',
    [userId]
  );
}

export async function saveSaleLocally(sale: any): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.log('[SQLite] Database not available for saving sale');
    return;
  }
  
  await database.execute(
    `INSERT OR REPLACE INTO sales (id, user_id, employee_id, items, total_amount, date, sale_type, is_account_house, notes, discount, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      sale.id,
      sale.user_id,
      sale.employee_id || null,
      sale.items,
      sale.total_amount,
      sale.date,
      sale.sale_type || 'SALON',
      sale.is_account_house ? 1 : 0,
      sale.notes || null,
      sale.discount || 0,
      sale.created_at || new Date().toISOString(),
    ]
  );
}

export async function getSalesLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM sales WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

export async function saveMovementLocally(movement: any): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.log('[SQLite] Database not available for saving movement');
    return;
  }
  
  await database.execute(
    `INSERT OR REPLACE INTO movements (id, user_id, product_id, type, quantity, unit, date, cost, reason, status, justification, justification_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      movement.id,
      movement.user_id,
      movement.product_id,
      movement.type,
      movement.quantity,
      movement.unit,
      movement.date,
      movement.cost || 0,
      movement.reason || null,
      movement.status || 'COMPLETED',
      movement.justification || null,
      movement.justification_date || null,
      movement.created_at || new Date().toISOString(),
    ]
  );
}

export async function getMovementsLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM movements WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

export async function saveTransitItemLocally(item: any): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.log('[SQLite] Database not available for saving transit item');
    return;
  }
  
  await database.execute(
    `INSERT OR REPLACE INTO transit_items (id, user_id, product_id, quantity, consumed, remaining, reason, sent_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      item.id,
      item.user_id,
      item.product_id,
      item.quantity,
      item.consumed || 0,
      item.remaining || item.quantity,
      item.reason || null,
      item.sent_date,
      item.created_at || new Date().toISOString(),
    ]
  );
}

export async function getTransitItemsLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM transit_items WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

export async function savePendingAccountLocally(account: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  
  await database.execute(
    `INSERT OR REPLACE INTO pending_accounts (id, user_id, client_name, items, total_amount, status, is_account_house, sale_type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      account.id,
      account.user_id,
      account.client_name,
      typeof account.items === 'string' ? account.items : JSON.stringify(account.items || []),
      account.total_amount || 0,
      account.status || 'pending',
      account.is_account_house ? 1 : 0,
      account.sale_type || 'SALON',
      account.created_at || new Date().toISOString(),
    ]
  );
}

export async function getPendingAccountsLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM pending_accounts WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
    [userId, 'pending']
  );
}

export async function updatePendingAccountLocally(accountId: string, updates: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  
  await database.execute(
    `UPDATE pending_accounts SET items = $1, total_amount = $2, is_account_house = $3, sale_type = $4 WHERE id = $5`,
    [
      typeof updates.items === 'string' ? updates.items : JSON.stringify(updates.items || []),
      updates.total_amount || 0,
      updates.is_account_house ? 1 : 0,
      updates.sale_type || 'SALON',
      accountId
    ]
  );
}

export async function saveEmployeeLocally(employee: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  
  await database.execute(
    `INSERT OR REPLACE INTO employees (id, user_id, name, role, salary, phone, email, nit_id, category, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      employee.id,
      employee.user_id,
      employee.name,
      employee.role,
      employee.salary || 0,
      employee.phone || null,
      employee.email || null,
      employee.nit_id || null,
      employee.category || null,
      employee.created_at || new Date().toISOString(),
    ]
  );
}

export async function getEmployeesLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM employees WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

export async function saveCategoryLocally(category: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  
  await database.execute(
    `INSERT OR REPLACE INTO categories (id, user_id, name, created_at)
     VALUES ($1, $2, $3, $4)`,
    [
      category.id,
      category.user_id,
      category.name,
      category.created_at || new Date().toISOString(),
    ]
  );
}

export async function getCategoriesLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM categories WHERE user_id = $1 ORDER BY name',
    [userId]
  );
}

export async function saveRecipeLocally(recipe: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  
  await database.execute(
    `INSERT OR REPLACE INTO recipes (id, user_id, name, selling_price, ingredients, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      recipe.id,
      recipe.user_id,
      recipe.name,
      recipe.selling_price || 0,
      typeof recipe.ingredients === 'string' ? recipe.ingredients : JSON.stringify(recipe.ingredients || []),
      recipe.created_at || new Date().toISOString(),
    ]
  );
}

export async function getRecipesLocally(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  return await database.select(
    'SELECT * FROM recipes WHERE user_id = $1 ORDER BY name',
    [userId]
  );
}