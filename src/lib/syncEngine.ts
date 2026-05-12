import { supabase } from './supabase';
import * as sqlite from './sqliteLocal';
import { toast } from 'sonner';

const LOG_PREFIX = '[SyncEngine]';

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const prefix = `${LOG_PREFIX} [${timestamp}]`;
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  isOnline: boolean;
}

const state: SyncState = {
  status: 'idle',
  lastSyncTime: null,
  pendingChanges: 0,
  isOnline: true
};

let syncInterval: ReturnType<typeof setInterval> | null = null;
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

export function getSyncState(): SyncState {
  return { ...state };
}

export function onSyncStateChange(callback: (state: SyncState) => void): () => void {
  const originalState = { ...state };
  const checkInterval = setInterval(() => {
    if (JSON.stringify(state) !== JSON.stringify(originalState)) {
      callback({ ...state });
      Object.assign(originalState, state);
    }
  }, 500);
  return () => clearInterval(checkInterval);
}

async function checkConnection(): Promise<boolean> {
  // Si navigator dice que está offline, no intentar verificar
  if (!navigator.onLine) {
    if (state.isOnline !== false) {
      state.isOnline = false;
      state.status = 'offline';
      console.log('[checkConnection] navigator.onLine = false, modo offline');
    }
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const { error } = await supabase.from('products').select('id').limit(1).maybeSingle();
    clearTimeout(timeoutId);
    
    const online = !error;
    if (state.isOnline !== online) {
      state.isOnline = online;
      if (online) {
        toast.success('Conexión restaurada');
        await syncNow();
      } else {
        toast.warning('Sin conexión - modo offline');
      }
    }
    return online;
  } catch {
    state.isOnline = false;
    return false;
  }
}

export async function initSyncEngine(): Promise<void> {
  console.log('Inicializando motor de sincronización...');

  const isTauriApp = await sqlite.isTauri();
  if (!isTauriApp) {
    console.log('No es entorno Tauri, saltando inicialización de SQLite local');
    return;
  }

  try {
    await sqlite.initLocalDB();
  } catch (error: any) {
    console.log('SQLite no disponible:', error.message);
    return;
  }

  await checkConnection();

  connectionCheckInterval = setInterval(checkConnection, 30000);

  await loadInitialData();

  if (state.isOnline) {
    await syncNow();
  }

  syncInterval = setInterval(async () => {
    if (state.isOnline) {
      await syncNow();
    }
  }, 60000);

  console.log('Motor de sincronización iniciado');
}

export async function loadInitialData(): Promise<void> {
  const isTauriApp = await sqlite.isTauri();
  if (!isTauriApp) {
    state.pendingChanges = 0;
    return;
  }
  
  const pending = await sqlite.getPendingSyncItems();
  state.pendingChanges = pending.length;
}

export async function syncNow(): Promise<void> {
  const isTauriApp = await sqlite.isTauri();
  if (!isTauriApp) {
    return;
  }

  if (!navigator.onLine || !state.isOnline) {
    console.log('[syncNow] Offline, omitiendo sincronización');
    state.status = 'offline';
    return;
  }

  if (state.status === 'syncing') {
    console.log('Sincronización en progreso, omitiendo...');
    return;
  }

  const dbReady = await sqlite.isDBReady();
  if (!dbReady) {
    console.log('SQLite no disponible, omitiendo sincronización');
    return;
  }

  state.status = 'syncing';

  try {
    const pendingItems = await sqlite.getPendingSyncItems();

    const groupedByTable = groupItemsByTable(pendingItems);
    
    for (const [table, items] of Object.entries(groupedByTable)) {
      try {
        await processBatchSync(table as string, items);
        for (const item of items) {
          const parsed = JSON.parse(item.data);
          if (!isValidUUID(parsed.id)) {
            console.log(`[syncNow] Marcando como synced (ID inválido): ${parsed.id}`);
          }
          await sqlite.markAsSynced(item.id);
        }
      } catch (error: any) {
        console.error(`Error en batch sync para ${table}:`, error);
        for (const item of items) {
          await sqlite.incrementRetryCount(item.id);
          if (item.retry_count >= 2 && !item.failed) {
            const errorMsg = error?.message || 'Error en batch';
            await sqlite.markAsFailed(item.id, errorMsg);
          }
        }
        toast.error(`Error al sincronizar ${table}. Revisa la cola de sync.`);
        state.status = 'error';
      }
    }

    await pullRemoteChanges();

    await sqlite.clearSyncedItems();

    state.lastSyncTime = new Date();
    state.status = state.isOnline ? 'idle' : 'offline';
    state.pendingChanges = (await sqlite.getPendingSyncItems()).length;

  } catch (error) {
    console.error('Error en sincronización:', error);
    state.status = 'error';
    toast.error('Error al sincronizar datos');
  }
}

async function processSyncItem(item: any): Promise<void> {
  const data = JSON.parse(item.data);

  switch (item.operation) {
    case 'INSERT':
      await handleInsert(item.table_name, data);
      break;
    case 'UPDATE':
      await handleUpdate(item.table_name, data);
      break;
    case 'DELETE':
      await handleDelete(item.table_name, data);
      break;
  }
}

function groupItemsByTable(items: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    if (!grouped[item.table_name]) {
      grouped[item.table_name] = [];
    }
    grouped[item.table_name].push(item);
  }
  return grouped;
}

async function processBatchSync(table: string, items: any[]): Promise<void> {
  const allInserts = items.filter(i => i.operation === 'INSERT').map(i => JSON.parse(i.data));
  const allUpdates = items.filter(i => i.operation === 'UPDATE').map(i => JSON.parse(i.data));
  const allDeletes = items.filter(i => i.operation === 'DELETE').map(i => JSON.parse(i.data));

  const validInserts = allInserts.filter(item => isValidUUID(item.id));
  const invalidInserts = allInserts.filter(item => !isValidUUID(item.id));
  
  const validUpdates = allUpdates.filter(item => isValidUUID(item.id));
  const invalidUpdates = allUpdates.filter(item => !isValidUUID(item.id));
  
  const validDeletes = allDeletes.filter(item => isValidUUID(item.id));
  const invalidDeletes = allDeletes.filter(item => !isValidUUID(item.id));

  if (invalidInserts.length > 0) {
    console.log(`[processBatchSync] ${table}: Saltando ${invalidInserts.length} inserts con IDs inválidos (offline-*). No se pueden sincronizar a Supabase.`);
  }
  if (invalidUpdates.length > 0) {
    console.log(`[processBatchSync] ${table}: Saltando ${invalidUpdates.length} updates con IDs inválidos.`);
  }
  if (invalidDeletes.length > 0) {
    console.log(`[processBatchSync] ${table}: Saltando ${invalidDeletes.length} deletes con IDs inválidos.`);
  }

  if (validInserts.length > 0) {
    const { error } = await supabase
      .from(mapTableToSupabase(table))
      .upsert(validInserts, { onConflict: 'id' });
    if (error) throw error;
  }

  for (const updateData of validUpdates) {
    const { error } = await supabase
      .from(mapTableToSupabase(table))
      .update(updateData)
      .eq('id', updateData.id);
    if (error) throw error;
  }

  for (const deleteData of validDeletes) {
    const { error } = await supabase
      .from(mapTableToSupabase(table))
      .delete()
      .eq('id', deleteData.id);
    if (error) throw error;
  }
}

async function handleInsert(table: string, data: any): Promise<void> {
  const { error } = await supabase
    .from(mapTableToSupabase(table))
    .insert(data);

  if (error) throw error;
}

async function handleUpdate(table: string, data: any): Promise<void> {
  const { error } = await supabase
    .from(mapTableToSupabase(table))
    .update(data)
    .eq('id', data.id);

  if (error) throw error;
}

async function handleDelete(table: string, data: any): Promise<void> {
  const { error } = await supabase
    .from(mapTableToSupabase(table))
    .delete()
    .eq('id', data.id);

  if (error) throw error;
}

async function pullRemoteChanges(): Promise<void> {
  if (!state.isOnline || !navigator.onLine) {
    console.log('[pullRemoteChanges] Offline, omitiendo sincronización entrante');
    return;
  }

  const isTauriApp = await sqlite.isTauri();
  if (!isTauriApp) {
    return;
  }

  const dbReady = await sqlite.isDBReady();
  if (!dbReady) {
    console.log('SQLite no disponible, omitiendo pull de cambios remotos');
    return;
  }

  const lastSync = state.lastSyncTime?.toISOString() || '1970-01-01T00:00:00Z';

  const tables = ['products', 'categories', 'movements', 'sales', 'recipes', 'employees', 'departments', 'daily_closings', 'transit_items'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(mapTableToSupabase(table))
        .select('*')
        .gt('updated_at', lastSync);

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`Sincronizando ${data.length} cambios en ${table}`);
        await mergeRemoteChanges(table, data);
      }
    } catch (error) {
      console.warn(`Error al obtener cambios de ${table}:`, error);
    }
  }
}

async function mergeRemoteChanges(table: string, remoteData: any[]): Promise<void> {
  for (const record of remoteData) {
    const localRecord = await getLocalRecord(table, record.id);

    if (!localRecord) {
      await insertLocalRecord(table, record);
    } else if (new Date(record.updated_at) > new Date(localRecord.updated_at)) {
      await updateLocalRecord(table, record);
    }
  }
}

const TABLE_COLUMNS: Record<string, string[]> = {
  products: ['id', 'user_id', 'name', 'category', 'quantity', 'unit', 'price', 'cost', 'rop', 'eoq', 'lead_time', 'order_cost', 'holding_cost', 'expiration_date', 'description', 'is_individual', 'is_active', 'in_transit', 'created_at', 'updated_at', 'stock_min', 'stock_max'],
  categories: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
  movements: ['id', 'user_id', 'product_id', 'type', 'quantity', 'unit', 'date', 'cost', 'reason', 'status', 'justification', 'justification_date', 'created_at', 'updated_at'],
  sales: ['id', 'user_id', 'employee_id', 'items', 'total_amount', 'date', 'sale_type', 'is_account_house', 'notes', 'discount', 'efectivo', 'transferencia', 'usd', 'eur', 'payment_method', 'created_at', 'updated_at'],
  recipes: ['id', 'user_id', 'name', 'selling_price', 'ingredients', 'created_at', 'updated_at', 'is_active', 'category'],
  employees: ['id', 'user_id', 'name', 'role', 'salary', 'phone', 'email', 'nit_id', 'category', 'created_at', 'updated_at'],
  departments: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
  daily_closings: ['id', 'user_id', 'closing_date', 'total_sales', 'total_discounts', 'total_refunds', 'closing_amount', 'notes', 'created_by', 'created_by_name', 'cup_efectivo', 'cup_transfer', 'usd', 'eur', 'created_at', 'updated_at'],
  transit_items: ['id', 'user_id', 'product_id', 'quantity', 'consumed', 'remaining', 'reason', 'sent_date', 'created_at', 'updated_at']
};

async function getLocalRecord(table: string, id: string): Promise<any> {
  const db = await sqlite.getDB();
  const result = await db.select(`SELECT * FROM ${mapTableToSQLite(table)} WHERE id = $1`, [id]);
  return result[0] || null;
}

const LEGACY_MISSING_COLUMNS: Record<string, string[]> = {
  sales: ['efectivo', 'transferencia', 'usd', 'eur', 'payment_method']
};

async function insertLocalRecord(table: string, data: any): Promise<void> {
  const db = await sqlite.getDB();
  const filteredData: any = {};
  const missingCols = LEGACY_MISSING_COLUMNS[table] || [];

  for (const col of Object.keys(data)) {
    if (missingCols.includes(col)) continue;
    if (data[col] !== undefined) {
      filteredData[col] = data[col];
    }
  }

  if (table === 'recipes') {
    if (filteredData.ingredients === undefined || filteredData.ingredients === null) {
      filteredData.ingredients = '[]';
    }
  }

  if (table === 'sales') {
    if (filteredData.items === undefined || filteredData.items === null) {
      filteredData.items = '[]';
    }
  }

  if (Object.keys(filteredData).length === 0) {
    console.warn(`[insertLocalRecord] No hay columnas válidas para ${table}`);
    return;
  }

  const columns = Object.keys(filteredData).join(', ');
  const values = Object.values(filteredData);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  try {
    await db.execute(
      `INSERT INTO ${mapTableToSQLite(table)} (${columns}) VALUES (${placeholders})`,
      values
    );
  } catch (error) {
    console.error(`Error al insertar registro local en ${table}:`, error);
  }
}

async function updateLocalRecord(table: string, data: any): Promise<void> {
  const db = await sqlite.getDB();
  const missingCols = LEGACY_MISSING_COLUMNS[table] || [];
  
  const filteredData: any = {};
  for (const col of Object.keys(data)) {
    if (col === 'id') continue;
    if (missingCols.includes(col)) continue;
    if (data[col] !== undefined) {
      filteredData[col] = data[col];
    }
  }

  if (Object.keys(filteredData).length === 0) {
    console.warn(`[updateLocalRecord] No hay columnas válidas para actualizar en ${table}`);
    return;
  }

  const updates = Object.keys(filteredData)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ');

  try {
    await db.execute(
      `UPDATE ${mapTableToSQLite(table)} SET ${updates} WHERE id = $1`,
      [data.id, ...Object.values(filteredData)]
    );
  } catch (error) {
    console.error(`Error al actualizar registro local en ${table}:`, error);
  }
}

function mapTableToSupabase(table: string): string {
  const mapping: Record<string, string> = {
    products: 'products',
    categories: 'categories',
    movements: 'movements',
    sales: 'sales',
    recipes: 'recipes',
    employees: 'employees',
    departments: 'departments',
    daily_closings: 'daily_closings',
    transit_items: 'transit_items'
  };
  return mapping[table] || table;
}

function mapTableToSQLite(table: string): string {
  return table;
}

export async function queueOperation(tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: any): Promise<void> {
  await sqlite.addToSyncQueue(tableName, operation, data);
  state.pendingChanges = (await sqlite.getPendingSyncItems()).length;

  if (state.isOnline) {
    await syncNow();
  }
}

export function stopSyncEngine(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
}