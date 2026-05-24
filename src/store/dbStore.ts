import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { toast } from 'sonner';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  cost: number;
  rop: number;
  eoq: number;
  lead_time?: number;
  order_cost?: number;
  holding_cost?: number;
  expiration_date?: string;
  description?: string;
  is_individual: boolean;
  is_active: boolean;
  in_transit?: number;
  is_gasto_variable?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  user_id: string;
  product_id: string;
  type: 'ENTRADA' | 'SALIDA' | 'MERMA' | 'AJUSTE' | 'TRANSFERENCIA';
  quantity: number;
  unit: string;
  date: string;
  cost: number;
  reason?: string;
  status?: string;
  justification?: string;
  justification_date?: string;
  is_gasto_variable?: boolean;
  warehouse_id?: string;
  warehouse_destino_id?: string;
  created_at: string;
}

export interface Warehouse {
  id: string;
  user_id: string;
  name: string;
  is_main: boolean;
  created_at: string;
}

export interface ProductWarehouse {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  in_transit: number;
  updated_at: string;
}

export interface TransitItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  consumed: number;
  remaining: number;
  reason?: string;
  sent_date: string;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  employee_id?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_cost: number;
    selling_price: number;
    subtotal: number;
    is_recipe?: boolean;
    recipe_snapshot?: {
      name: string;
      ingredients: {
        product_id: string;
        quantity: number;
        cost: number;
      }[];
    };
  }[];
  total_amount: number;
  date: string;
  sale_type: 'SALON' | 'DOMICILIO' | 'BAR' | 'VENTA_RAPIDA';
  is_account_house: boolean;
  notes?: string;
  discount: number;
  payment_method?: string;
  efectivo?: number;
  transferencia?: number;
  usd?: number;
  eur?: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  selling_price: number;
  ingredients: {
    product_id: string;
    quantity: number;
    unit: string;
  }[];
  created_at: string;
}

export interface PendingAccount {
  id: string;
  user_id: string;
  client_name: string;
  items: PendingItem[];
  total_amount: number;
  is_account_house: boolean;
  sale_type: 'SALON' | 'DOMICILIO' | 'BAR' | 'VENTA_RAPIDA';
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface PendingItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  added_at: string;
}

export interface AccessPin {
  id: string;
  user_id: string;
  pin_hash: string;
  role: 'owner' | 'economist' | 'admin' | 'supervisor' | 'clerk';
  pin_name: string;
  is_active: boolean;
  failed_attempts: number;
  blocked_until: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño/a',
  economist: 'Económico/a',
  admin: 'Administrador/a',
  supervisor: 'Supervisor/a',
  clerk: 'Dependiente/a',
};

export const ROLE_MODULES: Record<string, string[]> = {
  owner: ['sales', 'inventory', 'movements', 'transit', 'recipes', 'consumption', 'closings', 'charts', 'analysis', 'filtered', 'hr', 'ai', 'settings'],
  economist: ['sales', 'inventory', 'movements', 'transit', 'recipes', 'consumption', 'closings', 'charts', 'analysis', 'filtered', 'hr', 'ai', 'settings'],
  admin: ['inventory', 'movements', 'transit'],
  supervisor: ['sales', 'closings'],
  clerk: ['sales'],
};

export const MODULE_ROLES: Record<string, string[]> = {
  '/dashboard': ['owner', 'economist', 'admin'],
  '/inventory': ['owner', 'economist', 'admin'],
  '/movements': ['owner', 'economist', 'admin'],
  '/transit': ['owner', 'economist', 'admin'],
  '/sales': ['owner', 'economist', 'supervisor', 'clerk'],
  '/closings': ['owner', 'economist', 'supervisor'],
  '/hr': ['owner', 'economist'],
  '/recipes': ['owner', 'economist'],
  '/consumption': ['owner', 'economist'],
  '/analysis': ['owner', 'economist'],
  '/charts': ['owner', 'economist'],
  '/filtered': ['owner', 'economist'],
  '/ai': ['owner', 'economist'],
  '/settings': ['owner'],
  '/action-logs': ['owner', 'economist'],
};

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  role: string;
  salary: number;
  phone?: string;
  email?: string;
  nit_id?: string;
  category?: string;
  photo_url?: string;
  hire_date?: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface DailyClosing {
  id: string;
  user_id: string;
  closing_date: string;
  total_sales: number;
  total_discounts: number;
  total_refunds: number;
  closing_amount: number;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  cup_efectivo?: number;
  cup_transfer?: number;
  usd?: number;
  eur?: number;
}

export interface HRDocument {
  id: string;
  user_id: string;
  name: string;
  doc_type: 'MANUAL' | 'REGLAMENTO' | 'PNO';
  file_url: string;
  file_name: string;
  file_size?: number;
  created_at: string;
}

export interface EmployeeDocument {
  id: string;
  user_id: string;
  employee_id: string;
  name: string;
  doc_type: 'CONTRATO' | 'IDENTIFICACION' | 'OTRO';
  file_url: string;
  file_name: string;
  file_size?: number;
  created_at: string;
}

export interface Department {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface PayrollConfig {
  id: string;
  user_id: string;
  tax_exemption_base: number;
  tax_rate: number;
  special_contribution_rate: number;
  last_calculated_month?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollEntry {
  id: string;
  user_id: string;
  employee_id: string;
  employee_name: string;
  employee_category: string;
  month: number;
  year: number;
  base_salary: number;
  earned_salary: number;
  exemption_base: number;
  taxable_base: number;
  tax_amount: number;
  special_contribution: number;
  net_salary: number;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

const capitalize = (str: string) =>
  str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const DEFAULT_TIMEOUT = 30000; // 30 segundos

const isRateLimitError = (err: any): boolean => {
  return err?.status === 429 || err?.code === '429' || 
         err?.message?.includes('rate limit') || 
         err?.message?.includes('too many requests');
};

const checkRealInternetConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const { error } = await supabase.from('products').select('id').limit(1).maybeSingle();
    
    clearTimeout(timeoutId);
    return !error;
  } catch {
    return false;
  }
};

const withTimeout = async <T>(
  promise: Promise<T>, 
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> => {
  try {
    const result = await Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`TIMEOUT`)), timeoutMs)
      )
    ]);
    return result;
  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      throw new Error('La conexión está lenta. Intenta de nuevo.');
    }
    throw err;
  }
};

const RETRYABLE_ERRORS = [
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'REFUSED_STREAM',
  'TIMEOUT',
  'La conexión está lenta',
  'network',
  'ERR_HTTP2',
];

const queryWithRetry = async <T>(
  queryFn: () => PromiseLike<{ data: T; error: any }>,
  maxRetries: number = 3
): Promise<{ data: T; error: any }> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(Promise.resolve(queryFn()), DEFAULT_TIMEOUT);
    } catch (err: any) {
      const errMsg = err?.message || '';
      const isRetryable = RETRYABLE_ERRORS.some(msg => errMsg.includes(msg));
      
      if (attempt < maxRetries && isRetryable) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
        if (import.meta.env.DEV) {
          console.warn(`⚠️ Reintentando consulta (${attempt + 1}/${maxRetries}) en ${backoff}ms...`);
        }
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Error inesperado en queryWithRetry');
};

let lastOperationTime: Record<string, number> = {};
const operationCooldown = 1000; // 1 segundo entre operaciones del mismo tipo

const withCooldown = async <T>(
  operationKey: string,
  operation: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const lastTime = lastOperationTime[operationKey] || 0;
  const timeSinceLastOp = now - lastTime;
  
  if (timeSinceLastOp < operationCooldown) {
    await new Promise(resolve => setTimeout(resolve, operationCooldown - timeSinceLastOp));
  }
  
  lastOperationTime[operationKey] = Date.now();
  return operation();
};

export const resetConnectionCooldown = () => {
  lastOperationTime = {};
};

export const forceRefreshData = async () => {
  console.log('🔄 Forzando recarga de datos...');
  const { fetchAll } = useDatabaseStore.getState();
  await fetchAll();
  console.log('✅ Datos recargados exitosamente');
};

interface DatabaseState {
  products: Product[];
  movements: Movement[];
  sales: Sale[];
  recipes: Recipe[];
  employees: Employee[];
  categories: Category[];
  transitItems: TransitItem[];
  dailyClosings: DailyClosing[];
  hrDocuments: HRDocument[];
  employeeDocuments: EmployeeDocument[];
  departments: Department[];
  payrollConfig: PayrollConfig | null;
  payrollEntries: PayrollEntry[];
  pendingAccounts: PendingAccount[];
  accessPins: AccessPin[];
  actionLogs: any[];
  warehouses: Warehouse[];
  productWarehouse: ProductWarehouse[];
  currentWarehouseId: string | null;
  isLoading: boolean;
  isFetchingWarehouses: boolean;

  fetchAll: (limit?: number) => Promise<void>;
  fetchMore: (limit?: number) => Promise<{ hasMore: boolean }>;
  addProduct: (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addMovement: (movement: Omit<Movement, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  justifyMovement: (id: string, justification: string) => Promise<void>;
  
  consumeFromTransit: (productId: string, quantity: number, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cancelTransit: (transitItemId: string, quantity: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  registerWasteFromTransit: (transitItemId: string, quantity: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  registerManualConsumption: (transitItemId: string, quantity: number, note?: string) => Promise<{ success: boolean; error?: string }>;
  
  addSale: (sale: Omit<Sale, 'id' | 'user_id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  
  addRecipe: (recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  
  addEmployee: (employee: Omit<Employee, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  recalculateStock: () => Promise<void>;
  createDailyClosing: (closing: Omit<DailyClosing, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  getDailyClosings: () => Promise<void>;

  uploadHRDocument: (file: File, docType: 'MANUAL' | 'REGLAMENTO' | 'PNO') => Promise<{ success: boolean; error?: string }>;
  fetchHRDocuments: () => Promise<void>;
  deleteHRDocument: (id: string, fileUrl: string) => Promise<void>;

  uploadEmployeeDocument: (file: File, employeeId: string, docType: 'CONTRATO' | 'IDENTIFICACION' | 'OTRO', name?: string) => Promise<{ success: boolean; error?: string }>;

  createPendingAccount: (clientName: string) => Promise<{ success: boolean; error?: string; accountId?: string }>;
addItemsToPendingAccount: (accountId: string, items: { product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[], isAccountHouse?: boolean, saleType?: 'SALON' | 'DOMICILIO' | 'BAR' | 'VENTA_RAPIDA')
    => Promise<{ success: boolean; error?: string }>;
  updatePendingAccount: (accountId: string, updates: Partial<PendingAccount>) => Promise<{ success: boolean; error?: string }>;
  updatePendingAccountItems: (accountId: string, items: PendingItem[]) => Promise<{ success: boolean; error?: string }>;
  togglePendingAccountType: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  deletePendingAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  getPendingAccounts: () => Promise<void>;
  chargePendingAccount: (accountId: string, employeeId: string, employeeName: string, saleDate?: string, paymentMethod?: string, efectivo?: number, transferencia?: number, usd?: number, eur?: number) => Promise<{ success: boolean; error?: string }>;

  saveAccessPin: (role: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  toggleAccessPin: (pinId: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteAccessPin: (pinId: string) => Promise<{ success: boolean; error?: string }>;
  verifyPinForModule: (modulePath: string, pin: string) => Promise<{ success: boolean; error?: string; blocked?: boolean; remainingTime?: number }>;
  verifyPinSimple: (pin: string) => Promise<{ success: boolean; error?: string; blocked?: boolean; remainingTime?: number; role?: string }>;
  accessPins: AccessPin[];
  verifiedRole: string | null;
  verifiedRoleName: string | null;
  clearVerifiedRole: () => void;
  fetchEmployeeDocuments: (employeeId: string) => Promise<void>;
  deleteEmployeeDocument: (id: string, fileUrl: string) => Promise<void>;

  addDepartment: (name: string) => Promise<void>;
  updateDepartment: (id: string, name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  getPayrollConfig: () => Promise<void>;
  updatePayrollConfig: (updates: Partial<PayrollConfig>) => Promise<void>;

  calculatePayroll: (month: number, year: number) => Promise<void>;
  getPayrollEntries: (month: number, year: number) => Promise<void>;
  updatePayrollEntry: (id: string, updates: Partial<PayrollEntry>) => Promise<void>;
  regeneratePayrollEntry: (id: string) => Promise<void>;

  // Paginación optimizada
  getEmployeesPaginated: (page: number, search?: string, departmentId?: string, sortBy?: 'name' | 'salary', sortOrder?: 'asc' | 'desc') => Promise<void>;
  getDepartmentsPaginated: (page: number, search?: string) => Promise<void>;
  getPayrollEntriesPaginated: (page: number, month: number, year: number) => Promise<void>;
  getPayrollEntriesCount: (month: number, year: number) => Promise<number>;
  getEmployeesCount: (search?: string, departmentId?: string) => Promise<number>;
  getDepartmentsCount: (search?: string) => Promise<number>;

  syncPendingData: () => Promise<void>;
  forceRefreshData: () => Promise<void>;
  
  // Warehouse management
  fetchWarehouses: () => Promise<void>;
  addWarehouse: (name: string, is_main?: boolean) => Promise<void>;
  updateWarehouse: (id: string, name: string) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  setCurrentWarehouse: (warehouseId: string) => void;
  fetchProductWarehouse: (skipAutoHeal?: boolean) => Promise<void>;
  updateProductWarehouseQuantity: (productId: string, warehouseId: string, quantity: number, skipAutoHeal?: boolean) => Promise<void>;
  
  // Logging de acciones
  logAction: (module: string, action: string, details?: Record<string, any>) => Promise<void>;
  getActionLogs: () => Promise<void>;
  hashPin: (pin: string) => Promise<string>;
}

export const useDatabaseStore = create<DatabaseState>()((set, get) => ({
  products: [],
  movements: [],
  sales: [],
  recipes: [],
  employees: [],
  categories: [],
  transitItems: [],
  dailyClosings: [],
  hrDocuments: [],
  employeeDocuments: [],
  departments: [],
  payrollConfig: null,
  payrollEntries: [],
  accessPins: [],
  // Paginación
  employeesPage: 1,
  employeesTotal: 0,
  departmentsPage: 1,
  departmentsTotal: 0,
  payrollPage: 1,
  payrollTotal: 0,
  employeeSearchTerm: '',
  departmentSearchTerm: '',
  payrollMonthFilter: 0,
  payrollYearFilter: 0,
  verifiedRole: typeof window !== 'undefined' ? localStorage.getItem('verifiedRole') : null,
  verifiedRoleName: typeof window !== 'undefined' ? localStorage.getItem('verifiedRoleName') : null,
  actionLogs: [],
  warehouses: [],
  productWarehouse: [],
  currentWarehouseId: null,
  pendingAccounts: [],
  isLoading: true,
  isFetchingWarehouses: false,

  clearVerifiedRole: () => {
    localStorage.removeItem('verifiedRole');
    localStorage.removeItem('verifiedRoleName');
    set({ verifiedRole: null, verifiedRoleName: null });
  },

  fetchAll: async (limit = 50) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ products: [], movements: [], sales: [], recipes: [], employees: [], categories: [], transitItems: [], dailyClosings: [], hrDocuments: [], employeeDocuments: [], departments: [], payrollConfig: null, payrollEntries: [], pendingAccounts: [], accessPins: [], actionLogs: [], warehouses: [], productWarehouse: [], currentWarehouseId: null, isLoading: false });
      return;
    }

    const isFetchingAll = get().isLoading && get().products.length > 0;
    if (isFetchingAll) {
      return;
    }

    set({ isLoading: true });

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      console.log('📥 Cargando datos principales...');
      const [productsRes, movementsRes] = await Promise.all([
        queryWithRetry(() => supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('movements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
      ]);
      await delay(300);

      // Grupo 2: Ventas y Recetas
      console.log('📥 Cargando ventas y recetas...');
      const [salesRes, recipesRes] = await Promise.all([
        queryWithRetry(() => supabase.from('sales').select('*, sale_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('recipes').select('*, recipe_ingredients(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
      ]);
      await delay(300);

      // Grupo 3: Empleados y Recursos Humanos
      console.log('📥 Cargando empleados y RRHH...');
      const [employeesRes, categoriesRes, hrDocsRes, departmentsRes] = await Promise.all([
        queryWithRetry(() => supabase.from('employees').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('hr_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('departments').select('*').eq('user_id', user.id).order('name', { ascending: true })),
      ]);
      await delay(300);

      // Grupo 4: Cierres, Configuración y Otros
      console.log('📥 Cargando cierres y configuración...');
      const [transitRes, dailyClosingsRes, pendingRes, accessPinsRes, actionLogsRes, payrollConfigRes] = await Promise.all([
        queryWithRetry(() => supabase.from('transit_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('daily_closings').select('*').eq('user_id', user.id).order('closing_date', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('pending_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('access_pins').select('*').eq('user_id', user.id).limit(limit)),
        queryWithRetry(() => supabase.from('action_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)),
        queryWithRetry(() => supabase.from('payroll_config').select('*').eq('user_id', user.id).maybeSingle()),
      ]);

      const recipes = recipesRes.data?.map(r => ({
        ...r,
        ingredients: r.recipe_ingredients || [],
      })) || [];

      const sales = salesRes.data?.map(s => ({
        ...s,
        items: s.sale_items || [],
      })) || [];

      const transitItems = (transitRes.data || []).filter(t => t.remaining > 0);

      set({
        products: productsRes.data || [],
        movements: movementsRes.data || [],
        sales,
        recipes,
        employees: employeesRes.data || [],
        categories: categoriesRes.data || [],
        transitItems,
        dailyClosings: dailyClosingsRes.data || [],
        hrDocuments: hrDocsRes.data || [],
        departments: departmentsRes.data || [],
        payrollConfig: payrollConfigRes.data || null,
        pendingAccounts: (pendingRes.data || []).filter((p: any) => p.status === 'pending'),
        accessPins: accessPinsRes.data || [],
        actionLogs: actionLogsRes.data || [],
        isLoading: false,
      });
      console.log('✅ Datos cargados completamente');
    } catch (error) {
      console.error('Error en fetchAll:', error);
      set({ isLoading: false });
    }
  },

  fetchMore: async (limit = 50) => {
    const user = useAuthStore.getState().user;
    if (!user || get().isLoading) {
      return { hasMore: false };
    }

    try {
      const currentProducts = get().products;
      const currentMovements = get().movements;
      const currentSales = get().sales;
      const currentActionLogs = get().actionLogs;

      const lastProduct = currentProducts[currentProducts.length - 1];
      const lastMovement = currentMovements[currentMovements.length - 1];
      const lastSale = currentSales[currentSales.length - 1];
      const lastLog = currentActionLogs[currentActionLogs.length - 1];

      const [productsRes, movementsRes, salesRes, actionLogsRes] = await Promise.all([
        lastProduct 
          ? supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).lt('created_at', lastProduct.created_at).limit(limit)
          : Promise.resolve({ data: [], count: 0, error: null }),
        lastMovement
          ? supabase.from('movements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).lt('created_at', lastMovement.created_at).limit(limit)
          : Promise.resolve({ data: [], count: 0, error: null }),
        lastSale
          ? supabase.from('sales').select('*, sale_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }).lt('created_at', lastSale.created_at).limit(limit)
          : Promise.resolve({ data: [], count: 0, error: null }),
        lastLog
          ? supabase.from('action_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).lt('created_at', lastLog.created_at).limit(limit)
          : Promise.resolve({ data: [], count: 0, error: null }),
      ]);

      const newSales = salesRes.data?.map((s: any) => ({
        ...s,
        items: s.sale_items || [],
      })) || [];

      const hasMoreProducts = productsRes.data?.length === limit;
      const hasMoreMovements = movementsRes.data?.length === limit;
      const hasMoreSales = newSales.length === limit;
      const hasMoreLogs = actionLogsRes.data?.length === limit;

      set({
        products: [...currentProducts, ...(productsRes.data || [])],
        movements: [...currentMovements, ...(movementsRes.data || [])],
        sales: [...currentSales, ...newSales],
        actionLogs: [...currentActionLogs, ...(actionLogsRes.data || [])],
      });

      return { 
        hasMore: hasMoreProducts || hasMoreMovements || hasMoreSales || hasMoreLogs 
      };
    } catch (error) {
      console.error('Error en fetchMore:', error);
      return { hasMore: false };
    }
  },

addProduct: async (product) => {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('No hay usuario autenticado');

    const normalizeString = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const isDuplicate = get().products.some(
      p => normalizeString(p.name) === normalizeString(product.name) && p.is_active !== false
    );

    if (isDuplicate) {
      throw new Error(`¡Ups! El producto "${product.name}" ya existe. Intenta con otro nombre.`);
    }

    try {
      const productId = crypto.randomUUID();
      
      const productData = {
        ...product,
        id: productId,
        name: capitalize(product.name),
        category: capitalize(product.category),
        user_id: user.id,
        expiration_date: product.expiration_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await withTimeout(
        supabase
          .from('products')
          .insert(productData)
          .select()
          .single(),
        10000
      );

      if (error) {
        console.error('Error adding product:', error);
        throw new Error(error.message || 'Error al crear el producto');
      }

      if (Number(product.quantity) > 0) {
        // Obtener el almacén principal para asignar al movimiento inicial
        const mainWarehouse = get().warehouses.find(w => w.is_main) || get().warehouses[0];
        
        const { error: movementError } = await withTimeout(
          supabase
            .from('movements')
            .insert({
              user_id: user.id,
              product_id: data.id,
              type: 'ENTRADA',
              quantity: Number(product.quantity),
              unit: product.unit,
              date: new Date().toISOString(),
              cost: Number(product.cost),
              reason: 'Stock inicial (Registro de producto)',
              status: 'NORMAL',
              warehouse_id: mainWarehouse?.id || null,
            }),
          10000
        );

        if (movementError && import.meta.env.DEV) {
          console.error('Error creating initial movement:', movementError);
        }
      }

      const warehouses = get().warehouses;
      const mainWarehouse = warehouses.find(w => w.is_main) || warehouses[0];
      for (const warehouse of warehouses) {
        const initialQty = (warehouse.id === mainWarehouse?.id) ? Number(product.quantity) || 0 : 0;
        await withTimeout(
          supabase.from('product_warehouse').upsert({
            product_id: data.id,
            warehouse_id: warehouse.id,
            quantity: initialQty,
            in_transit: 0
          }, { onConflict: 'product_id,warehouse_id' }),
          10000
        );
      }

      // Sincronizar estado local con las nuevas entradas creadas
      await get().fetchProductWarehouse();
      
      // Sincronizar todos los datos para que aparezcan en el módulo de Movimientos
      await get().fetchAll();

      toast.success('Producto guardado exitosamente');
    } catch (error: any) {
      console.error('Error en addProduct:', error);
      throw new Error(error.message || 'Error al crear el producto');
    }
  },

  updateProduct: async (id, updates) => {
    const capitalizedUpdates = {
      ...updates,
      ...(updates.name !== undefined && { name: capitalize(updates.name) }),
      ...(updates.category !== undefined && { category: capitalize(updates.category) }),
      updated_at: new Date().toISOString(),
    };

    const { error } = await withTimeout(
      supabase
        .from('products')
        .update(capitalizedUpdates)
        .eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo actualizar el producto');
    }

    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p),
    }));
  },

  deleteProduct: async (id) => {
    const { error } = await withTimeout(
      supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo eliminar el producto');
    }

    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, is_active: false } : p),
    }));
    toast.success('Producto eliminado');
  },

  addMovement: async (movement) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No hay usuario autenticado');

    const isOnline = navigator.onLine;
    
    const movementDate = movement.date || new Date().toISOString();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');

      const { data: newMovement, error: movementError } = await withTimeout(
        supabase
          .from('movements')
          .insert({ ...movement, user_id: user.id, date: movementDate })
          .select()
          .single(),
        10000
      );

      if (movementError) {
        console.error('Error addMovement:', movementError);
        throw new Error(movementError.message || 'No se pudo registrar el movimiento');
      }

      const product = get().products.find(p => p.id === movement.product_id);
      if (!product) throw new Error('Producto no encontrado');

      if (movement.warehouse_id) {
        const pw = get().productWarehouse.find(
          p => p.product_id === movement.product_id && p.warehouse_id === movement.warehouse_id
        );
        const currentQty = pw ? Number(pw.quantity) : 0;

        if (movement.type === 'ENTRADA') {
          console.log('🔄 SALIDA/ENTRADA: Actualizando quantity para ENTRADA...');
          await get().updateProductWarehouseQuantity(movement.product_id, movement.warehouse_id, currentQty + Number(movement.quantity), true);
          console.log('✅ SALIDA/ENTRADA: Quantity actualizado');
        } else if (movement.type === 'SALIDA') {
          console.log('🔄 SALIDA: Actualizando quantity para SALIDA...');
          try {
            await get().updateProductWarehouseQuantity(movement.product_id, movement.warehouse_id, Math.max(0, currentQty - Number(movement.quantity)), true);
            console.log('✅ SALIDA: Quantity actualizado, creando transit_item...');
          } catch (err) {
            console.error('❌ SALIDA: Error en updateProductWarehouseQuantity:', err);
            throw err;
          }
          
          try {
            const { data: newTransitItem, error: transitError } = await withTimeout(
              supabase
                .from('transit_items')
                .insert({
                  user_id: user.id,
                  product_id: movement.product_id,
                  quantity: Number(movement.quantity),
                  consumed: 0,
                  remaining: Number(movement.quantity),
                  reason: movement.reason || 'Enviado a cocina/preparacion',
                  sent_date: movementDate,
                })
                .select()
                .single(),
              10000
            );

            if (transitError) {
              console.error('❌ SALIDA: Error creando transit_item:', transitError);
            } else if (newTransitItem) {
              console.log('✅ SALIDA: transit_item creado');
              set((state) => ({ 
                transitItems: [newTransitItem, ...state.transitItems],
              }));
            }
          } catch (err) {
            console.error('❌ SALIDA: Error en transit_item:', err);
          }
        } else if (movement.type === 'MERMA') {
          await get().updateProductWarehouseQuantity(movement.product_id, movement.warehouse_id, Math.max(0, currentQty - Number(movement.quantity)), true);
        } else if (movement.type === 'AJUSTE') {
          await get().updateProductWarehouseQuantity(movement.product_id, movement.warehouse_id, Math.max(0, currentQty + Number(movement.quantity)), true);
        } else if (movement.type === 'TRANSFER') {
          await get().updateProductWarehouseQuantity(movement.product_id, movement.warehouse_id, Math.max(0, currentQty - Number(movement.quantity)), true);
        }

        set((state) => ({ movements: [newMovement, ...state.movements] }));
        return;
      }

      let newQuantity = Number(product.quantity);
      let newInTransit = Number(product.in_transit) || 0;
      let newCost = Number(product.cost);

      if (movement.type === 'ENTRADA') {
        const unitCost = Number(movement.cost) || Number(product.cost);
        const currentTotalValue = Number(product.quantity) * Number(product.cost);
        const newTotalValue = Number(movement.quantity) * unitCost;
        newQuantity = Number(product.quantity) + Number(movement.quantity);
        
        if (newQuantity > 0) {
          newCost = (currentTotalValue + newTotalValue) / newQuantity;
        }
        
        await get().updateProduct(movement.product_id, { quantity: newQuantity, cost: newCost });
} else if (movement.type === 'SALIDA') {
        console.log('🔄 SALIDA (sin warehouse): Actualizando in_transit...');
        newInTransit = newInTransit + Number(movement.quantity);
        await get().updateProduct(movement.product_id, { in_transit: newInTransit });
        console.log('✅ SALIDA (sin warehouse): in_transit actualizado');
        
        console.log('🔄 SALIDA (sin warehouse): Creando transit_item...');
        const { data: newTransitItem, error: transitError } = await withTimeout(
          supabase
            .from('transit_items')
            .insert({
              user_id: user.id,
              product_id: movement.product_id,
              quantity: Number(movement.quantity),
              consumed: 0,
              remaining: Number(movement.quantity),
              reason: movement.reason || 'Enviado a cocina/preparacion',
              sent_date: movementDate,
            })
            .select()
            .single(),
          10000
        );

        if (transitError) {
          console.error('❌ SALIDA (sin warehouse): Error creando transit_item:', transitError);
        } else {
          console.log('✅ SALIDA (sin warehouse): transit_item creado');
          set((state) => ({ 
            transitItems: [newTransitItem, ...state.transitItems],
            products: state.products.map(p => 
              p.id === movement.product_id ? { ...p, in_transit: newInTransit } : p
            ),
          }));
        }
      } else if (movement.type === 'MERMA') {
        newQuantity = Number(product.quantity) - Number(movement.quantity);
        
        await get().updateProduct(movement.product_id, { quantity: newQuantity });
      } else if (movement.type === 'AJUSTE') {
        newQuantity = Number(product.quantity) + Number(movement.quantity);
        
        await get().updateProduct(movement.product_id, { quantity: Math.max(0, newQuantity) });
      } else if (movement.type === 'TRANSFER') {
        newQuantity = Number(product.quantity) - Number(movement.quantity);
        
        await get().updateProduct(movement.product_id, { quantity: Math.max(0, newQuantity) });
      }

      set((state) => ({ movements: [newMovement, ...state.movements] }));
    } catch (error: any) {
      console.error('Error en addMovement:', error);
      throw new Error(error.message || 'Error al registrar el movimiento');
    }
  },

  justifyMovement: async (id, justification) => {
    try {
      const { error } = await withTimeout(
        supabase
          .from('movements')
          .update({ 
            status: 'JUSTIFICADO', 
            justification, 
            justification_date: new Date().toISOString() 
          })
          .eq('id', id),
        10000
      );

      if (error) {
        throw new Error('No se pudo justificar el movimiento');
      }

      set((state) => ({
        movements: state.movements.map(m =>
          m.id === id ? { ...m, status: 'JUSTIFICADO', justification, justification_date: new Date().toISOString() } : m
        ),
      }));
    } catch (error: any) {
      console.error('Error en justifyMovement:', error);
      throw new Error(error.message || 'Error al justificar movimiento');
    }
  },

  fetchWarehouses: async () => {
    if (get().isFetchingWarehouses) return;
    set({ isFetchingWarehouses: true });
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching warehouses:', error);
        return;
      }

      let warehouses = data as Warehouse[];

      // Auto-crear Almacén Principal si no existe ninguno
      if (warehouses.length === 0) {
        const { data: newWarehouse, error: createError } = await supabase
          .from('warehouses')
          .insert({ user_id: user.id, name: 'Almacén', is_main: true })
          .select()
          .single();

        if (!createError && newWarehouse) {
          warehouses = [newWarehouse as Warehouse];
        }
      }

      set({ warehouses });

      const mainWarehouse = warehouses.find(w => w.is_main) || warehouses[0];
      if (mainWarehouse && !get().currentWarehouseId) {
        set({ currentWarehouseId: mainWarehouse.id });
      }
    } finally {
      set({ isFetchingWarehouses: false });
    }
  },

  addWarehouse: async (name: string, is_main: boolean = false) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const currentWarehouses = get().warehouses;
    if (currentWarehouses.length >= 3) {
      toast.error('Máximo 3 almacenes permitidos');
      return;
    }
    
    if (is_main) {
      for (const w of currentWarehouses) {
        if (w.is_main) {
          await supabase.from('warehouses').update({ is_main: false }).eq('id', w.id);
        }
      }
    }
    
    const { data, error } = await supabase
      .from('warehouses')
      .insert({ user_id: user.id, name, is_main })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding warehouse:', error);
      toast.error('Error al crear almacén');
      return;
    }
    
    // Copiar todos los productos activos al nuevo almacén
    // Si es el almacén principal, usar el stock global del producto; si no, 0
    if (data) {
      const activeProducts = get().products.filter(p => p.is_active !== false);
      const mainWarehouse = activeProducts.length > 0 ? get().warehouses.find(w => w.is_main) : null;
      for (const product of activeProducts) {
        const qty = (mainWarehouse && data.is_main) ? Number(product.quantity) || 0 : 0;
        await supabase
          .from('product_warehouse')
          .insert({
            product_id: product.id,
            warehouse_id: data.id,
            quantity: qty,
            in_transit: 0
          });
      }
    }
    
    await get().fetchProductWarehouse();
    await get().fetchWarehouses();
    toast.success('Almacén creado');
  },

  updateWarehouse: async (id: string, name: string) => {
    const { error } = await supabase
      .from('warehouses')
      .update({ name })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating warehouse:', error);
      toast.error('Error al actualizar almacén');
      return;
    }
    
    await get().fetchWarehouses();
    toast.success('Almacén actualizado');
  },

  deleteWarehouse: async (id: string) => {
    const warehouse = get().warehouses.find(w => w.id === id);
    if (warehouse?.is_main) {
      toast.error('No puedes eliminar el almacén principal');
      return;
    }

    try {
      // Liberar movimientos asociados al almacén
      const { error: movError } = await supabase
        .from('movements')
        .update({ warehouse_id: null })
        .eq('warehouse_id', id);

      if (movError) {
        console.error('Error al actualizar movimientos:', movError);
        toast.error('Error al liberar movimientos del almacén');
        return;
      }

      // Migrar stock del almacén eliminado al almacén principal
      const mainWarehouse = get().warehouses.find(w => w.is_main) || get().warehouses[0];
      const warehouseStock = get().productWarehouse.filter(pw => pw.warehouse_id === id);

      for (const pw of warehouseStock) {
        const warehouseQty = Number(pw.quantity) || 0;

        if (warehouseQty > 0 && mainWarehouse) {
          // Buscar si ya existe registro en el almacén principal (evita UPSERT que da 403 por RLS)
          const { data: existingPw } = await supabase
            .from('product_warehouse')
            .select('id, quantity')
            .eq('product_id', pw.product_id)
            .eq('warehouse_id', mainWarehouse.id)
            .maybeSingle();

          const mainQty = existingPw ? Number(existingPw.quantity) || 0 : 0;

          if (existingPw) {
            await supabase
              .from('product_warehouse')
              .update({ quantity: mainQty + warehouseQty })
              .eq('id', existingPw.id);
          } else {
            await supabase
              .from('product_warehouse')
              .insert({
                product_id: pw.product_id,
                warehouse_id: mainWarehouse.id,
                quantity: mainQty + warehouseQty,
                in_transit: 0,
              });
          }
        }

        await supabase.from('product_warehouse').delete().eq('id', pw.id);
      }

      // Eliminar el almacén
      const { error: deleteError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error al eliminar almacén:', deleteError);
        toast.error('Error al eliminar almacén');
        return;
      }

      // Recargar datos y limpiar estado
      if (get().currentWarehouseId === id) {
        set({ currentWarehouseId: mainWarehouse?.id || null });
      }

      await get().fetchProductWarehouse();
      await get().fetchWarehouses();
      toast.success('Almacén eliminado. El stock ha sido migrado al almacén principal.');
    } catch (error) {
      console.error('Error inesperado en deleteWarehouse:', error);
      toast.error('Error inesperado al eliminar el almacén');
    }
  },

  setCurrentWarehouse: (warehouseId: string) => {
    set({ currentWarehouseId: warehouseId });
  },

  fetchProductWarehouse: async (skipAutoHeal: boolean = false) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const { data, error } = await supabase
      .from('product_warehouse')
      .select('*');
    
    if (error) {
      console.error('Error fetching product_warehouse:', error);
      return;
    }
    
    if (skipAutoHeal) {
      set({ productWarehouse: data as ProductWarehouse[] });
      return;
    }
    
    // Auto-heal: detectar y corregir entradas faltantes o con valores incorrectos
    const warehouses = get().warehouses;
    const products = get().products.filter(p => p.is_active !== false);
    const mainWarehouse = warehouses.find(w => w.is_main) || warehouses[0];
    
    let created = 0;
    for (const warehouse of warehouses) {
      for (const product of products) {
        const existingPw = data.find(
          pw => pw.product_id === product.id && pw.warehouse_id === warehouse.id
        );
        const expectedQty = (warehouse.id === mainWarehouse?.id) ? Number(product.quantity) || 0 : 0;
        
        // Crear o actualizar: siempre hace UPSERT para corregir valores incorrectos
        if (!existingPw || Number(existingPw.quantity) !== expectedQty) {
          await supabase.from('product_warehouse').upsert({
            product_id: product.id,
            warehouse_id: warehouse.id,
            quantity: expectedQty,
            in_transit: Number(product.in_transit) || 0
          }, { onConflict: 'product_id,warehouse_id' });
          created++;
        }
      }
    }
    
    if (created > 0) {
      console.log(`🔧 Auto-heal product_warehouse: ${created} entradas creadas`);
      // Volver a fetch si se crearon nuevas
      const { data: newData } = await supabase.from('product_warehouse').select('*');
      set({ productWarehouse: newData as ProductWarehouse[] });
    } else {
      set({ productWarehouse: data as ProductWarehouse[] });
    }
  },

  updateProductWarehouseQuantity: async (productId: string, warehouseId: string, quantity: number, skipAutoHeal: boolean = false) => {
    const existing = get().productWarehouse.find(pw => pw.product_id === productId && pw.warehouse_id === warehouseId);
    
    if (existing) {
      await supabase
        .from('product_warehouse')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('product_warehouse')
        .insert({ product_id: productId, warehouse_id: warehouseId, quantity, in_transit: 0 });
    }
    
    await get().fetchProductWarehouse(skipAutoHeal);
  },

  addSale: async (sale) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const itemsToConsume: { productId: string; name: string; qtyNeeded: number; qtyAvailable: number }[] = [];
    const productsMap = new Map(get().products.map(p => [p.id, p]));
    const transitMap = new Map<string, number>();
    for (const t of get().transitItems) {
      const current = transitMap.get(t.product_id) || 0;
      transitMap.set(t.product_id, current + t.remaining);
    }

    for (const item of sale.items) {
      if (!item.is_recipe) {
        const transitAvailable = transitMap.get(item.product_id) || 0;
        const product = productsMap.get(item.product_id);
        const productName = product?.name || 'producto';
        
        if (transitAvailable < item.quantity) {
          return { 
            success: false, 
            error: `No hay suficiente "${productName}" en transito. Necesitas: ${item.quantity}, Disponible: ${transitAvailable}` 
          };
        }
        itemsToConsume.push({ productId: item.product_id, name: productName, qtyNeeded: item.quantity, qtyAvailable: transitAvailable });
      } else if (item.is_recipe && item.recipe_snapshot) {
        for (const ing of item.recipe_snapshot.ingredients) {
          const transitAvailable = transitMap.get(ing.product_id) || 0;
          const needed = ing.quantity * item.quantity;
          
          const ingProduct = productsMap.get(ing.product_id);
          const ingProductName = ingProduct?.name || 'ingrediente';
          
          if (transitAvailable < needed) {
            return { 
              success: false, 
              error: `No hay suficiente "${ingProductName}" en transito para la receta "${item.recipe_snapshot?.name}". Necesitas: ${needed}, Disponible: ${transitAvailable}` 
            };
          }
          const existingIdx = itemsToConsume.findIndex(i => i.productId === ing.product_id);
          if (existingIdx >= 0) {
            itemsToConsume[existingIdx].qtyNeeded += needed;
          } else {
            itemsToConsume.push({ productId: ing.product_id, name: ingProductName, qtyNeeded: needed, qtyAvailable: transitAvailable });
          }
        }
      }
    }

    try {
      const { data: newSale, error: saleError } = await withTimeout(
        supabase
          .from('sales')
          .insert({ 
            user_id: user.id, 
            employee_id: sale.employee_id,
            total_amount: sale.total_amount,
            date: sale.date,
            sale_type: sale.sale_type,
            is_account_house: sale.is_account_house || false,
            notes: sale.notes,
            discount: sale.discount,
            payment_method: sale.payment_method || null,
            efectivo: sale.efectivo || 0,
            transferencia: sale.transferencia || 0,
            usd: sale.usd || 0,
            eur: sale.eur || 0,
          })
          .select()
          .single(),
        10000
      );

      if (saleError) {
        console.error('Error adding sale:', saleError);
        return { success: false, error: 'Error al registrar la venta' };
      }

      const saleItems = sale.items.map(item => ({
        sale_id: newSale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        selling_price: item.selling_price,
        subtotal: item.subtotal,
        is_recipe: item.is_recipe || false,
        recipe_snapshot: item.recipe_snapshot,
      }));

      const { error: itemsError } = await withTimeout(
        supabase.from('sale_items').insert(saleItems),
        10000
      );

      if (itemsError) {
        console.error('Error adding sale items:', itemsError);
      }

      for (const item of sale.items) {
        if (!item.is_recipe) {
          await get().consumeFromTransit(item.product_id, item.quantity, `Venta #${newSale.id.slice(0, 8)}`);
        } else if (item.is_recipe && item.recipe_snapshot) {
          for (const ing of item.recipe_snapshot.ingredients) {
            await get().consumeFromTransit(ing.product_id, ing.quantity * item.quantity, `Venta #${newSale.id.slice(0, 8)} (Receta: ${item.recipe_snapshot.name})`);
          }
        }
      }

      const saleWithItems = { ...newSale, items: saleItems };
      set((state) => ({ sales: [saleWithItems, ...state.sales] }));
      return { success: true };
    } catch (error: any) {
      console.error('Error en addSale:', error);
      return { success: false, error: error.message || 'Error al registrar la venta' };
    }
  },

  consumeFromTransit: async (productId: string, qtyNeeded: number, reason?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const product = get().products.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Producto no encontrado' };

    let remaining = qtyNeeded;
    const transitItemsForProduct = get().transitItems
      .filter(t => t.product_id === productId && t.remaining > 0)
      .sort((a, b) => new Date(a.sent_date).getTime() - new Date(b.sent_date).getTime());

    const updatedItems: { id: string; newRemaining: number; newConsumed: number }[] = [];

    try {
      for (const item of transitItemsForProduct) {
        if (remaining <= 0) break;

        const toConsume = Math.min(item.remaining, remaining);
        const newRemaining = item.remaining - toConsume;
        const newConsumed = item.consumed + toConsume;
        remaining -= toConsume;

        const { error } = await withTimeout(
          supabase
            .from('transit_items')
            .update({ remaining: newRemaining, consumed: newConsumed, updated_at: new Date().toISOString() })
            .eq('id', item.id),
          10000
        );

        if (error) {
          throw new Error('No se pudo actualizar el item en tránsito');
        }
        updatedItems.push({ id: item.id, newRemaining, newConsumed });
      }

      if (remaining > 0) {
        return { success: false, error: 'No habia suficiente cantidad en transito' };
      }

      const newTotalInTransit = updatedItems.reduce((sum, u) => sum + u.newRemaining, 0);
      const newQuantity = Number(product.quantity) - qtyNeeded;
      let newMovement = null;

      const { data: movementData, error: movementError } = await withTimeout(
        supabase
          .from('movements')
          .insert({
            user_id: user.id,
            product_id: productId,
            type: 'SALIDA',
            quantity: qtyNeeded,
            unit: product.unit,
            date: new Date().toISOString(),
            cost: Number(product.cost),
            reason: reason || 'Venta de producto/ingrediente',
            status: 'NORMAL'
          })
          .select()
          .single(),
        10000
      );

      newMovement = movementData;

      if (movementError) {
        console.error('Error recording sale movement:', movementError);
        throw new Error('No se pudo registrar el movimiento de venta');
      }

      const { error: productError } = await withTimeout(
        supabase
          .from('products')
          .update({ 
            in_transit: newTotalInTransit,
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId),
        10000
      );

      if (productError) {
        throw new Error('No se pudo actualizar el tránsito del producto');
      }

      set((state) => {
        const updatedTransitItems = state.transitItems
          .map(t => {
            const updated = updatedItems.find(u => u.id === t.id);
            if (updated) {
              return { ...t, remaining: updated.newRemaining, consumed: updated.newConsumed };
            }
            return t;
          })
          .filter(t => t.remaining > 0);

        const movements = newMovement ? [newMovement, ...state.movements] : state.movements;

        return {
          transitItems: updatedTransitItems,
          movements,
          products: state.products.map(p => 
            p.id === productId ? { ...p, in_transit: newTotalInTransit, quantity: newQuantity } : p
          ),
        };
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error en consumeFromTransit:', error);
      return { success: false, error: error.message || 'Error al consumir de tránsito' };
    }
  },

  cancelTransit: async (transitItemId: string, quantity: number, reason: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No autenticado' };

    const transitItem = get().transitItems.find(t => t.id === transitItemId);
    if (!transitItem) return { success: false, error: 'Item no encontrado' };

    if (quantity <= 0) return { success: false, error: 'La cantidad debe ser mayor a 0' };
    if (quantity > transitItem.remaining) {
      return { success: false, error: `La cantidad no puede exceder ${transitItem.remaining}` };
    }

    const product = get().products.find(p => p.id === transitItem.product_id);
    if (!product) return { success: false, error: 'Producto no encontrado' };

    const newRemaining = transitItem.remaining - quantity;
    const newInTransit = Math.max(0, Number(product.in_transit || 0) - quantity);

    const { error: updateError } = await supabase
      .from('transit_items')
      .update({ 
        remaining: newRemaining
      })
      .eq('id', transitItemId);

    if (updateError) {
      return { success: false, error: 'No se pudo actualizar el item en tránsito' };
    }

    const { error: productUpdateError } = await supabase
      .from('products')
      .update({ in_transit: newInTransit })
      .eq('id', product.id);

    if (productUpdateError) {
      await supabase.from('transit_items').update({ remaining: transitItem.remaining, consumed: transitItem.consumed }).eq('id', transitItemId);
      return { success: false, error: 'No se pudo devolver al stock' };
    }

    const { error: movementError } = await supabase
      .from('movements')
      .insert({
        user_id: user.id,
        product_id: product.id,
        type: 'ENTRADA',
        quantity,
        unit: product.unit,
        date: new Date().toISOString(),
        cost: Number(product.cost),
        reason: `Devolución de tránsito: ${reason}`,
        status: 'NORMAL',
      });

    if (movementError) {
      if (import.meta.env.DEV) console.error('Error registering return movement:', movementError);
    }

    set((state) => {
      if (newRemaining <= 0) {
        return {
          transitItems: state.transitItems.filter(t => t.id !== transitItemId),
          products: state.products.map(p =>
            p.id === product.id
              ? { ...p, in_transit: newInTransit }
              : p
          ),
        };
      }
      
      return {
        transitItems: state.transitItems.map(t =>
          t.id === transitItemId
            ? { ...t, remaining: newRemaining }
            : t
        ),
        products: state.products.map(p =>
          p.id === product.id
            ? { ...p, in_transit: newInTransit }
            : p
        ),
      };
    });

    return { success: true };
  },

  registerWasteFromTransit: async (transitItemId: string, quantity: number, reason: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No autenticado' };

    const transitItem = get().transitItems.find(t => t.id === transitItemId);
    if (!transitItem) return { success: false, error: 'Item no encontrado' };

    if (quantity <= 0) return { success: false, error: 'La cantidad debe ser mayor a 0' };
    if (quantity > transitItem.remaining) {
      return { success: false, error: `La cantidad no puede exceder ${transitItem.remaining}` };
    }

    const product = get().products.find(p => p.id === transitItem.product_id);
    if (!product) return { success: false, error: 'Producto no encontrado' };

    const newRemaining = transitItem.remaining - quantity;

    const { error: updateError } = await supabase
      .from('transit_items')
      .update({ remaining: newRemaining })
      .eq('id', transitItemId);

    if (updateError) {
      return { success: false, error: 'No se pudo actualizar el item en tránsito' };
    }

    const newInTransit = Math.max(0, Number(product.in_transit || 0) - quantity);
    const newQuantity = Math.max(0, Number(product.quantity || 0) - quantity);

    const { error: productUpdateError } = await supabase
      .from('products')
      .update({ in_transit: newInTransit, quantity: newQuantity })
      .eq('id', product.id);

    if (productUpdateError) {
      await supabase.from('transit_items').update({ remaining: transitItem.remaining }).eq('id', transitItemId);
      return { success: false, error: 'No se pudo actualizar el tránsito del producto' };
    }

    const { data: movementData, error: movementError } = await supabase
      .from('movements')
      .insert({
        user_id: user.id,
        product_id: product.id,
        type: 'MERMA',
        quantity,
        unit: product.unit,
        date: new Date().toISOString(),
        cost: Number(product.cost),
        reason: `Merma en tránsito: ${reason}`,
        status: 'NORMAL',
      })
      .select()
      .single();

    if (movementError) {
      if (import.meta.env.DEV) console.error('Error registering waste movement:', movementError);
    } else if (movementData) {
      set((state) => ({ movements: [movementData, ...state.movements] }));
    }

    set((state) => {
      const updatedTransitItems = state.transitItems
        .map(t => {
          if (t.id === transitItemId) {
            return { ...t, remaining: newRemaining };
          }
          return t;
        })
        .filter(t => t.remaining > 0);

      const newInTransit = Math.max(0, Number(product.in_transit || 0) - quantity);
      const newQuantity = Math.max(0, Number(product.quantity || 0) - quantity);

      return {
        transitItems: updatedTransitItems,
        products: state.products.map(p =>
          p.id === product.id
            ? { ...p, in_transit: newInTransit, quantity: newQuantity }
            : p
        ),
      };
    });

    return { success: true };
  },

  registerManualConsumption: async (transitItemId: string, quantity: number, note?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No autenticado' };

    const transitItem = get().transitItems.find(t => t.id === transitItemId);
    if (!transitItem) return { success: false, error: 'Item no encontrado' };

    if (quantity <= 0) return { success: false, error: 'La cantidad debe ser mayor a 0' };
    if (quantity > transitItem.remaining) {
      return { success: false, error: `La cantidad no puede exceder ${transitItem.remaining}` };
    }

    const product = get().products.find(p => p.id === transitItem.product_id);
    if (!product) return { success: false, error: 'Producto no encontrado' };

    const newRemaining = transitItem.remaining - quantity;
    const newConsumed = (transitItem.consumed || 0) + quantity;

    const { error: updateError } = await supabase
      .from('transit_items')
      .update({ remaining: newRemaining, consumed: newConsumed })
      .eq('id', transitItemId);

    if (updateError) {
      return { success: false, error: 'No se pudo actualizar el item en tránsito' };
    }

    const newInTransit = Math.max(0, Number(product.in_transit || 0) - quantity);
    const newQuantity = Math.max(0, Number(product.quantity || 0) - quantity);

    const { error: productUpdateError } = await supabase
      .from('products')
      .update({ in_transit: newInTransit, quantity: newQuantity })
      .eq('id', product.id);

    if (productUpdateError) {
      await supabase.from('transit_items').update({ remaining: transitItem.remaining, consumed: transitItem.consumed }).eq('id', transitItemId);
      return { success: false, error: 'No se pudo actualizar el producto' };
    }

    const isGastoVariable = product.is_gasto_variable === true;

    const { data: movementData, error: movementError } = await supabase
      .from('movements')
      .insert({
        user_id: user.id,
        product_id: product.id,
        type: 'SALIDA',
        quantity,
        unit: product.unit,
        date: new Date().toISOString(),
        cost: Number(product.cost),
        reason: isGastoVariable ? 'Gasto variable registrado desde tránsito' : 'Consumo manual desde tránsito',
        note: note || null,
        is_consumo_directo: !isGastoVariable,
        is_gasto_variable: isGastoVariable,
        status: 'NORMAL',
      })
      .select()
      .single();

    if (movementError) {
      if (import.meta.env.DEV) console.error('Error registering consumption movement:', movementError);
    } else if (movementData) {
      set((state) => ({ movements: [movementData, ...state.movements] }));
    }

    set((state) => {
      const updatedTransitItems = state.transitItems
        .map(t => {
          if (t.id === transitItemId) {
            return { ...t, remaining: newRemaining, consumed: newConsumed };
          }
          return t;
        })
        .filter(t => t.remaining > 0);

      return {
        transitItems: updatedTransitItems,
        products: state.products.map(p =>
          p.id === product.id
            ? { ...p, in_transit: newInTransit, quantity: newQuantity }
            : p
        ),
      };
    });

    return { success: true };
  },

  getPendingAccounts: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('pending_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error) {
      set({ pendingAccounts: data || [] });
    }
  },

  createPendingAccount: async (clientName: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('pending_accounts')
          .insert({
            user_id: user.id,
            client_name: clientName,
            items: [],
            total_amount: 0,
            status: 'pending',
            created_at_local: new Date().toISOString(),
          })
          .select()
          .single(),
        10000
      );

      if (error) {
        console.error('Error createPendingAccount:', error);
        throw new Error(error.message || 'Error al crear la cuenta');
      }

      await get().getPendingAccounts();
      return { success: true, accountId: data.id };
    } catch (err: any) {
      console.error('Error en createPendingAccount:', err);
      return { success: false, error: err.message || 'Error al crear la cuenta' };
    }
  },

  addItemsToPendingAccount: async (accountId: string, items: { product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[], isAccountHouse: boolean = false, saleType: 'SALON' | 'DOMICILIO' | 'BAR' | 'VENTA_RAPIDA' = 'SALON') => {
    const account = get().pendingAccounts.find(a => a.id === accountId);
    if (!account) return { success: false, error: 'Cuenta no encontrada' };

    // Guardar el estado de Cuenta Casa para toda la cuenta
    const accountIsAccountHouse = (account as any).is_account_house || isAccountHouse;
    // Usar el tipo de venta proporcionado o el que ya tenga la cuenta
    const accountSaleType = saleType || (account as any).sale_type || 'SALON';

    // Verificar tránsito disponible antes de agregar
    for (const item of items) {
      const product = get().products.find(p => p.id === item.product_id);
      
      const itemIsRecipe = (item as any).is_recipe;
      const itemRecipeSnapshot = (item as any).recipe_snapshot;
      
      if (itemIsRecipe && itemRecipeSnapshot?.ingredients) {
        // Si es receta, verificar cada ingrediente usando recipe_snapshot del item
        for (const ing of itemRecipeSnapshot.ingredients) {
          const transitAvailable = get().transitItems
            .filter(t => t.product_id === ing.product_id)
            .reduce((sum, t) => sum + t.remaining, 0);
          const needed = ing.quantity * item.quantity;
          
          if (transitAvailable < needed) {
            const ingProduct = get().products.find(p => p.id === ing.product_id);
            return { 
              success: false, 
              error: `No hay suficiente "${ingProduct?.name || 'ingrediente'}" en tránsito. Necesitas: ${needed}, Disponible: ${transitAvailable}` 
            };
          }
        }
      } else {
        // Si no es receta, verificar el producto directo
        const transitAvailable = get().transitItems
          .filter(t => t.product_id === item.product_id)
          .reduce((sum, t) => sum + t.remaining, 0);
        
        if (transitAvailable < item.quantity) {
          return { 
            success: false, 
            error: `No hay suficiente "${item.product_name}" en tránsito. Necesitas: ${item.quantity}, Disponible: ${transitAvailable}` 
          };
        }
      }
    }

    const newItems = items.map(item => ({
      ...item,
      added_at: new Date().toISOString(),
    }));

    const allItems = [...(account.items as any[]), ...newItems];
    const newTotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);

    const { error } = await supabase
      .from('pending_accounts')
      .update({
        items: allItems,
        total_amount: accountIsAccountHouse ? 0 : newTotal,
        is_account_house: accountIsAccountHouse,
        sale_type: accountSaleType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    await get().getPendingAccounts();
    return { success: true };
  },

  updatePendingAccount: async (accountId: string, updates: Partial<PendingAccount>) => {
    const { error } = await supabase
      .from('pending_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    await get().getPendingAccounts();
    return { success: true };
  },

  updatePendingAccountItems: async (accountId: string, items: PendingItem[]) => {
    const account = get().pendingAccounts.find(a => a.id === accountId);
    if (!account) return { success: false, error: 'Cuenta no encontrada' };

    const isAccountHouse = (account as any).is_account_house || false;
    const newTotal = isAccountHouse ? 0 : items.reduce((sum, item) => sum + item.subtotal, 0);

    const { error } = await supabase
      .from('pending_accounts')
      .update({
        items: items,
        total_amount: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    await get().getPendingAccounts();
    return { success: true };
  },

  togglePendingAccountType: async (accountId: string) => {
    const account = get().pendingAccounts.find(a => a.id === accountId);
    if (!account) return { success: false, error: 'Cuenta no encontrada' };
    
    const currentIsAccountHouse = (account as any).is_account_house || false;
    const newIsAccountHouse = !currentIsAccountHouse;
    
    const accountItems = (account.items as any[]) || [];
    const newTotal = newIsAccountHouse ? 0 : accountItems.reduce((sum, item) => sum + item.subtotal, 0);

    const { error } = await supabase
      .from('pending_accounts')
      .update({ 
        is_account_house: newIsAccountHouse,
        total_amount: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (error) return { success: false, error: error.message };
    
    await get().getPendingAccounts();
    return { success: true };
  },

deletePendingAccount: async (accountId: string) => {
    const account = get().pendingAccounts.find(a => a.id === accountId);
    if (!account) return { success: false, error: 'Cuenta no encontrada' };

    const accountItems = account.items as any[] || [];

    for (const item of accountItems) {
      const product = get().products.find(p => p.id === item.product_id);
      
      if (product?.is_recipe && product.recipe_ingredients) {
        for (const ing of product.recipe_ingredients) {
          const qtyToReturn = ing.quantity * item.quantity;
          const transitItem = get().transitItems.find(t => t.product_id === ing.product_id);
          if (transitItem) {
            await supabase
              .from('transit_items')
              .update({ remaining: transitItem.remaining + qtyToReturn })
              .eq('id', transitItem.id);
          }
        }
      } else {
        const qtyToReturn = item.quantity;
        const transitItem = get().transitItems.find(t => t.product_id === item.product_id);
        if (transitItem) {
          await supabase
            .from('transit_items')
            .update({ remaining: transitItem.remaining + qtyToReturn })
            .eq('id', transitItem.id);
        }
      }
    }

    const { error } = await supabase
      .from('pending_accounts')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    await get().getPendingAccounts();
    const { data: transitData } = await supabase.from('transit_items').select('*').eq('user_id', useAuthStore.getState().user?.id);
    if (transitData) {
      set({ transitItems: transitData.filter(t => t.remaining > 0) });
    }
    return { success: true };
  },

  chargePendingAccount: async (accountId: string, employeeId: string, employeeName: string, saleDate?: string, paymentMethod?: string, efectivo?: number, transferencia?: number, usd?: number, eur?: number) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const account = get().pendingAccounts.find(a => a.id === accountId);
    if (!account) return { success: false, error: 'Cuenta no encontrada' };
    if (!account.items || (account.items as any[]).length === 0) {
      return { success: false, error: 'La cuenta no tiene productos' };
    }

    const date = saleDate || new Date().toISOString().split('T')[0];
    
    // Verificar si el día está cerrado
    const isClosed = get().dailyClosings.some(c => {
      const d = new Date(c.closing_date).toISOString().split('T')[0];
      return d === date;
    });
    
    if (isClosed) {
      return { success: false, error: 'El día está cerrado, no se puede cobrar' };
    }
    
    const saleItems = (account.items as any[]).map(item => {
      // Usar la información guardada directamente en el item
      const itemIsRecipe = item.is_recipe || false;
      const itemRecipeSnapshot = item.recipe_snapshot || null;
      
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: 0,
        selling_price: item.unit_price,
        subtotal: item.subtotal,
        is_recipe: itemIsRecipe,
        recipe_snapshot: itemRecipeSnapshot,
      };
    });

    const isAccountHouse = (account as any).is_account_house || false;
    
    const saleType = (account as any).sale_type || 'SALON';
    
    const result = await get().addSale({
      employee_id: employeeId,
      items: saleItems,
      total_amount: isAccountHouse ? 0 : account.total_amount,
      date: date,
      sale_type: saleType,
      is_account_house: isAccountHouse,
      notes: `Cobro de cuenta pendiente: ${account.client_name}`,
      discount: 0,
      payment_method: paymentMethod || 'Cobro de cuenta pendiente',
      efectivo: efectivo || 0,
      transferencia: transferencia || 0,
      usd: usd || 0,
      eur: eur || 0,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

const { error } = await supabase
      .from('pending_accounts')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', accountId);

    if (error) {
      return { success: false, error: error.message };
    }

    try {
      await get().getPendingAccounts();
    } catch (err) {
      console.warn('[chargePendingAccount] Error recargando cuentas pendientes:', err);
    }
    return { success: true };
  },

  hashPin: async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'inventarioy_pin_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  saveAccessPin: async (role: string, pin: string, name: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    if (!name || name.trim() === '') return { success: false, error: 'El nombre es obligatorio' };

    const pinHash = await get().hashPin(pin);

    if (role === 'owner') {
      const existingPin = get().accessPins.find(p => p.role === 'owner');
      
      if (existingPin) {
        const { error } = await supabase
          .from('access_pins')
          .update({ pin_hash: pinHash, pin_name: name.trim(), is_active: true, failed_attempts: 0, blocked_until: null })
          .eq('id', existingPin.id);

        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase
          .from('access_pins')
          .insert({ user_id: user.id, role, pin_hash: pinHash, pin_name: name.trim() });

        if (error) return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('access_pins')
        .insert({ user_id: user.id, role, pin_hash: pinHash, pin_name: name.trim() });

      if (error) return { success: false, error: error.message };
    }

    const { data } = await supabase.from('access_pins').select('*').eq('user_id', user.id);
    set({ accessPins: data || [] });
    return { success: true };
  },

  toggleAccessPin: async (pinId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('access_pins')
      .update({ is_active: isActive })
      .eq('id', pinId);

    if (error) return { success: false, error: error.message };

    const user = useAuthStore.getState().user;
    if (user) {
      const { data } = await supabase.from('access_pins').select('*').eq('user_id', user.id);
      set({ accessPins: data || [] });
    }
    return { success: true };
  },

  deleteAccessPin: async (pinId: string) => {
    const { error } = await supabase
      .from('access_pins')
      .delete()
      .eq('id', pinId);

    if (error) return { success: false, error: error.message };

    const user = useAuthStore.getState().user;
    if (user) {
      const { data } = await supabase.from('access_pins').select('*').eq('user_id', user.id);
      set({ accessPins: data || [] });
    }
    return { success: true };
  },

  verifyPinForModule: async (modulePath: string, pin: string): Promise<{ success: boolean; error?: string; blocked?: boolean; remainingTime?: number }> => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const requiredRoles = MODULE_ROLES[modulePath] || [];
    if (requiredRoles.length === 0) return { success: true };

    const anyPin = get().accessPins.find(p => p.is_active);
    if (!anyPin) return { success: false, error: 'No hay pines activos configurados' };

    const pinHash = await get().hashPin(pin);
    const matchingPins = get().accessPins.filter(p => p.is_active && requiredRoles.includes(p.role));
    const userPin = matchingPins.find(p => p.pin_hash === pinHash);
    
    if (!userPin) {
      const existingPin = matchingPins[0];
      if (!existingPin) return { success: false, error: 'Tu PIN no tiene acceso a este módulo' };
      
      const newAttempts = existingPin.failed_attempts + 1;
      if (newAttempts >= 3) {
        const blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        await supabase.from('access_pins').update({ failed_attempts: newAttempts, blocked_until: blockedUntil.toISOString() }).eq('id', existingPin.id);
        return { success: false, error: 'PIN bloqueado por 3 intentos fallidos', blocked: true, remainingTime: 300 };
      } else {
        await supabase.from('access_pins').update({ failed_attempts: newAttempts }).eq('id', existingPin.id);
      }
      return { success: false, error: `PIN incorrecto. Intentos: ${newAttempts}/3` };
    }

    if (userPin.blocked_until) {
      const blockedUntil = new Date(userPin.blocked_until);
      const now = new Date();
      if (blockedUntil > now) {
        const remaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
        return { success: false, error: 'PIN bloqueado', blocked: true, remainingTime: remaining };
      } else {
        await supabase.from('access_pins').update({ blocked_until: null, failed_attempts: 0 }).eq('id', userPin.id);
      }
    }

    if (userPin.failed_attempts > 0) {
      await supabase.from('access_pins').update({ failed_attempts: 0, blocked_until: null }).eq('id', userPin.id);
    }

    set({ verifiedRole: userPin.role, verifiedRoleName: userPin.pin_name });
    localStorage.setItem('verifiedRole', userPin.role);
    localStorage.setItem('verifiedRoleName', userPin.pin_name || '');
    return { success: true, verifiedRole: userPin.role };
  },

  verifyPinSimple: async (pin: string): Promise<{ success: boolean; error?: string; blocked?: boolean; remainingTime?: number; role?: string }> => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const pinHash = await get().hashPin(pin);
    const userPin = get().accessPins.find(p => p.is_active && p.pin_hash === pinHash);
    
    if (!userPin) {
      const anyPin = get().accessPins.find(p => p.is_active);
      if (!anyPin) return { success: false, error: 'No hay pines activos configurados' };
      
      const newAttempts = anyPin.failed_attempts + 1;
      if (newAttempts >= 3) {
        const blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        await supabase.from('access_pins').update({ failed_attempts: newAttempts, blocked_until: blockedUntil.toISOString() }).eq('id', anyPin.id);
        return { success: false, error: 'PIN bloqueado por 3 intentos fallidos', blocked: true, remainingTime: 300 };
      } else {
        await supabase.from('access_pins').update({ failed_attempts: newAttempts }).eq('id', anyPin.id);
      }
      return { success: false, error: `PIN incorrecto. Intentos: ${newAttempts}/3` };
    }

    if (userPin.blocked_until) {
      const blockedUntil = new Date(userPin.blocked_until);
      const now = new Date();
      if (blockedUntil > now) {
        const remaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
        return { success: false, error: 'PIN bloqueado', blocked: true, remainingTime: remaining };
      } else {
        await supabase.from('access_pins').update({ blocked_until: null, failed_attempts: 0 }).eq('id', userPin.id);
      }
    }

    if (userPin.failed_attempts > 0) {
      await supabase.from('access_pins').update({ failed_attempts: 0, blocked_until: null }).eq('id', userPin.id);
    }

    set({ verifiedRole: userPin.role, verifiedRoleName: userPin.pin_name });
    localStorage.setItem('verifiedRole', userPin.role);
    localStorage.setItem('verifiedRoleName', userPin.pin_name || '');
    return { success: true, role: userPin.role };
  },

  logAction: async (module: string, action: string, details: Record<string, any> = {}) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const verifiedRole = get().verifiedRole;
    const verifiedRoleName = get().verifiedRoleName;
    const activePin = get().accessPins.find(p => p.is_active);
    const role = verifiedRole || activePin?.role || user.role || 'owner';
    const roleLabel = verifiedRole ? `${ROLE_LABELS[verifiedRole]}${verifiedRoleName ? `: ${verifiedRoleName}` : ''}` : (activePin ? `${ROLE_LABELS[activePin.role]}${activePin.pin_name ? `: ${activePin.pin_name}` : ''}` : (user.name || 'Dueño/a'));
    
    await supabase.from('action_logs').insert({
      user_id: user.id,
      role: role,
      pin_role_label: roleLabel,
      module,
      action,
      details,
      created_at: new Date().toISOString(),
    });
  },

  getActionLogs: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Si está offline, no intentar cargar desde Supabase para evitar crash
    // Mantener los datos existentes en memoria
    if (!navigator.onLine) {
      console.log('[getActionLogs] Offline: manteniendo datos existentes');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('action_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ actionLogs: data as any[] });
      }
    } catch (err) {
      console.warn('[getActionLogs] Error cargando logs:', err);
    }
  },

  addRecipe: async (recipe) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No hay usuario autenticado');

    try {
      const { data: newRecipe, error } = await withTimeout(
        supabase
          .from('recipes')
          .insert({ 
            user_id: user.id, 
            name: capitalize(recipe.name), 
            selling_price: recipe.selling_price 
          })
          .select()
          .single(),
        10000
      );

      if (error) {
        throw new Error('No se pudo crear la receta');
      }

      if (recipe.ingredients.length > 0) {
        const ingredients = recipe.ingredients.map(ing => ({
          recipe_id: newRecipe.id,
          product_id: ing.product_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));

        await withTimeout(
          supabase.from('recipe_ingredients').insert(ingredients),
          10000
        );
      }

      set((state) => ({ 
        recipes: [{ ...newRecipe, ingredients: recipe.ingredients }, ...state.recipes] 
      }));
    } catch (error: any) {
      console.error('Error en addRecipe:', error);
      throw new Error(error.message || 'Error al crear la receta');
    }
  },

  updateRecipe: async (id, updates) => {
    const { error } = await withTimeout(
      supabase
        .from('recipes')
        .update({ 
          name: updates.name ? capitalize(updates.name) : undefined, 
          selling_price: updates.selling_price 
        })
        .eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo actualizar la receta');
    }

    if (updates.ingredients) {
      await withTimeout(
        supabase.from('recipe_ingredients').delete().eq('recipe_id', id),
        10000
      );
      
      if (updates.ingredients.length > 0) {
        const ingredients = updates.ingredients.map(ing => ({
          recipe_id: id,
          product_id: ing.product_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
        await withTimeout(
          supabase.from('recipe_ingredients').insert(ingredients),
          10000
        );
      }
    }

    set((state) => ({
      recipes: state.recipes.map(r => r.id === id ? { ...r, ...updates } : r),
    }));
  },

  deleteRecipe: async (id) => {
    await withTimeout(
      supabase.from('recipe_ingredients').delete().eq('recipe_id', id),
      10000
    );
    const { error } = await withTimeout(
      supabase.from('recipes').delete().eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo eliminar la receta');
    }

    set((state) => ({ recipes: state.recipes.filter(r => r.id !== id) }));
  },

  addEmployee: async (employee) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No hay usuario autenticado');

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('employees')
          .insert({ ...employee, name: capitalize(employee.name), user_id: user.id })
          .select()
          .single(),
        10000
      );

      if (error) {
        console.error('Error addEmployee:', error);
        throw new Error(error.message || 'No se pudo agregar el empleado');
      }

      set((state) => ({ employees: [data, ...state.employees] }));
    } catch (error: any) {
      console.error('Error en addEmployee:', error);
      throw new Error(error.message || 'Error al agregar empleado');
    }
  },

  updateEmployee: async (id, updates) => {
    const capitalizedUpdates = {
      ...updates,
      ...(updates.name !== undefined && { name: capitalize(updates.name) }),
    };
    const { error } = await withTimeout(
      supabase.from('employees').update(capitalizedUpdates).eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo actualizar el empleado');
    }

    set((state) => ({
      employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  },

  deleteEmployee: async (id) => {
    const { error } = await withTimeout(
      supabase.from('employees').delete().eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo eliminar el empleado');
    }

    set((state) => ({ employees: state.employees.filter(e => e.id !== id) }));
  },

  addDepartment: async (name) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No hay usuario autenticado');

    const { data, error } = await supabase
      .from('departments')
      .insert({ name: capitalize(name), user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error addDepartment:', error);
      throw new Error(error.message || 'No se pudo agregar el departamento');
    }

    set((state) => ({ departments: [data, ...state.departments] }));
  },

  updateDepartment: async (id, name) => {
    const { error } = await supabase.from('departments').update({ name: capitalize(name) }).eq('id', id);

    if (error) {
      throw new Error('No se pudo actualizar el departamento');
    }

    set((state) => ({
      departments: state.departments.map(d => d.id === id ? { ...d, name: capitalize(name) } : d),
    }));
  },

  deleteDepartment: async (id) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);

    if (error) {
      throw new Error('No se pudo eliminar el departamento');
    }

    set((state) => ({ departments: state.departments.filter(d => d.id !== id) }));
  },

  getPayrollConfig: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('payroll_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching payroll config:', error);
      return;
    }

    if (data) {
      set({ payrollConfig: data });
    } else {
      const defaultConfig = {
        tax_exemption_base: 3260,
        tax_rate: 5,
        special_contribution_rate: 3,
      };

      const { data: newData, error: insertError } = await supabase
        .from('payroll_config')
        .insert({ ...defaultConfig, user_id: user.id })
        .select()
        .single();

      if (!insertError && newData) {
        set({ payrollConfig: newData });
      }
    }
  },

  updatePayrollConfig: async (updates) => {
    const user = useAuthStore.getState().user;
    const config = get().payrollConfig;
    if (!user || !config) return;

    const { error } = await supabase
      .from('payroll_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', config.id);

    if (error) {
      throw new Error('No se pudo actualizar la configuración de nómina');
    }

    set((state) => ({ payrollConfig: state.payrollConfig ? { ...state.payrollConfig, ...updates } : null }));
  },

  calculatePayroll: async (month, year) => {
    const user = useAuthStore.getState().user;
    const config = get().payrollConfig;
    if (!user || !config) {
      await get().getPayrollConfig();
    }

    const currentConfig = get().payrollConfig;
    if (!currentConfig) return;

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const { data: existingEntries } = await supabase
      .from('payroll_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year);

    if (existingEntries && existingEntries.length > 0) {
      await supabase.from('payroll_entries').delete().eq('user_id', user.id).eq('month', month).eq('year', year);
    }

    const employees = get().employees;
    const departments = get().departments;

    const entriesToInsert = employees.map(emp => {
      const earned_salary = emp.salary;
      const exemption_base = currentConfig.tax_exemption_base;
      const taxable_base = Math.max(0, earned_salary - exemption_base);
      const tax_amount = taxable_base * (currentConfig.tax_rate / 100);
      const special_contribution = earned_salary * (currentConfig.special_contribution_rate / 100);
      const net_salary = earned_salary - tax_amount - special_contribution;

      const empDept = departments.find(d => d.id === emp.category);

      return {
        user_id: user.id,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_category: empDept?.name || 'Sin Departamento',
        month,
        year,
        base_salary: emp.salary,
        earned_salary,
        exemption_base,
        taxable_base,
        tax_amount: Math.round(tax_amount * 100) / 100,
        special_contribution: Math.round(special_contribution * 100) / 100,
        net_salary: Math.round(net_salary * 100) / 100,
        vacation_days: 0,
        is_custom: false,
      };
    });

    if (entriesToInsert.length > 0) {
      const { data, error } = await supabase.from('payroll_entries').insert(entriesToInsert).select();
      if (error) {
        throw new Error('No se pudo generar la nómina');
      }

      set((state) => ({
        payrollEntries: data || [],
        payrollConfig: state.payrollConfig ? { ...state.payrollConfig, last_calculated_month: monthStr } : null,
      }));

      await supabase.from('payroll_config').update({ last_calculated_month: monthStr }).eq('user_id', user.id);
    }

    await get().logAction('payroll', 'GENERAR_NOMINA', {
      month,
      year,
      total_employees: employees.length,
      total_net: entriesToInsert.reduce((sum, e) => sum + e.net_salary, 0),
    });
  },

  getPayrollEntries: async (month, year) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('employee_category', { ascending: true })
      .order('employee_name', { ascending: true });

    if (error) {
      console.error('Error fetching payroll entries:', error);
      return;
    }

    set({ payrollEntries: data || [] });
  },

  getEmployeesPaginated: async (page, search, departmentId, sortBy = 'name', sortOrder = 'asc') => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('employees')
      .select('id, name, role, salary, phone, email, nit_id, category, created_at', { count: 'exact' })
      .eq('user_id', user.id);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (departmentId) {
      query = query.eq('category', departmentId);
    }

    const sortField = sortBy === 'salary' ? 'salary' : 'name';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching employees paginated:', error);
      return;
    }

    set({ 
      employees: data || [], 
      employeesPage: page,
      employeesTotal: count || 0 
    });
  },

  getEmployeesCount: async (search, departmentId) => {
    const user = useAuthStore.getState().user;
    if (!user) return 0;

    // Si está offline, retornar 0 para evitar crash
    if (!navigator.onLine) {
      console.log('[getEmployeesCount] Offline: returning 0');
      return 0;
    }

    try {
      let query = supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (departmentId) {
        query = query.eq('category', departmentId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error counting employees:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.warn('[getEmployeesCount] Error:', err);
      return 0;
    }
  },

  getDepartmentsPaginated: async (page, search) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('departments')
      .select('id, name, created_at', { count: 'exact' })
      .eq('user_id', user.id);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching departments paginated:', error);
      return;
    }

    set({ 
      departments: data || [], 
      departmentsPage: page,
      departmentsTotal: count || 0 
    });
  },

  getDepartmentsCount: async (search) => {
    const user = useAuthStore.getState().user;
    if (!user) return 0;

    // Si está offline, retornar 0 para evitar crash
    if (!navigator.onLine) {
      console.log('[getDepartmentsCount] Offline: returning 0');
      return 0;
    }

    try {
      let query = supabase
        .from('departments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error counting departments:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.warn('[getDepartmentsCount] Error:', err);
      return 0;
    }
  },

  getPayrollEntriesPaginated: async (page, month, year) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabase
      .from('payroll_entries')
      .select('id, employee_id, employee_name, employee_category, month, year, base_salary, earned_salary, exemption_base, taxable_base, tax_amount, special_contribution, net_salary, is_custom, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('employee_category', { ascending: true })
      .order('employee_name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching payroll entries paginated:', error);
      return;
    }

    set({ 
      payrollEntries: data || [], 
      payrollPage: page,
      payrollMonthFilter: month,
      payrollYearFilter: year,
      payrollTotal: count || 0 
    });
  },

  getPayrollEntriesCount: async (month, year) => {
    const user = useAuthStore.getState().user;
    if (!user) return 0;

    // Si está offline, retornar 0 para evitar crash
    if (!navigator.onLine) {
      console.log('[getPayrollEntriesCount] Offline: returning 0');
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('payroll_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year);

      if (error) {
        console.error('Error counting payroll entries:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.warn('[getPayrollEntriesCount] Error:', err);
      return 0;
    }
  },

  updatePayrollEntry: async (id, updates) => {
    const currentEntry = get().payrollEntries.find(e => e.id === id);
    if (!currentEntry) return;

    const config = get().payrollConfig;
    if (!config) return;

    let finalUpdates = { ...updates };

    if (updates.earned_salary !== undefined) {
      const earned_salary = updates.earned_salary;
      const exemption_base = config.tax_exemption_base;
      const taxable_base = Math.max(0, earned_salary - exemption_base);
      const tax_amount = Math.round(taxable_base * (config.tax_rate / 100) * 100) / 100;
      const special_contribution = Math.round(earned_salary * (config.special_contribution_rate / 100) * 100) / 100;
      const net_salary = Math.round((earned_salary - tax_amount - special_contribution) * 100) / 100;

      finalUpdates = {
        ...updates,
        earned_salary,
        exemption_base,
        taxable_base,
        tax_amount,
        special_contribution,
        net_salary,
      };
    }

    const { error } = await supabase
      .from('payroll_entries')
      .update({ ...finalUpdates, updated_at: new Date().toISOString(), is_custom: true })
      .eq('id', id);

    if (error) {
      throw new Error('No se pudo actualizar el registro de nómina');
    }

    set((state) => ({
      payrollEntries: state.payrollEntries.map(e => e.id === id ? { ...e, ...finalUpdates, is_custom: true } : e),
    }));

    const entry = get().payrollEntries.find(e => e.id === id);
    if (entry) {
      await get().logAction('payroll', 'ACTUALIZAR_NOMINA', {
        employee_name: entry.employee_name,
        field: Object.keys(updates)[0],
        old_value: Object.values(updates)[0],
      });
    }
  },

  regeneratePayrollEntry: async (id) => {
    const entry = get().payrollEntries.find(e => e.id === id);
    if (!entry) return;

    const config = get().payrollConfig;
    if (!config) return;

    const employee = get().employees.find(e => e.id === entry.employee_id);
    if (!employee) return;

    const earned_salary = employee.salary;
    const exemption_base = config.tax_exemption_base;
    const taxable_base = Math.max(0, earned_salary - exemption_base);
    const tax_amount = taxable_base * (config.tax_rate / 100);
    const special_contribution = earned_salary * (config.special_contribution_rate / 100);
    const net_salary = earned_salary - tax_amount - special_contribution;

    await get().updatePayrollEntry(id, {
      base_salary: employee.salary,
      earned_salary,
      exemption_base,
      taxable_base,
      tax_amount: Math.round(tax_amount * 100) / 100,
      special_contribution: Math.round(special_contribution * 100) / 100,
      net_salary: Math.round(net_salary * 100) / 100,
      is_custom: false,
    });
  },

  addCategory: async (name) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('No hay usuario autenticado');

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('categories')
          .insert({ user_id: user.id, name: capitalize(name) })
          .select()
          .single(),
        10000
      );

      if (error) {
        throw new Error('No se pudo agregar la categoría');
      }

      set((state) => ({ categories: [data, ...state.categories] }));
    } catch (error: any) {
      console.error('Error en addCategory:', error);
      throw new Error(error.message || 'Error al agregar categoría');
    }
  },

  deleteCategory: async (id) => {
    const { error } = await withTimeout(
      supabase.from('categories').delete().eq('id', id),
      10000
    );

    if (error) {
      throw new Error('No se pudo eliminar la categoría');
    }

    set((state) => ({ categories: state.categories.filter(c => c.id !== id) }));
  },

  getDailyClosings: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('user_id', user.id)
      .order('closing_date', { ascending: false });

    if (error) {
      throw new Error('No se pudieron cargar los cierres de caja');
    }

    set({ dailyClosings: data || [] });
  },

  createDailyClosing: async (closing) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No autenticado' };

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('daily_closings')
          .insert({ ...closing, user_id: user.id })
          .select()
          .single(),
        10000
      );

      if (error) {
        console.error('Error createDailyClosing:', error);
        if (error.code === '23505') {
          return { success: false, error: 'Ya existe un cierre para esta fecha' };
        }
        throw new Error(error.message || 'No se pudo registrar el cierre de caja');
      }

      set((state) => ({ dailyClosings: [data, ...state.dailyClosings] }));
      return { success: true };
    } catch (error: any) {
      console.error('Error en createDailyClosing:', error);
      return { success: false, error: error.message || 'Error al registrar cierre de caja' };
    }
  },

  recalculateStock: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data: movements } = await supabase
      .from('movements')
      .select('*')
      .eq('user_id', user.id);

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id);

    if (!movements || !products) return;

    for (const product of products) {
      let calculatedQty = 0;
      movements
        .filter(m => m.product_id === product.id)
        .forEach(m => {
          if (m.type === 'ENTRADA') {
            calculatedQty += Number(m.quantity);
          } else {
            calculatedQty -= Number(m.quantity);
          }
        });

      await supabase
        .from('products')
        .update({ quantity: Math.max(0, calculatedQty), updated_at: new Date().toISOString() })
        .eq('id', product.id);
    }

    await get().fetchAll();
  },

  uploadHRDocument: async (file: File, docType: 'MANUAL' | 'REGLAMENTO' | 'PNO') => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No autenticado' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${docType}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `hr-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('hr-documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      return { success: false, error: 'Error al subir el archivo: ' + uploadError.message };
    }

    const { data: urlData } = supabase.storage.from('hr-documents').getPublicUrl(filePath);

    const docName = file.name.replace(`.${fileExt}`, '').replace(/_/g, ' ').replace(/[.-]/g, ' ');

    const { error: dbError } = await supabase
      .from('hr_documents')
      .insert({
        user_id: user.id,
        name: docName,
        doc_type: docType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      });

    if (dbError) {
      await supabase.storage.from('hr-documents').remove([filePath]);
      return { success: false, error: 'Error al guardar el registro: ' + dbError.message };
    }

    await get().fetchHRDocuments();
    return { success: true };
  },

  fetchHRDocuments: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('hr_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('No se pudieron cargar los documentos');
    }

    set({ hrDocuments: data || [] });
  },

  deleteHRDocument: async (id: string, fileUrl: string) => {
    const { error: dbError } = await supabase
      .from('hr_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      throw new Error('No se pudo eliminar el registro');
    }

    const filePath = fileUrl.split('/hr-documents/')[1];
    if (filePath) {
      await supabase.storage.from('hr-documents').remove([`${filePath}`]);
    }

    set((state) => ({
      hrDocuments: state.hrDocuments.filter((d) => d.id !== id),
    }));
  },

  uploadEmployeeDocument: async (file: File, employeeId: string, docType: 'CONTRATO' | 'IDENTIFICACION' | 'OTRO', name?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No autenticado' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/employees/${employeeId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `hr-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('hr-documents')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      return { success: false, error: 'Error al subir el archivo: ' + uploadError.message };
    }

    const { data: urlData } = supabase.storage.from('hr-documents').getPublicUrl(filePath);

    const docName = name || file.name.replace(`.${fileExt}`, '').replace(/_/g, ' ').replace(/[.-]/g, ' ');

    const { error: dbError } = await supabase
      .from('employee_documents')
      .insert({
        user_id: user.id,
        employee_id: employeeId,
        name: docName,
        doc_type: docType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      });

    if (dbError) {
      await supabase.storage.from('hr-documents').remove([filePath]);
      return { success: false, error: 'Error al guardar el registro: ' + dbError.message };
    }

    await get().fetchEmployeeDocuments(employeeId);
    return { success: true };
  },

  fetchEmployeeDocuments: async (employeeId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('No se pudieron cargar los documentos');
    }

    set({ employeeDocuments: data || [] });
  },

  deleteEmployeeDocument: async (id: string, fileUrl: string) => {
    const { error: dbError } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      throw new Error('No se pudo eliminar el registro');
    }

    const filePath = fileUrl.split('/hr-documents/')[1];
    if (filePath) {
      await supabase.storage.from('hr-documents').remove([`${filePath}`]);
    }

    set((state) => ({
      employeeDocuments: state.employeeDocuments.filter((d) => d.id !== id),
    }));
  },

  syncPendingData: async () => {
    console.log('[syncPendingData] Offline sync disabled - using Supabase only');
  },

forceRefreshData: async () => {
    console.log('[forceRefreshData] Refreshing data from Supabase...');
    const { fetchAll } = useDatabaseStore.getState();
    await fetchAll();
  },
}));
