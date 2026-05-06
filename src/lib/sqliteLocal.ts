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
    return true;
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