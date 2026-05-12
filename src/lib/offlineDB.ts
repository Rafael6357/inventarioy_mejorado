const DB_NAME = 'inventarioy_offline';
const DB_VERSION = 2;

export const STORES = {
  PENDING_SALES: 'pending_sales',
  PENDING_MOVEMENTS: 'pending_movements',
  PENDING_CLOSINGS: 'pending_closings',
  PENDING_TRANSIT_CONSUMPTIONS: 'pending_transit_consumptions',
  CACHED_PRODUCTS: 'cached_products',
  SYNC_LOG: 'sync_log',
  COMPLETED_SALES: 'completed_sales',
};

let db: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORES.PENDING_SALES)) {
        database.createObjectStore(STORES.PENDING_SALES, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.PENDING_MOVEMENTS)) {
        database.createObjectStore(STORES.PENDING_MOVEMENTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.PENDING_CLOSINGS)) {
        database.createObjectStore(STORES.PENDING_CLOSINGS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.PENDING_TRANSIT_CONSUMPTIONS)) {
        database.createObjectStore(STORES.PENDING_TRANSIT_CONSUMPTIONS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.CACHED_PRODUCTS)) {
        database.createObjectStore(STORES.CACHED_PRODUCTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.SYNC_LOG)) {
        const store = database.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.COMPLETED_SALES)) {
        database.createObjectStore(STORES.COMPLETED_SALES, { keyPath: 'id' });
      }
    };
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface PendingSale {
  id: string;
  data: {
    employee_id?: string;
    items: any[];
    total_amount: number;
    date: string;
    sale_type: 'SALON' | 'DOMICILIO';
    notes?: string;
    discount: number;
  };
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

export interface PendingMovement {
  id: string;
  data: {
    user_id: string;
    product_id: string;
    type: 'ENTRADA' | 'SALIDA' | 'MERMA';
    quantity: number;
    unit: string;
    date: string;
    cost: number;
    reason?: string;
  };
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

export interface PendingClosing {
  id: string;
  data: {
    closing_date: string;
    total_sales: number;
    total_discounts: number;
    total_refunds: number;
    closing_amount: number;
    notes?: string;
    created_by: string;
    created_by_name?: string;
  };
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

export interface PendingTransitConsumption {
  id: string;
  data: {
    product_id: string;
    transit_item_id: string;
    quantity: number;
    reason?: string;
    unit: string;
    cost: number;
  };
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const database = await initOfflineDB();
  return database.transaction(storeName, mode).objectStore(storeName);
}

export async function savePendingSale(sale: Omit<PendingSale, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<string> {
  const id = generateId();
  const pendingSale: PendingSale = {
    id,
    ...sale,
    timestamp: new Date().toISOString(),
    synced: false,
    retryCount: 0,
  };

  const store = await getStore(STORES.PENDING_SALES, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.add(pendingSale);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingMovement(movement: Omit<PendingMovement, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<string> {
  const id = generateId();
  const pendingMovement: PendingMovement = {
    id,
    ...movement,
    timestamp: new Date().toISOString(),
    synced: false,
    retryCount: 0,
  };

  const store = await getStore(STORES.PENDING_MOVEMENTS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.add(pendingMovement);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingClosing(closing: Omit<PendingClosing, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<string> {
  const id = generateId();
  const pendingClosing: PendingClosing = {
    id,
    ...closing,
    timestamp: new Date().toISOString(),
    synced: false,
    retryCount: 0,
  };

  const store = await getStore(STORES.PENDING_CLOSINGS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.add(pendingClosing);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingTransitConsumption(consumption: Omit<PendingTransitConsumption, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<string> {
  const id = generateId();
  const pendingConsumption: PendingTransitConsumption = {
    id,
    ...consumption,
    timestamp: new Date().toISOString(),
    synced: false,
    retryCount: 0,
  };

  const store = await getStore(STORES.PENDING_TRANSIT_CONSUMPTIONS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.add(pendingConsumption);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPendingSales(): Promise<PendingSale[]> {
  const store = await getStore(STORES.PENDING_SALES);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(s => !s.synced));
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPendingMovements(): Promise<PendingMovement[]> {
  const store = await getStore(STORES.PENDING_MOVEMENTS);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(m => !m.synced));
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPendingClosings(): Promise<PendingClosing[]> {
  const store = await getStore(STORES.PENDING_CLOSINGS);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(c => !c.synced));
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPendingTransitConsumptions(): Promise<PendingTransitConsumption[]> {
  const store = await getStore(STORES.PENDING_TRANSIT_CONSUMPTIONS);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(c => !c.synced));
    request.onerror = () => reject(request.error);
  });
}

export async function markSaleAsSynced(id: string): Promise<void> {
  const store = await getStore(STORES.PENDING_SALES, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const sale = request.result as PendingSale;
      if (sale) {
        sale.synced = true;
        sale.timestamp = new Date().toISOString();
        const updateRequest = store.put(sale);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markMovementAsSynced(id: string): Promise<void> {
  const store = await getStore(STORES.PENDING_MOVEMENTS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const movement = request.result as PendingMovement;
      if (movement) {
        movement.synced = true;
        movement.timestamp = new Date().toISOString();
        const updateRequest = store.put(movement);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markClosingAsSynced(id: string): Promise<void> {
  const store = await getStore(STORES.PENDING_CLOSINGS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const closing = request.result as PendingClosing;
      if (closing) {
        closing.synced = true;
        closing.timestamp = new Date().toISOString();
        const updateRequest = store.put(closing);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function markTransitConsumptionAsSynced(id: string): Promise<void> {
  const store = await getStore(STORES.PENDING_TRANSIT_CONSUMPTIONS, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const consumption = request.result as PendingTransitConsumption;
      if (consumption) {
        consumption.synced = true;
        consumption.timestamp = new Date().toISOString();
        const updateRequest = store.put(consumption);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function incrementRetryCount(id: string, storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingItem(id: string, storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingCounts(): Promise<{ sales: number; movements: number; closings: number; transitConsumptions: number }> {
  const [sales, movements, closings, transitConsumptions] = await Promise.all([
    getAllPendingSales(),
    getAllPendingMovements(),
    getAllPendingClosings(),
    getAllPendingTransitConsumptions(),
  ]);
  return {
    sales: sales.length,
    movements: movements.length,
    closings: closings.length,
    transitConsumptions: transitConsumptions.length,
  };
}

export async function cacheProducts(products: any[]): Promise<void> {
  const store = await getStore(STORES.CACHED_PRODUCTS, 'readwrite');
  const tx = store.transaction as any;
  
  products.forEach(product => {
    store.put(product);
  });
}

export async function getCachedProducts(): Promise<any[]> {
  const store = await getStore(STORES.CACHED_PRODUCTS);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearSyncedItems(): Promise<void> {
  const storeNames = [STORES.PENDING_SALES, STORES.PENDING_MOVEMENTS, STORES.PENDING_CLOSINGS, STORES.PENDING_TRANSIT_CONSUMPTIONS];
  
  for (const storeName of storeNames) {
    const store = await getStore(storeName, 'readwrite');
    const items = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    for (const item of items) {
      if (item.synced) {
        store.delete(item.id);
      }
    }
  }
}

export async function checkClosingExists(userId: string, closingDate: string): Promise<boolean> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('daily_closings')
    .select('id')
    .eq('user_id', userId)
    .eq('closing_date', closingDate)
    .single();
  
  return !!data;
}

export interface CompletedSale {
  id: string;
  user_id: string;
  employee_id: string;
  items: any[];
  total_amount: number;
  date: string;
  sale_type: string;
  is_account_house: boolean;
  notes: string;
  discount: number;
  efectivo?: number;
  transferencia?: number;
  usd?: number;
  eur?: number;
  payment_method?: string;
  created_at: string;
  synced: boolean;
}

export async function saveCompletedSaleLocally(sale: CompletedSale): Promise<void> {
  const store = await getStore(STORES.COMPLETED_SALES, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(sale);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCompletedSalesLocally(): Promise<CompletedSale[]> {
  const store = await getStore(STORES.COMPLETED_SALES);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCompletedSaleLocally(saleId: string): Promise<void> {
  const store = await getStore(STORES.COMPLETED_SALES, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(saleId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function syncPendingSalesToSupabase(): Promise<{ success: boolean; synced: number; failed: number }> {
  const { supabase } = await import('./supabase');
  const pendingSales = await getAllPendingSales();
  
  let synced = 0;
  let failed = 0;
  
  for (const sale of pendingSales) {
    try {
      const saleData = sale.data;
      const { error } = await supabase
        .from('sales')
        .insert({
          user_id: saleData.user_id,
          employee_id: saleData.employee_id,
          items: saleData.items,
          total_amount: saleData.total_amount,
          date: saleData.date,
          sale_type: saleData.sale_type,
          is_account_house: saleData.is_account_house,
          notes: saleData.notes || null,
          discount: saleData.discount || 0,
          efectivo: saleData.efectivo || 0,
          transferencia: saleData.transferencia || 0,
          usd: saleData.usd || 0,
          eur: saleData.eur || 0,
          payment_method: saleData.payment_method || null,
        });
      
      if (error) {
        console.error('[syncPendingSales] Error sincronizando venta:', error);
        failed++;
      } else {
        await markSaleAsSynced(sale.id);
        synced++;
        console.log('[syncPendingSales] Venta sincronizada:', sale.id);
      }
    } catch (err) {
      console.error('[syncPendingSales] Error:', err);
      failed++;
    }
  }
  
  return { success: failed === 0, synced, failed };
}
