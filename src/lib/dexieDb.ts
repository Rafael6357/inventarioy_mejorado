import Dexie, { type EntityTable } from 'dexie';
import type {
  Product, Movement, Warehouse, ProductWarehouse,
  TransitItem, Sale, Recipe, PendingAccount, DailyClosing,
  Employee, Category, AccessPin
} from '../store/dbStore';

export type SyncOperation =
  | 'addProduct' | 'updateProduct' | 'deleteProduct'
  | 'addMovement'
  | 'addSale'
  | 'cancelTransit' | 'registerWasteFromTransit' | 'registerManualConsumption'
  | 'createPendingAccount' | 'chargePendingAccount' | 'deletePendingAccount'
  | 'markPendingAccountPaid'
  | 'addItemsToPendingAccount' | 'updatePendingAccountItems' | 'togglePendingAccountType'
  | 'createDailyClosing'
  | 'addRecipe' | 'updateRecipe' | 'deleteRecipe'
  | 'addWarehouse' | 'updateWarehouse' | 'deleteWarehouse';

export interface SyncQueueItem {
  id?: number;
  operation: SyncOperation;
  table: string;
  payload: any;
  created_at: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retries: number;
}

export interface SyncLog {
  id?: number;
  operation: SyncOperation;
  table: string;
  status: 'success' | 'failed';
  created_at: string;
  error?: string;
}

const db = new Dexie('InventarioYLocal') as Dexie & {
  products: EntityTable<Product, 'id'>;
  movements: EntityTable<Movement, 'id'>;
  warehouses: EntityTable<Warehouse, 'id'>;
  productWarehouse: EntityTable<ProductWarehouse, 'id'>;
  transitItems: EntityTable<TransitItem, 'id'>;
  sales: EntityTable<Sale, 'id'>;
  recipes: EntityTable<Recipe, 'id'>;
  pendingAccounts: EntityTable<PendingAccount, 'id'>;
  dailyClosings: EntityTable<DailyClosing, 'id'>;
  employees: EntityTable<Employee, 'id'>;
  categories: EntityTable<Category, 'id'>;
  accessPins: EntityTable<AccessPin, 'id'>;
  syncQueue: EntityTable<SyncQueueItem, 'id'>;
  syncLog: EntityTable<SyncLog, 'id'>;
};

db.version(1).stores({
  products: 'id, user_id, name, is_active',
  movements: 'id, user_id, product_id, type, date, created_at',
  warehouses: 'id, user_id, is_main',
  productWarehouse: 'id, product_id, warehouse_id',
  transitItems: 'id, user_id, product_id',
  sales: 'id, user_id, date, created_at',
  recipes: 'id, user_id, name',
  pendingAccounts: 'id, user_id, status',
  dailyClosings: 'id, user_id, closing_date',
  employees: 'id, user_id',
  categories: 'id, user_id',
  accessPins: 'id, user_id, role, is_active',
  syncQueue: '++id, status, created_at',
  syncLog: '++id, status, created_at',
});

export async function clearLocalData() {
  await Promise.all([
    db.products.clear(),
    db.movements.clear(),
    db.warehouses.clear(),
    db.productWarehouse.clear(),
    db.transitItems.clear(),
    db.sales.clear(),
    db.recipes.clear(),
    db.pendingAccounts.clear(),
    db.dailyClosings.clear(),
    db.employees.clear(),
    db.categories.clear(),
    db.accessPins.clear(),
    db.syncQueue.clear(),
    db.syncLog.clear(),
  ]);
}

export async function cacheAllData(data: {
  products?: Product[];
  movements?: Movement[];
  warehouses?: Warehouse[];
  productWarehouse?: ProductWarehouse[];
  transitItems?: TransitItem[];
  sales?: Sale[];
  recipes?: Recipe[];
  pendingAccounts?: PendingAccount[];
  dailyClosings?: DailyClosing[];
  employees?: Employee[];
  categories?: Category[];
  accessPins?: AccessPin[];
}) {
  const ops: Promise<any>[] = [];
  if (data.products) ops.push(db.products.bulkPut(data.products));
  if (data.movements) ops.push(db.movements.bulkPut(data.movements));
  if (data.warehouses) ops.push(db.warehouses.bulkPut(data.warehouses));
  if (data.productWarehouse) ops.push(db.productWarehouse.bulkPut(data.productWarehouse));
  if (data.transitItems) ops.push(db.transitItems.bulkPut(data.transitItems));
  if (data.sales) ops.push(db.sales.bulkPut(data.sales));
  if (data.recipes) ops.push(db.recipes.bulkPut(data.recipes));
  if (data.pendingAccounts) ops.push(db.pendingAccounts.bulkPut(data.pendingAccounts));
  if (data.dailyClosings) ops.push(db.dailyClosings.bulkPut(data.dailyClosings));
  if (data.employees) ops.push(db.employees.bulkPut(data.employees));
  if (data.categories) ops.push(db.categories.bulkPut(data.categories));
  if (data.accessPins) ops.push(db.accessPins.bulkPut(data.accessPins));
  await Promise.all(ops);
}

export async function getCachedProducts(userId: string): Promise<Product[]> {
  return db.products.where('user_id').equals(userId).toArray();
}

export async function getCachedMovements(userId: string): Promise<Movement[]> {
  return db.movements.where('user_id').equals(userId).toArray();
}

export async function getCachedWarehouses(userId: string): Promise<Warehouse[]> {
  return db.warehouses.where('user_id').equals(userId).toArray();
}

export async function getCachedTransitItems(userId: string): Promise<TransitItem[]> {
  return db.transitItems.where('user_id').equals(userId).toArray();
}

export async function getCachedSales(userId: string): Promise<Sale[]> {
  return db.sales.where('user_id').equals(userId).toArray();
}

export async function getCachedRecipes(userId: string): Promise<Recipe[]> {
  return db.recipes.where('user_id').equals(userId).toArray();
}

export async function getCachedEmployees(userId: string): Promise<Employee[]> {
  return db.employees.where('user_id').equals(userId).toArray();
}

export async function getCachedCategories(userId: string): Promise<Category[]> {
  return db.categories.where('user_id').equals(userId).toArray();
}

export async function getCachedPendingAccounts(userId: string): Promise<PendingAccount[]> {
  return db.pendingAccounts.where('user_id').equals(userId).toArray();
}

export async function getCachedDailyClosings(userId: string): Promise<DailyClosing[]> {
  return db.dailyClosings.where('user_id').equals(userId).toArray();
}

export async function getCachedAccessPins(userId: string): Promise<AccessPin[]> {
  return db.accessPins.where('user_id').equals(userId).toArray();
}

export function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'status' | 'retries'>) {
  return db.syncQueue.add({
    ...item,
    created_at: new Date().toISOString(),
    status: 'pending',
    retries: 0,
  });
}

export function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('status').equals('pending').toArray();
}

export async function updateSyncItemStatus(id: number, status: SyncQueueItem['status'], error?: string) {
  const item = await db.syncQueue.get(id);
  const currentRetries = item?.retries ?? 0;
  return db.syncQueue.update(id, { status, error, retries: status === 'failed' ? currentRetries + 1 : 0 });
}

export function removeSyncItem(id: number) {
  return db.syncQueue.delete(id);
}

export function getSyncQueueCount(): Promise<number> {
  return db.syncQueue.where('status').equals('pending').count();
}

export function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('status').equals('failed').toArray();
}

export default db;
