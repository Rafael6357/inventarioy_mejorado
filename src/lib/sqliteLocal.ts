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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pending_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS access_pins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT NOT NULL,
      blocked_until TEXT,
      failed_attempts INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS hr_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      employee_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payroll_config (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_hours_per_day REAL DEFAULT 8,
      overtime_multiplier REAL DEFAULT 1.5,
      night_hours_multiplier REAL DEFAULT 1.35,
      holiday_multiplier REAL DEFAULT 2.0,
      last_calculated_month TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payroll_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      regular_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      night_hours REAL DEFAULT 0,
      holiday_hours REAL DEFAULT 0,
      base_salary REAL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      total_salary REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sale_id TEXT,
      pending_account_id TEXT,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      business_name TEXT,
      role TEXT DEFAULT 'user',
      subscription_status TEXT DEFAULT 'trialing',
      trial_ends_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

export async function getLastSyncTime(): Promise<string | null> {
  const database = await getDB();
  if (!database) return null;
  const result = await database.select('SELECT value FROM sync_metadata WHERE key = $1', ['last_sync']);
  return result.length > 0 ? result[0].value : null;
}

export async function setLastSyncTime(time: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ($1, $2, $3)`,
    ['last_sync', time, new Date().toISOString()]
  );
}

export async function clearAllUserData(userId: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  const tables = ['products', 'categories', 'movements', 'sales', 'sale_items', 'recipes', 'recipe_ingredients', 'employees', 'departments', 'daily_closings', 'transit_items', 'pending_accounts', 'access_pins', 'action_logs', 'hr_documents', 'employee_documents', 'payroll_config', 'payroll_entries', 'payments'];
  for (const table of tables) {
    try {
      await database.execute(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    } catch (e) {
      console.warn(`Error clearing ${table}:`, e);
    }
  }
}

export async function bulkInsert(table: string, data: any[]): Promise<void> {
  if (data.length === 0) return;
  const database = await getDB();
  if (!database) return;
  const columns = Object.keys(data[0]);
  for (const item of data) {
    const values = columns.map((_, i) => `$${i + 1}`);
    const cols = columns.join(', ');
    try {
      await database.execute(
        `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${values.join(', ')})`,
        columns.map(c => item[c])
      );
    } catch (e) {
      console.warn(`Error inserting into ${table}:`, e);
    }
  }
}

export async function queryCategories(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM categories ORDER BY name');
}

export async function queryMovements(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM movements ORDER BY created_at DESC');
}

export async function querySales(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM sales ORDER BY created_at DESC');
}

export async function querySaleItems(saleId?: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  if (saleId) {
    return await database.select('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);
  }
  return await database.select('SELECT * FROM sale_items ORDER BY created_at DESC');
}

export async function queryRecipes(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM recipes ORDER BY name');
}

export async function queryRecipeIngredients(recipeId?: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  if (recipeId) {
    return await database.select('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
  }
  return await database.select('SELECT * FROM recipe_ingredients ORDER BY created_at DESC');
}

export async function queryEmployees(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM employees ORDER BY name');
}

export async function queryDepartments(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM departments ORDER BY name');
}

export async function queryDailyClosings(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM daily_closings ORDER BY closing_date DESC');
}

export async function queryTransitItems(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM transit_items ORDER BY created_at DESC');
}

export async function queryPendingAccounts(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM pending_accounts ORDER BY created_at DESC');
}

export async function queryAccessPins(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM access_pins');
}

export async function queryActionLogs(limit: number = 100): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM action_logs ORDER BY created_at DESC LIMIT $1', [limit]);
}

export async function queryHRDocuments(): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  return await database.select('SELECT * FROM hr_documents ORDER BY created_at DESC');
}

export async function queryEmployeeDocuments(employeeId?: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  if (employeeId) {
    return await database.select('SELECT * FROM employee_documents WHERE employee_id = $1', [employeeId]);
  }
  return await database.select('SELECT * FROM employee_documents ORDER BY created_at DESC');
}

export async function queryPayrollConfig(): Promise<any | null> {
  const database = await getDB();
  if (!database) return null;
  const result = await database.select('SELECT * FROM payroll_config LIMIT 1');
  return result.length > 0 ? result[0] : null;
}

export async function queryPayrollEntries(month?: number, year?: number): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  if (month && year) {
    return await database.select('SELECT * FROM payroll_entries WHERE month = $1 AND year = $2', [month, year]);
  }
  return await database.select('SELECT * FROM payroll_entries ORDER BY created_at DESC');
}

export async function queryPayments(saleId?: string): Promise<any[]> {
  const database = await getDB();
  if (!database) return [];
  if (saleId) {
    return await database.select('SELECT * FROM payments WHERE sale_id = $1', [saleId]);
  }
  return await database.select('SELECT * FROM payments ORDER BY created_at DESC');
}

export async function queryProfiles(userId: string): Promise<any | null> {
  const database = await getDB();
  if (!database) return null;
  const result = await database.select('SELECT * FROM profiles WHERE id = $1', [userId]);
  return result.length > 0 ? result[0] : null;
}

export async function deleteProduct(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM products WHERE id = $1', [id]);
}

export async function deleteCategory(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM categories WHERE id = $1', [id]);
}

export async function deleteMovement(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM movements WHERE id = $1', [id]);
}

export async function deleteSale(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM sales WHERE id = $1', [id]);
  await database.execute('DELETE FROM sale_items WHERE sale_id = $1', [id]);
}

export async function deleteRecipe(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM recipes WHERE id = $1', [id]);
  await database.execute('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
}

export async function deleteEmployee(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM employees WHERE id = $1', [id]);
}

export async function deleteDepartment(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM departments WHERE id = $1', [id]);
}

export async function deleteDailyClosing(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM daily_closings WHERE id = $1', [id]);
}

export async function deleteTransitItem(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM transit_items WHERE id = $1', [id]);
}

export async function deletePendingAccount(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM pending_accounts WHERE id = $1', [id]);
}

export async function deleteAccessPin(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM access_pins WHERE id = $1', [id]);
}

export async function deleteHRDocument(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM hr_documents WHERE id = $1', [id]);
}

export async function deleteEmployeeDocument(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM employee_documents WHERE id = $1', [id]);
}

export async function deletePayrollEntry(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM payroll_entries WHERE id = $1', [id]);
}

export async function deletePayment(id: string): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('DELETE FROM payments WHERE id = $1', [id]);
}

export async function insertCategory(category: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO categories (id, user_id, name, created_at) VALUES ($1, $2, $3, $4)`,
    [category.id, category.user_id, category.name, category.created_at]
  );
}

export async function insertMovement(movement: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO movements (id, user_id, product_id, type, quantity, unit, date, cost, reason, status, justification, justification_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [movement.id, movement.user_id, movement.product_id, movement.type, movement.quantity, movement.unit, movement.date, movement.cost, movement.reason, movement.status, movement.justification, movement.justification_date, movement.created_at]
  );
}

export async function insertSale(sale: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO sales (id, user_id, employee_id, items, total_amount, date, sale_type, is_account_house, notes, discount, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [sale.id, sale.user_id, sale.employee_id, sale.items, sale.total_amount, sale.date, sale.sale_type, sale.is_account_house ? 1 : 0, sale.notes, sale.discount || 0, sale.created_at]
  );
}

export async function insertSaleItem(item: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit, unit_price, total_price, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [item.id, item.sale_id, item.product_id, item.product_name, item.quantity, item.unit, item.unit_price, item.total_price, item.created_at]
  );
}

export async function insertRecipe(recipe: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO recipes (id, user_id, name, selling_price, ingredients, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [recipe.id, recipe.user_id, recipe.name, recipe.selling_price, recipe.ingredients, recipe.created_at]
  );
}

export async function insertRecipeIngredient(ingredient: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO recipe_ingredients (id, recipe_id, product_id, product_name, quantity, unit, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ingredient.id, ingredient.recipe_id, ingredient.product_id, ingredient.product_name, ingredient.quantity, ingredient.unit, ingredient.created_at]
  );
}

export async function insertEmployee(employee: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO employees (id, user_id, name, role, salary, phone, email, nit_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [employee.id, employee.user_id, employee.name, employee.role, employee.salary, employee.phone, employee.email, employee.nit_id, employee.category, employee.created_at]
  );
}

export async function insertDepartment(department: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO departments (id, user_id, name, created_at) VALUES ($1, $2, $3, $4)`,
    [department.id, department.user_id, department.name, department.created_at]
  );
}

export async function insertDailyClosing(closing: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO daily_closings (id, user_id, closing_date, total_sales, total_discounts, total_refunds, closing_amount, notes, created_by, created_by_name, cup_efectivo, cup_transfer, usd, eur, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [closing.id, closing.user_id, closing.closing_date, closing.total_sales, closing.total_discounts, closing.total_refunds, closing.closing_amount, closing.notes, closing.created_by, closing.created_by_name, closing.cup_efectivo, closing.cup_transfer, closing.usd, closing.eur, closing.created_at]
  );
}

export async function insertTransitItem(item: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO transit_items (id, user_id, product_id, quantity, consumed, remaining, reason, sent_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [item.id, item.user_id, item.product_id, item.quantity, item.consumed || 0, item.remaining, item.reason, item.sent_date, item.created_at]
  );
}

export async function insertPendingAccount(account: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO pending_accounts (id, user_id, client_name, amount, description, status, due_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [account.id, account.user_id, account.client_name, account.amount, account.description, account.status || 'pending', account.due_date, account.created_at, account.updated_at]
  );
}

export async function insertAccessPin(pin: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO access_pins (id, user_id, pin, role, blocked_until, failed_attempts, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [pin.id, pin.user_id, pin.pin, pin.role, pin.blocked_until, pin.failed_attempts || 0, pin.created_at]
  );
}

export async function insertActionLog(log: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO action_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [log.id, log.user_id, log.action, log.entity_type, log.entity_id, log.details, log.created_at]
  );
}

export async function insertHRDocument(doc: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO hr_documents (id, user_id, employee_id, type, title, file_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [doc.id, doc.user_id, doc.employee_id, doc.type, doc.title, doc.file_url, doc.created_at]
  );
}

export async function insertEmployeeDocument(doc: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO employee_documents (id, user_id, employee_id, type, title, file_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [doc.id, doc.user_id, doc.employee_id, doc.type, doc.title, doc.file_url, doc.created_at]
  );
}

export async function insertPayrollConfig(config: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT OR REPLACE INTO payroll_config (id, user_id, work_hours_per_day, overtime_multiplier, night_hours_multiplier, holiday_multiplier, last_calculated_month, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [config.id, config.user_id, config.work_hours_per_day, config.overtime_multiplier, config.night_hours_multiplier, config.holiday_multiplier, config.last_calculated_month, config.created_at, config.updated_at]
  );
}

export async function insertPayrollEntry(entry: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO payroll_entries (id, user_id, employee_id, month, year, regular_hours, overtime_hours, night_hours, holiday_hours, base_salary, bonuses, deductions, total_salary, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [entry.id, entry.user_id, entry.employee_id, entry.month, entry.year, entry.regular_hours, entry.overtime_hours, entry.night_hours, entry.holiday_hours, entry.base_salary, entry.bonuses, entry.deductions, entry.total_salary, entry.status, entry.created_at]
  );
}

export async function insertPayment(payment: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `INSERT INTO payments (id, user_id, sale_id, pending_account_id, amount, payment_method, reference, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [payment.id, payment.user_id, payment.sale_id, payment.pending_account_id, payment.amount, payment.payment_method, payment.reference, payment.notes, payment.created_at]
  );
}

export async function updateCategory(category: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('UPDATE categories SET name = $1 WHERE id = $2', [category.name, category.id]);
}

export async function updateMovement(movement: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE movements SET type = $1, quantity = $2, unit = $3, date = $4, cost = $5, reason = $6, status = $7, justification = $8, justification_date = $9 WHERE id = $10`,
    [movement.type, movement.quantity, movement.unit, movement.date, movement.cost, movement.reason, movement.status, movement.justification, movement.justification_date, movement.id]
  );
}

export async function updateSale(sale: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE sales SET employee_id = $1, items = $2, total_amount = $3, date = $4, sale_type = $5, is_account_house = $6, notes = $7, discount = $8 WHERE id = $9`,
    [sale.employee_id, sale.items, sale.total_amount, sale.date, sale.sale_type, sale.is_account_house ? 1 : 0, sale.notes, sale.discount || 0, sale.id]
  );
}

export async function updateRecipe(recipe: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE recipes SET name = $1, selling_price = $2, ingredients = $3 WHERE id = $4`,
    [recipe.name, recipe.selling_price, recipe.ingredients, recipe.id]
  );
}

export async function updateEmployee(employee: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE employees SET name = $1, role = $2, salary = $3, phone = $4, email = $5, nit_id = $6, category = $7 WHERE id = $8`,
    [employee.name, employee.role, employee.salary, employee.phone, employee.email, employee.nit_id, employee.category, employee.id]
  );
}

export async function updateDepartment(department: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute('UPDATE departments SET name = $1 WHERE id = $2', [department.name, department.id]);
}

export async function updateDailyClosing(closing: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE daily_closings SET closing_date = $1, total_sales = $2, total_discounts = $3, total_refunds = $4, closing_amount = $5, notes = $6, cup_efectivo = $7, cup_transfer = $8, usd = $9, eur = $10 WHERE id = $11`,
    [closing.closing_date, closing.total_sales, closing.total_discounts, closing.total_refunds, closing.closing_amount, closing.notes, closing.cup_efectivo, closing.cup_transfer, closing.usd, closing.eur, closing.id]
  );
}

export async function updateTransitItem(item: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE transit_items SET quantity = $1, consumed = $2, remaining = $3, reason = $4 WHERE id = $5`,
    [item.quantity, item.consumed, item.remaining, item.reason, item.id]
  );
}

export async function updatePendingAccount(account: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE pending_accounts SET client_name = $1, amount = $2, description = $3, status = $4, due_date = $5, updated_at = $6 WHERE id = $7`,
    [account.client_name, account.amount, account.description, account.status, account.due_date, account.updated_at, account.id]
  );
}

export async function updateAccessPin(pin: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE access_pins SET pin = $1, role = $2, blocked_until = $3, failed_attempts = $4 WHERE id = $5`,
    [pin.pin, pin.role, pin.blocked_until, pin.failed_attempts, pin.id]
  );
}

export async function updatePayrollConfig(config: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE payroll_config SET work_hours_per_day = $1, overtime_multiplier = $2, night_hours_multiplier = $3, holiday_multiplier = $4, last_calculated_month = $5, updated_at = $6 WHERE id = $7`,
    [config.work_hours_per_day, config.overtime_multiplier, config.night_hours_multiplier, config.holiday_multiplier, config.last_calculated_month, config.updated_at, config.id]
  );
}

export async function updatePayrollEntry(entry: any): Promise<void> {
  const database = await getDB();
  if (!database) return;
  await database.execute(
    `UPDATE payroll_entries SET regular_hours = $1, overtime_hours = $2, night_hours = $3, holiday_hours = $4, base_salary = $5, bonuses = $6, deductions = $7, total_salary = $8, status = $9 WHERE id = $10`,
    [entry.regular_hours, entry.overtime_hours, entry.night_hours, entry.holiday_hours, entry.base_salary, entry.bonuses, entry.deductions, entry.total_salary, entry.status, entry.id]
  );
}