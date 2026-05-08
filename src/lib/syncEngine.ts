import { supabase } from './supabase';
import * as sqlite from './sqliteLocal';
import { toast } from 'sonner';

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
  try {
    const { error } = await supabase.from('products').select('id').limit(1).maybeSingle();
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

    for (const item of pendingItems) {
      try {
        await processSyncItem(item);
        await sqlite.markAsSynced(item.id);
      } catch (error) {
        console.error(`Error al sincronizar item ${item.id}:`, error);
        await sqlite.incrementRetryCount(item.id);

        if (item.retry_count >= 3) {
          console.error(`Item ${item.id} excedió reintentos, eliminando de cola`);
          await sqlite.markAsSynced(item.id);
        }
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
  if (!state.isOnline) return;

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
      console.error(`Error al obtener cambios de ${table}:`, error);
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

async function getLocalRecord(table: string, id: string): Promise<any> {
  const db = await sqlite.getDB();
  const result = await db.select(`SELECT * FROM ${mapTableToSQLite(table)} WHERE id = $1`, [id]);
  return result[0] || null;
}

async function insertLocalRecord(table: string, data: any): Promise<void> {
  const db = await sqlite.getDB();
  const columns = Object.keys(data).join(', ');
  const values = Object.values(data).map(v => JSON.stringify(v));
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  try {
    await db.execute(
      `INSERT INTO ${mapTableToSQLite(table)} (${columns}) VALUES (${placeholders})`,
      Object.values(data)
    );
  } catch (error) {
    console.error(`Error al insertar registro local en ${table}:`, error);
  }
}

async function updateLocalRecord(table: string, data: any): Promise<void> {
  const db = await sqlite.getDB();
  const updates = Object.keys(data)
    .filter(k => k !== 'id')
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ');

  try {
    await db.execute(
      `UPDATE ${mapTableToSQLite(table)} SET ${updates} WHERE id = $1`,
      [data.id, ...Object.values(data).filter((_, i) => i > 0)]
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

export async function initialDataLoad(userId: string): Promise<{ success: boolean; error?: string }> {
  console.log('Iniciando carga inicial de datos para usuario:', userId);

  const isTauriApp = await sqlite.isTauri();
  if (!isTauriApp) {
    console.log('No es entorno Tauri, omitiendo carga inicial');
    return { success: false, error: 'No es app de escritorio' };
  }

  const dbReady = await sqlite.isDBReady();
  if (!dbReady) {
    console.log('SQLite no disponible, omitiendo carga inicial');
    return { success: false, error: 'SQLite no disponible' };
  }

  try {
    console.log('Limpiando datos anteriores del usuario...');
    await sqlite.clearAllUserData(userId);

    const tables = [
      { supabase: 'products', local: 'products' },
      { supabase: 'categories', local: 'categories' },
      { supabase: 'movements', local: 'movements' },
      { supabase: 'sales', local: 'sales' },
      { supabase: 'sale_items', local: 'sale_items' },
      { supabase: 'recipes', local: 'recipes' },
      { supabase: 'recipe_ingredients', local: 'recipe_ingredients' },
      { supabase: 'employees', local: 'employees' },
      { supabase: 'departments', local: 'departments' },
      { supabase: 'daily_closings', local: 'daily_closings' },
      { supabase: 'transit_items', local: 'transit_items' },
      { supabase: 'pending_accounts', local: 'pending_accounts' },
      { supabase: 'access_pins', local: 'access_pins' },
      { supabase: 'action_logs', local: 'action_logs' },
      { supabase: 'hr_documents', local: 'hr_documents' },
      { supabase: 'employee_documents', local: 'employee_documents' },
      { supabase: 'payroll_config', local: 'payroll_config' },
      { supabase: 'payroll_entries', local: 'payroll_entries' },
      { supabase: 'payments', local: 'payments' },
    ];

    for (const table of tables) {
      try {
        console.log(`Cargando ${table.supabase}...`);
        const { data, error } = await supabase
          .from(table.supabase)
          .select('*')
          .eq('user_id', userId);

        if (error) {
          console.warn(`Error cargando ${table.supabase}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          await sqlite.bulkInsert(table.local, data);
          console.log(`Cargados ${data.length} registros de ${table.supabase}`);
        } else {
          console.log(`No hay datos para ${table.supabase}`);
        }
      } catch (err: any) {
        console.warn(`Error procesando ${table.supabase}:`, err.message);
      }
    }

    await sqlite.setLastSyncTime(new Date().toISOString());
    console.log('Carga inicial completada');

    return { success: true };
  } catch (error: any) {
    console.error('Error en carga inicial:', error);
    return { success: false, error: error.message };
  }
}