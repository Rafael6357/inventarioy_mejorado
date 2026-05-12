let db: any = null;
let initPromise: Promise<any> | null = null;
let isInitialized = false;

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
  if (db && isInitialized) return db;

  if (initPromise) {
    console.log('[initLocalDB] Ya hay una inicialización en progreso, esperando...');
    return await initPromise;
  }

  initPromise = (async () => {
    try {
      if (db && isInitialized) {
        return db;
      }
      
      console.log('[initLocalDB] Iniciando base de datos...');
      const database = await getDatabase();
      await createTables();
      isInitialized = true;
      console.log('[initLocalDB] Base de datos SQLite local inicializada correctamente');
      return database;
    } catch (error: any) {
      initPromise = null;
      isInitialized = false;
      if (error.message === 'SQLite solo disponible en la app de escritorio') {
        console.log('Modo web: SQLite no disponible, usando Supabase directamente');
        return null;
      }
      console.error('[initLocalDB] Error al inicializar SQLite:', error);
      throw error;
    }
  })();

  return await initPromise;
}

export async function ensureInitialized(): Promise<any> {
  return await initLocalDB();
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
      items TEXT,
      total_amount REAL NOT NULL,
      date TEXT NOT NULL,
      sale_type TEXT DEFAULT 'SALON',
      is_account_house INTEGER DEFAULT 0,
      notes TEXT,
      discount REAL DEFAULT 0,
      efectivo REAL DEFAULT 0,
      transferencia REAL DEFAULT 0,
      usd REAL DEFAULT 0,
      eur REAL DEFAULT 0,
      payment_method TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      selling_price REAL DEFAULT 0,
      ingredients TEXT DEFAULT '[]',
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
      retry_count INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      error_message TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL,
      description TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_session (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      businessName TEXT,
      role TEXT,
      phone TEXT,
      address TEXT,
      businessHours TEXT,
      subscriptionActive INTEGER DEFAULT 0,
      subscriptionPlan TEXT,
      ticketMessage TEXT,
      usdEnabled INTEGER DEFAULT 0,
      usdRate REAL DEFAULT 0,
      eurEnabled INTEGER DEFAULT 0,
      eurRate REAL DEFAULT 0,
      cupTransferEnabled INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  console.log('Todas las tablas creadas');

  await runMigrations();
}

async function addColumnIfNotExists(table: string, column: string, definition: string): Promise<void> {
  if (!db) return;
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[Migration] Added column ${table}.${column}`);
  } catch (e: any) {
    if (e.message && e.message.includes('duplicate column name')) {
      console.log(`[Migration] Column ${table}.${column} already exists, skipping`);
    } else if (e.message && e.message.includes('no such table')) {
      console.warn(`[Migration] Table ${table} does not exist, skipping`);
    } else {
      console.warn(`[Migration] ${table}.${column}:`, e.message?.substring(0, 100));
    }
  }
}

async function createIndexIfNotExists(indexName: string, table: string, column: string): Promise<void> {
  if (!db) return;
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${column})`);
    console.log(`[Migration] Created index ${indexName}`);
  } catch (e: any) {
    console.warn(`[Migration] Index ${indexName}:`, e.message?.substring(0, 100));
  }
}

async function getSchemaVersion(): Promise<number> {
  if (!db) return 0;
  try {
    const result = await db.select('SELECT MAX(version) as version FROM schema_versions');
    return result[0]?.version || 0;
  } catch {
    return 0;
  }
}

async function setSchemaVersion(version: number, description: string): Promise<void> {
  if (!db) return;
  try {
    await db.execute(
      'INSERT INTO schema_versions (version, applied_at, description) VALUES ($1, $2, $3)',
      [version, new Date().toISOString(), description]
    );
    console.log(`[Migration] Schema version set to ${version}`);
  } catch (e: any) {
    console.warn(`[Migration] Failed to set version ${version}:`, e.message?.substring(0, 100));
  }
}

async function runMigrations(): Promise<void> {
  if (!db) return;
  
  console.log('[Migration] Running database migrations...');
  
  const currentVersion = await getSchemaVersion();
  console.log(`[Migration] Current schema version: ${currentVersion}`);
  
  await addColumnIfNotExists('products', 'stock_min', 'REAL DEFAULT 0');
  await addColumnIfNotExists('products', 'stock_max', 'REAL DEFAULT 0');
  await addColumnIfNotExists('products', 'updated_at', 'TEXT');
  await addColumnIfNotExists('products', 'category', 'TEXT');

  await addColumnIfNotExists('categories', 'updated_at', 'TEXT');

  await addColumnIfNotExists('movements', 'updated_at', 'TEXT');

  if (currentVersion < 1) {
    await addColumnIfNotExists('products', 'stock_min', 'REAL DEFAULT 0');
    await addColumnIfNotExists('products', 'stock_max', 'REAL DEFAULT 0');
    await addColumnIfNotExists('products', 'updated_at', 'TEXT');
    await addColumnIfNotExists('products', 'category', 'TEXT');

    await addColumnIfNotExists('categories', 'updated_at', 'TEXT');

    await addColumnIfNotExists('movements', 'updated_at', 'TEXT');

    await addColumnIfNotExists('recipes', 'updated_at', 'TEXT');
    await addColumnIfNotExists('recipes', 'is_active', 'INTEGER DEFAULT 1');
    await addColumnIfNotExists('recipes', 'category', 'TEXT');
    await addColumnIfNotExists('recipes', 'ingredients', "TEXT DEFAULT '[]'");

    try {
      await db.execute("UPDATE recipes SET ingredients = '[]' WHERE ingredients IS NULL OR ingredients = ''");
    } catch (e) {
      console.log('[Migration] recipes ingredients update skipped:', e);
    }

    await addColumnIfNotExists('employees', 'updated_at', 'TEXT');
    await addColumnIfNotExists('employees', 'category', 'TEXT');

    await addColumnIfNotExists('departments', 'updated_at', 'TEXT');

    await addColumnIfNotExists('sales', 'updated_at', 'TEXT');

    await addColumnIfNotExists('daily_closings', 'updated_at', 'TEXT');

    await addColumnIfNotExists('transit_items', 'updated_at', 'TEXT');

    await setSchemaVersion(1, 'Initial migrations - products, categories, movements, recipes, employees, departments, sales, daily_closings, transit_items');
  }

  if (currentVersion < 2) {
    await addColumnIfNotExists('sales', 'efectivo', 'REAL DEFAULT 0');
    await addColumnIfNotExists('sales', 'transferencia', 'REAL DEFAULT 0');
    await addColumnIfNotExists('sales', 'usd', 'REAL DEFAULT 0');
    await addColumnIfNotExists('sales', 'eur', 'REAL DEFAULT 0');
    await addColumnIfNotExists('sales', 'payment_method', 'TEXT');

    await addColumnIfNotExists('sync_queue', 'failed', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists('sync_queue', 'error_message', 'TEXT');

    await setSchemaVersion(2, 'Payment columns in sales table, sync queue error tracking');
  }

  if (currentVersion < 3) {
    await createIndexIfNotExists('idx_products_user_id', 'products', 'user_id');
    await createIndexIfNotExists('idx_categories_user_id', 'categories', 'user_id');
    await createIndexIfNotExists('idx_movements_product_id', 'movements', 'product_id');
    await createIndexIfNotExists('idx_movements_date', 'movements', 'date');
    await createIndexIfNotExists('idx_movements_user_id', 'movements', 'user_id');
    await createIndexIfNotExists('idx_sales_date', 'sales', 'date');
    await createIndexIfNotExists('idx_sales_user_id', 'sales', 'user_id');
    await createIndexIfNotExists('idx_recipes_user_id', 'recipes', 'user_id');
    await createIndexIfNotExists('idx_employees_user_id', 'employees', 'user_id');
    await createIndexIfNotExists('idx_daily_closings_user_id', 'daily_closings', 'user_id');
    await createIndexIfNotExists('idx_transit_items_user_id', 'transit_items', 'user_id');
    await createIndexIfNotExists('idx_sync_queue_synced', 'sync_queue', 'synced');

    await setSchemaVersion(3, 'Database indexes for performance optimization');
  }

  if (currentVersion < 4) {
    try {
      await db.execute('ALTER TABLE sales ALTER COLUMN items DROP NOT NULL');
      console.log('[Migration] Made sales.items column nullable');
    } catch (e: any) {
      console.log('[Migration] sales.items nullable skip:', e.message?.substring(0, 50));
    }
    await setSchemaVersion(4, 'Make sales.items nullable for Supabase sync');
  }

  console.log('[Migration] Database migrations completed (version ' + await getSchemaVersion() + ')');
}

export async function getDB(): Promise<any> {
  if (db && isInitialized) {
    return db;
  }
  
  if (initPromise) {
    try {
      return await initPromise;
    } catch (error) {
      console.warn('SQLite no disponible, getDB retorna null');
      return null;
    }
  }
  
  try {
    const result = await initLocalDB();
    return result;
  } catch (error) {
    console.warn('SQLite no disponible, getDB retorna null');
    return null;
  }
}

export async function isDBReady(): Promise<boolean> {
  const database = await getDB();
  return database !== null;
}

export async function withTransaction<T>(callback: (db: any) => Promise<T>): Promise<T | null> {
  const database = await getDB();
  if (!database) return null;
  
  try {
    await database.execute('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.execute('COMMIT');
    return result;
  } catch (error) {
    await database.execute('ROLLBACK');
    console.error('[Transaction] Error, rollback performed:', error);
    throw error;
  }
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
  return await database.select('SELECT * FROM sync_queue WHERE synced = 0 AND (failed = 0 OR failed IS NULL) ORDER BY created_at');
}

export async function getAllPendingItems(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
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

export async function markAsFailed(id: number, errorMessage: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    'UPDATE sync_queue SET failed = 1, error_message = $1 WHERE id = $2',
    [errorMessage.substring(0, 500), id]
  );
}

export async function getFailedSyncItems(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM sync_queue WHERE failed = 1 ORDER BY created_at DESC');
}

export async function retryFailedItem(id: number): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    'UPDATE sync_queue SET failed = 0, retry_count = 0, error_message = NULL WHERE id = $1',
    [id]
  );
}

export async function retryAllFailedItems(): Promise<number> {
  const database = await getDB();
  if (!database) return 0;
  const result = await database.execute(
    'UPDATE sync_queue SET failed = 0, retry_count = 0, error_message = NULL WHERE failed = 1'
  );
  return result.rowsAffected || 0;
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
    `INSERT OR REPLACE INTO sales (id, user_id, employee_id, items, total_amount, date, sale_type, is_account_house, notes, discount, efectivo, transferencia, usd, eur, payment_method, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
      sale.efectivo || 0,
      sale.transferencia || 0,
      sale.usd || 0,
      sale.eur || 0,
      sale.payment_method || null,
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

export async function getAllPendingAccountsDebug(userId: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  const all = await database.select(
    'SELECT * FROM pending_accounts WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  console.log('[DEBUG] Todas las cuentas en SQLite:', all.length, all.map(a => ({ id: a.id, status: a.status, client: a.client_name })));
  return all;
}

export async function getSyncQueueItemsDebug(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  
  const pending = await database.select(
    'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at DESC'
  );
  console.log('[DEBUG] Items pendientes en sync_queue:', pending.length, pending.map(p => ({ table: p.table_name, op: p.operation })));
  return pending;
}

export async function updatePendingAccountLocally(accountId: string, updates: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  
  // Construir la query dinámicamente según los campos presentes
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.items !== undefined) {
    fields.push(`items = $${paramIndex++}`);
    values.push(typeof updates.items === 'string' ? updates.items : JSON.stringify(updates.items || []));
  }
  if (updates.total_amount !== undefined) {
    fields.push(`total_amount = $${paramIndex++}`);
    values.push(updates.total_amount);
  }
  if (updates.is_account_house !== undefined) {
    fields.push(`is_account_house = $${paramIndex++}`);
    values.push(updates.is_account_house ? 1 : 0);
  }
  if (updates.sale_type !== undefined) {
    fields.push(`sale_type = $${paramIndex++}`);
    values.push(updates.sale_type);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.updated_at !== undefined) {
    fields.push(`updated_at = $${paramIndex++}`);
    values.push(updates.updated_at);
  }

  if (fields.length === 0) return;

  values.push(accountId);
  
  await database.execute(
    `UPDATE pending_accounts SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
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

export async function saveUserSession(user: any): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.warn('[saveUserSession] SQLite no disponible');
    return;
  }

  console.log('[saveUserSession] Guardando usuario:', user.email, 'id:', user.id);

  await database.execute(
    `INSERT OR REPLACE INTO user_session (
      id, email, name, businessName, role, phone, address, businessHours,
      subscriptionActive, subscriptionPlan, ticketMessage,
      usdEnabled, usdRate, eurEnabled, eurRate, cupTransferEnabled, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      user.id,
      user.email,
      user.name || null,
      user.businessName || null,
      user.role || null,
      user.phone || null,
      user.address || null,
      user.businessHours || null,
      user.isSubscriptionActive ? 1 : 0,
      user.subscriptionPlan || null,
      user.ticketMessage || null,
      user.usdEnabled ? 1 : 0,
      user.usdRate || 0,
      user.eurEnabled ? 1 : 0,
      user.eurRate || 0,
      user.cupTransferEnabled ? 1 : 0,
      new Date().toISOString()
    ]
  );
  console.log('[saveUserSession] Sesión guardada en SQLite correctamente');
}

export async function getUserSession(): Promise<any | null> {
  console.log('[getUserSession] Iniciando búsqueda de sesión...');
  const database = await getDB();
  if (!database) {
    console.warn('[getUserSession] SQLite no disponible');
    return null;
  }

  console.log('[getUserSession] Ejecutando query...');
  const results = await database.select('SELECT * FROM user_session LIMIT 1');
  console.log('[getUserSession] Resultados:', results);

  if (results && results.length > 0) {
    const session = results[0];
    console.log('[getUserSession] Sesión encontrada:', session.email);
    return {
      id: session.id,
      email: session.email,
      name: session.name,
      businessName: session.businessName,
      role: session.role,
      phone: session.phone,
      address: session.address,
      businessHours: session.businessHours,
      isSubscriptionActive: session.subscriptionActive === 1,
      subscriptionPlan: session.subscriptionPlan,
      ticketMessage: session.ticketMessage,
      usdEnabled: session.usdEnabled === 1,
      usdRate: session.usdRate,
      eurEnabled: session.eurEnabled === 1,
      eurRate: session.eurRate,
      cupTransferEnabled: session.cupTransferEnabled === 1
    };
  }
  console.log('[getUserSession] No se encontró sesión en la tabla');
  return null;
}

export async function clearUserSession(): Promise<void> {
  const database = await getDB();
  if (!database) {
    console.warn('[clearUserSession] SQLite no disponible');
    return;
  }

  await database.execute('DELETE FROM user_session');
  console.log('[clearUserSession] Sesión eliminada de SQLite');
}

export async function verifyDataIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
  const database = await getDB();
  const issues: string[] = [];

  if (!database) {
    issues.push('SQLite no disponible');
    return { valid: false, issues };
  }

  try {
    const tables = ['products', 'categories', 'movements', 'sales', 'recipes', 'employees', 'departments', 'daily_closings', 'transit_items'];

    for (const table of tables) {
      try {
        const countResult = await database.select(`SELECT COUNT(*) as count FROM ${table}`);
        const count = countResult[0]?.count || 0;

        if (count === 0) continue;

        const nullIds = await database.select(`SELECT COUNT(*) as count FROM ${table} WHERE id IS NULL OR id = ''`);
        if ((nullIds[0]?.count || 0) > 0) {
          issues.push(`${table}: ${nullIds[0].count} registros con id inválido`);
        }
      } catch (e: any) {
        issues.push(`${table}: Error al verificar - ${e.message?.substring(0, 50)}`);
      }
    }

    const syncQueueIssues = await database.select('SELECT COUNT(*) as count FROM sync_queue WHERE failed = 1');
    if ((syncQueueIssues[0]?.count || 0) > 0) {
      issues.push(`sync_queue: ${syncQueueIssues[0].count} operaciones fallidas`);
    }

    const duplicateSync = await database.select(`
      SELECT table_name, COUNT(*) as count
      FROM sync_queue
      WHERE synced = 0
      GROUP BY table_name, data
      HAVING COUNT(*) > 1
    `);
    if (duplicateSync.length > 0) {
      for (const dup of duplicateSync) {
        issues.push(`sync_queue: ${dup.count} operaciones duplicadas en ${dup.table_name}`);
      }
    }

    const version = await getSchemaVersion();
    if (version === 0) {
      issues.push('schema_versions: No hay versión registrada');
    }

  } catch (e: any) {
    issues.push(`Error general: ${e.message?.substring(0, 100)}`);
  }

  return { valid: issues.length === 0, issues };
}