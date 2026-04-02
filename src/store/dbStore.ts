import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { toast } from 'sonner';
import {
  initOfflineDB,
  savePendingSale,
  savePendingMovement,
  savePendingClosing,
  getAllPendingSales,
  getAllPendingMovements,
  getAllPendingClosings,
  markSaleAsSynced,
  markMovementAsSynced,
  markClosingAsSynced,
  incrementRetryCount,
  deletePendingItem,
  cacheProducts,
  getCachedProducts,
  STORES,
} from '../lib/offlineDB';

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
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  user_id: string;
  product_id: string;
  type: 'ENTRADA' | 'SALIDA' | 'MERMA';
  quantity: number;
  unit: string;
  date: string;
  cost: number;
  reason?: string;
  status?: string;
  justification?: string;
  justification_date?: string;
  created_at: string;
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
  sale_type: 'SALON' | 'DOMICILIO';
  notes?: string;
  discount: number;
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

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  role: string;
  salary: number;
  phone?: string;
  email?: string;
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
  created_at: string;
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

const capitalize = (str: string) =>
  str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

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
  isLoading: boolean;

  fetchAll: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addMovement: (movement: Omit<Movement, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  justifyMovement: (id: string, justification: string) => Promise<void>;
  
  consumeFromTransit: (productId: string, quantity: number, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cancelTransit: (transitItemId: string, quantity: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  
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
  fetchEmployeeDocuments: (employeeId: string) => Promise<void>;
  deleteEmployeeDocument: (id: string, fileUrl: string) => Promise<void>;

  syncPendingData: () => Promise<void>;
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
  isLoading: true,

  fetchAll: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ products: [], movements: [], sales: [], recipes: [], employees: [], categories: [], transitItems: [], dailyClosings: [], hrDocuments: [], employeeDocuments: [], isLoading: false });
      return;
    }

    set({ isLoading: true });

    const [productsRes, movementsRes, salesRes, recipesRes, employeesRes, categoriesRes, transitRes, dailyClosingsRes, hrDocsRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('movements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sales').select('*, sale_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('recipes').select('*, recipe_ingredients(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('transit_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('daily_closings').select('*').eq('user_id', user.id).order('closing_date', { ascending: false }),
      supabase.from('hr_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
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
      isLoading: false,
    });
  },

  addProduct: async (product) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const normalizeString = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const isDuplicate = get().products.some(
      p => normalizeString(p.name) === normalizeString(product.name) && p.is_active !== false
    );

    if (isDuplicate) {
      throw new Error(`¡Ups! El producto "${product.name}" ya existe. Intenta con otro nombre.`);
    }

    const productData = {
      ...product,
      name: capitalize(product.name),
      category: capitalize(product.category),
      user_id: user.id,
      expiration_date: product.expiration_date || null,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      if (import.meta.env.DEV) console.error('Error adding product:', error);
      throw new Error('Este producto ya existe');
    }

    // Crear movimiento inicial si hay cantidad > 0
    if (Number(product.quantity) > 0) {
      const { error: movementError } = await supabase
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
        });

      if (movementError && import.meta.env.DEV) {
        console.error('Error creating initial movement:', movementError);
      }
    }

    set((state) => ({ products: [data, ...state.products] }));
    await get().fetchAll(); // Refrescar todo para asegurar consistencia
  },

  updateProduct: async (id, updates) => {
    const capitalizedUpdates = {
      ...updates,
      ...(updates.name !== undefined && { name: capitalize(updates.name) }),
      ...(updates.category !== undefined && { category: capitalize(updates.category) }),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('products')
      .update(capitalizedUpdates)
      .eq('id', id);

    if (error) {
      throw new Error('No se pudo actualizar el producto');
    }

    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p),
    }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error('No se pudo eliminar el producto');
    }

    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, is_active: false } : p),
    }));
  },

  addMovement: async (movement) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const isOnline = navigator.onLine;
    
    // Usar la fecha tal cual viene del frontend (ya en formato local)
    const movementDate = movement.date || new Date().toISOString();

    // Si está offline, guardar en IndexedDB
    if (!isOnline) {
      try {
        await initOfflineDB();
        await savePendingMovement({ data: { ...movement, user_id: user.id, date: movementDate } });
        
        // Actualizar stock localmente para que el usuario vea el cambio inmediatamente
        const product = get().products.find(p => p.id === movement.product_id);
        if (product && movement.type === 'ENTRADA') {
          let newQuantity = Number(product.quantity) + Number(movement.quantity);
          set((state) => ({
            products: state.products.map(p => 
              p.id === movement.product_id 
                ? { ...p, quantity: newQuantity, updated_at: new Date().toISOString() } 
                : p
            ),
          }));
        }
        
        toast.success('Movimiento guardado. Se sincronizará cuando haya conexión.');
      } catch (err) {
        console.error('Error saving movement offline:', err);
        throw new Error('No se pudo guardar el movimiento offline');
      }
      return;
    }

    // Si está online, proceder normalmente
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: newMovement, error: movementError } = await supabase
      .from('movements')
      .insert({ ...movement, user_id: user.id, date: movementDate })
      .select()
      .single();

    if (movementError) {
      throw new Error('No se pudo registrar el movimiento');
    }

    const product = get().products.find(p => p.id === movement.product_id);
    if (!product) return;

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
      // SALIDA (Tránsito): El stock TOTAL no cambia (el producto sigue en el local).
      // Solo aumenta el contador de tránsito para que el "Disponible" baje.
      newInTransit = newInTransit + Number(movement.quantity);
      
      await get().updateProduct(movement.product_id, { in_transit: newInTransit });
      
      const { data: newTransitItem, error: transitError } = await supabase
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
        .single();

      if (!transitError && newTransitItem) {
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
    }

    set((state) => ({ movements: [newMovement, ...state.movements] }));
  },

  justifyMovement: async (id, justification) => {
    const { error } = await supabase
      .from('movements')
      .update({ 
        status: 'JUSTIFICADO', 
        justification, 
        justification_date: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      throw new Error('No se pudo justificar el movimiento');
    }

    set((state) => ({
      movements: state.movements.map(m =>
        m.id === id ? { ...m, status: 'JUSTIFICADO', justification, justification_date: new Date().toISOString() } : m
      ),
    }));
  },

  addSale: async (sale) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const isOnline = navigator.onLine;

    const itemsToConsume: { productId: string; name: string; qtyNeeded: number; qtyAvailable: number }[] = [];

    for (const item of sale.items) {
      if (!item.is_recipe) {
        const transitAvailable = get().transitItems
          .filter(t => t.product_id === item.product_id)
          .reduce((sum, t) => sum + t.remaining, 0);
        
        const productName = get().products.find(p => p.id === item.product_id)?.name || 'producto';
        
        if (transitAvailable < item.quantity) {
          return { 
            success: false, 
            error: `No hay suficiente "${productName}" en transito. Necesitas: ${item.quantity}, Disponible: ${transitAvailable}` 
          };
        }
        itemsToConsume.push({ productId: item.product_id, name: productName, qtyNeeded: item.quantity, qtyAvailable: transitAvailable });
      } else if (item.is_recipe && item.recipe_snapshot) {
        for (const ing of item.recipe_snapshot.ingredients) {
          const transitAvailable = get().transitItems
            .filter(t => t.product_id === ing.product_id)
            .reduce((sum, t) => sum + t.remaining, 0);
          const needed = ing.quantity * item.quantity;
          
          const ingProductName = get().products.find(p => p.id === ing.product_id)?.name || 'ingrediente';
          
          if (transitAvailable < needed) {
            return { 
              success: false, 
              error: `No hay suficiente "${ingProductName}" en transito para la receta "${item.recipe_snapshot?.name}". Necesitas: ${needed}, Disponible: ${transitAvailable}` 
            };
          }
          const existing = itemsToConsume.find(i => i.productId === ing.product_id);
          if (existing) {
            existing.qtyNeeded += needed;
          } else {
            itemsToConsume.push({ productId: ing.product_id, name: ingProductName, qtyNeeded: needed, qtyAvailable: transitAvailable });
          }
        }
      }
    }

    // Si está offline, guardar en IndexedDB
    if (!isOnline) {
      try {
        await initOfflineDB();
        await savePendingSale({
          data: {
            employee_id: sale.employee_id,
            items: sale.items,
            total_amount: sale.total_amount,
            date: sale.date,
            sale_type: sale.sale_type,
            notes: sale.notes,
            discount: sale.discount,
          },
        });

        // Consumir del tránsito localmente
        for (const item of sale.items) {
          if (!item.is_recipe) {
            await get().consumeFromTransit(item.product_id, item.quantity, `Venta offline`);
          } else if (item.is_recipe && item.recipe_snapshot) {
            for (const ing of item.recipe_snapshot.ingredients) {
              await get().consumeFromTransit(ing.product_id, ing.quantity * item.quantity, `Venta offline (Receta)`);
            }
          }
        }

        toast.success('Venta guardada offline. Se sincronizará cuando haya conexión.');
        return { success: true };
      } catch (err) {
        console.error('Error saving sale offline:', err);
        return { success: false, error: 'No se pudo guardar la venta offline' };
      }
    }

    // Si está online, proceder normalmente
    const { data: newSale, error: saleError } = await supabase
      .from('sales')
      .insert({ 
        user_id: user.id, 
        employee_id: sale.employee_id,
        total_amount: sale.total_amount,
        date: sale.date,
        sale_type: sale.sale_type,
        notes: sale.notes,
        discount: sale.discount,
      })
      .select()
      .single();

    if (saleError) {
      if (import.meta.env.DEV) console.error('Error adding sale:', saleError);
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

    await supabase.from('sale_items').insert(saleItems);

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
  },

  consumeFromTransit: async (productId: string, qtyNeeded: number, reason?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return { success: false, error: 'No hay usuario autenticado' };

    const isOnline = navigator.onLine;
    const product = get().products.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Producto no encontrado' };

    let remaining = qtyNeeded;
    const transitItemsForProduct = get().transitItems
      .filter(t => t.product_id === productId && t.remaining > 0)
      .sort((a, b) => new Date(a.sent_date).getTime() - new Date(b.sent_date).getTime());

    const updatedItems: { id: string; newRemaining: number; newConsumed: number }[] = [];

    for (const item of transitItemsForProduct) {
      if (remaining <= 0) break;

      const toConsume = Math.min(item.remaining, remaining);
      const newRemaining = item.remaining - toConsume;
      const newConsumed = item.consumed + toConsume;
      remaining -= toConsume;

      // Si está online, actualizar en Supabase
      if (isOnline) {
        const { error } = await supabase
          .from('transit_items')
          .update({ remaining: newRemaining, consumed: newConsumed, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        if (error) {
          throw new Error('No se pudo actualizar el item en tránsito');
        }
      }
      updatedItems.push({ id: item.id, newRemaining, newConsumed });
    }

    if (remaining > 0) {
      return { success: false, error: 'No habia suficiente cantidad en transito' };
    }

    const newTotalInTransit = updatedItems.reduce((sum, u) => sum + u.newRemaining, 0);
    const newQuantity = Number(product.quantity) - qtyNeeded;
    let newMovement = null;

    // Si está online, registrar el movimiento y actualizar producto en Supabase
    if (isOnline) {
      const { data: movementData, error: movementError } = await supabase
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
        .single();

      newMovement = movementData;

      if (movementError && import.meta.env.DEV) {
        console.error('Error recording sale movement:', movementError);
      }

      const { error: productError } = await supabase
        .from('products')
        .update({ 
          in_transit: newTotalInTransit,
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (productError) {
        throw new Error('No se pudo actualizar el tránsito del producto');
      }
    }

    // Siempre actualizar el estado local (funciona tanto online como offline)
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

      // Solo agregar movimiento si estamos online (ya que offline no se guarda en Supabase)
      const movements = isOnline && newMovement ? [newMovement, ...state.movements] : state.movements;

      return {
        transitItems: updatedTransitItems,
        movements,
        products: state.products.map(p => 
          p.id === productId ? { ...p, in_transit: newTotalInTransit, quantity: newQuantity } : p
        ),
      };
    });

    return { success: true };
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

    const { error: updateError } = await supabase
      .from('transit_items')
      .update({ remaining: 0, consumed: transitItem.quantity })
      .eq('id', transitItemId);

    if (updateError) {
      return { success: false, error: 'No se pudo actualizar el item en tránsito' };
    }

    const newInTransit = Math.max(0, Number(product.in_transit || 0) - quantity);

    const { error: productUpdateError } = await supabase
      .from('products')
      .update({ in_transit: newInTransit })
      .eq('id', product.id);

    if (productUpdateError) {
      await supabase.from('transit_items').update({ remaining: transitItem.remaining }).eq('id', transitItemId);
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

    set((state) => ({
      transitItems: state.transitItems.filter(t => t.id !== transitItemId),
      products: state.products.map(p =>
        p.id === product.id
          ? { ...p, in_transit: newInTransit }
          : p
      ),
    }));

    return { success: true };
  },

  addRecipe: async (recipe) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data: newRecipe, error } = await supabase
      .from('recipes')
      .insert({ 
        user_id: user.id, 
        name: capitalize(recipe.name), 
        selling_price: recipe.selling_price 
      })
      .select()
      .single();

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

      await supabase.from('recipe_ingredients').insert(ingredients);
    }

    set((state) => ({ 
      recipes: [{ ...newRecipe, ingredients: recipe.ingredients }, ...state.recipes] 
    }));
  },

  updateRecipe: async (id, updates) => {
    const { error } = await supabase
      .from('recipes')
      .update({ name: capitalize(updates.name), selling_price: updates.selling_price })
      .eq('id', id);

    if (error) {
      throw new Error('No se pudo actualizar la receta');
    }

    if (updates.ingredients) {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      
      if (updates.ingredients.length > 0) {
        const ingredients = updates.ingredients.map(ing => ({
          recipe_id: id,
          product_id: ing.product_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));
        await supabase.from('recipe_ingredients').insert(ingredients);
      }
    }

    set((state) => ({
      recipes: state.recipes.map(r => r.id === id ? { ...r, ...updates } : r),
    }));
  },

  deleteRecipe: async (id) => {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
    const { error } = await supabase.from('recipes').delete().eq('id', id);

    if (error) {
      throw new Error('No se pudo eliminar la receta');
    }

    set((state) => ({ recipes: state.recipes.filter(r => r.id !== id) }));
  },

  addEmployee: async (employee) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .insert({ ...employee, name: capitalize(employee.name), user_id: user.id })
      .select()
      .single();

    if (error) {
      throw new Error('No se pudo agregar el empleado');
    }

    set((state) => ({ employees: [data, ...state.employees] }));
  },

  updateEmployee: async (id, updates) => {
    const capitalizedUpdates = {
      ...updates,
      ...(updates.name !== undefined && { name: capitalize(updates.name) }),
    };
    const { error } = await supabase.from('employees').update(capitalizedUpdates).eq('id', id);

    if (error) {
      throw new Error('No se pudo actualizar el empleado');
    }

    set((state) => ({
      employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  },

  deleteEmployee: async (id) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) {
      throw new Error('No se pudo eliminar el empleado');
    }

    set((state) => ({ employees: state.employees.filter(e => e.id !== id) }));
  },

  addCategory: async (name) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: capitalize(name) })
      .select()
      .single();

    if (error) {
      throw new Error('No se pudo agregar la categoría');
    }

    set((state) => ({ categories: [data, ...state.categories] }));
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);

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

    const isOnline = navigator.onLine;

    // Si está offline, guardar en IndexedDB
    if (!isOnline) {
      try {
        await initOfflineDB();
        await savePendingClosing({
          data: {
            closing_date: closing.closing_date,
            total_sales: closing.total_sales,
            total_discounts: closing.total_discounts,
            total_refunds: closing.total_refunds,
            closing_amount: closing.closing_amount,
            notes: closing.notes,
            created_by: closing.created_by,
            created_by_name: closing.created_by_name,
          },
        });

        // Actualizar el estado local para que el usuario vea el cierre
        const tempClosing = {
          id: `offline-${Date.now()}`,
          user_id: user.id,
          ...closing,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({ dailyClosings: [tempClosing, ...state.dailyClosings] }));
        toast.success('Cierre de caja guardado offline. Se sincronizará cuando haya conexión.');
        return { success: true };
      } catch (err) {
        console.error('Error saving closing offline:', err);
        return { success: false, error: 'No se pudo guardar el cierre offline' };
      }
    }

    // Si está online, proceder normalmente
    const { data, error } = await supabase
      .from('daily_closings')
      .insert({ ...closing, user_id: user.id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ya existe un cierre para esta fecha' };
      }
      throw new Error('No se pudo registrar el cierre de caja');
    }

    set((state) => ({ dailyClosings: [data, ...state.dailyClosings] }));
    return { success: true };
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
    if (!navigator.onLine) return;
    
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      await initOfflineDB();

      const pendingSales = await getAllPendingSales();
      const pendingMovements = await getAllPendingMovements();
      const pendingClosings = await getAllPendingClosings();

      for (const sale of pendingSales) {
        if (sale.retryCount >= 3) continue;
        
        try {
          const { data, error } = await supabase
            .from('sales')
            .insert({
              user_id: user.id,
              employee_id: sale.data.employee_id,
              total_amount: sale.data.total_amount,
              date: sale.data.date,
              sale_type: sale.data.sale_type,
              notes: sale.data.notes,
              discount: sale.data.discount,
            })
            .select()
            .single();

          if (error) {
            await incrementRetryCount(sale.id, STORES.PENDING_SALES);
            continue;
          }

          if (sale.data.items && sale.data.items.length > 0) {
            const saleItems = sale.data.items.map(item => ({
              sale_id: data.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              selling_price: item.selling_price,
              subtotal: item.subtotal,
              is_recipe: item.is_recipe || false,
              recipe_snapshot: item.recipe_snapshot,
            }));
            await supabase.from('sale_items').insert(saleItems);
          }

          await markSaleAsSynced(sale.id);
        } catch (err) {
          console.error('Error syncing sale:', err);
          await incrementRetryCount(sale.id, STORES.PENDING_SALES);
        }
      }

      for (const movement of pendingMovements) {
        if (movement.retryCount >= 3) continue;
        
        try {
          const { error } = await supabase
            .from('movements')
            .insert({
              user_id: user.id,
              product_id: movement.data.product_id,
              type: movement.data.type,
              quantity: movement.data.quantity,
              unit: movement.data.unit,
              date: movement.data.date,
              cost: movement.data.cost,
              reason: movement.data.reason,
            });

          if (error) {
            await incrementRetryCount(movement.id, STORES.PENDING_MOVEMENTS);
            continue;
          }

          await markMovementAsSynced(movement.id);
        } catch (err) {
          console.error('Error syncing movement:', err);
          await incrementRetryCount(movement.id, STORES.PENDING_MOVEMENTS);
        }
      }

      for (const closing of pendingClosings) {
        if (closing.retryCount >= 3) continue;
        
        try {
          const { error } = await supabase
            .from('daily_closings')
            .insert({
              user_id: user.id,
              closing_date: closing.data.closing_date,
              total_sales: closing.data.total_sales,
              total_discounts: closing.data.total_discounts,
              total_refunds: closing.data.total_refunds,
              closing_amount: closing.data.closing_amount,
              notes: closing.data.notes,
              created_by: closing.data.created_by,
              created_by_name: closing.data.created_by_name,
            });

          if (error) {
            if (error.code !== '23505') {
              await incrementRetryCount(closing.id, STORES.PENDING_CLOSINGS);
              continue;
            }
          }

          await markClosingAsSynced(closing.id);
        } catch (err) {
          console.error('Error syncing closing:', err);
          await incrementRetryCount(closing.id, STORES.PENDING_CLOSINGS);
        }
      }

      if (pendingSales.length > 0 || pendingMovements.length > 0 || pendingClosings.length > 0) {
        await get().fetchAll();
        toast.success('Datos sincronizados correctamente');
      }
    } catch (err) {
      console.error('Error in syncPendingData:', err);
    }
  },
}));
