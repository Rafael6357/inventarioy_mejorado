import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  cost: number;
  stock_min: number;
  stock_max: number;
  expiration_date?: string;
  description?: string;
  is_individual: boolean;
  is_active: boolean;
  eoq?: number;
  rop?: number;
  lead_time?: number;
  order_cost?: number;
  holding_cost?: number;
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
  status: 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO';
  justification?: string;
  justification_date?: string;
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

interface DatabaseState {
  products: Product[];
  movements: Movement[];
  sales: Sale[];
  recipes: Recipe[];
  employees: Employee[];
  categories: Category[];
  isLoading: boolean;

  fetchAll: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addMovement: (movement: Omit<Movement, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  justifyMovement: (id: string, justification: string) => Promise<void>;
  
  addSale: (sale: Omit<Sale, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  
  addRecipe: (recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  
  addEmployee: (employee: Omit<Employee, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  recalculateStock: () => Promise<void>;
}

export const useDatabaseStore = create<DatabaseState>()((set, get) => ({
  products: [],
  movements: [],
  sales: [],
  recipes: [],
  employees: [],
  categories: [],
  isLoading: true,

  fetchAll: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ products: [], movements: [], sales: [], recipes: [], employees: [], categories: [], isLoading: false });
      return;
    }

    set({ isLoading: true });

    const [productsRes, movementsRes, salesRes, recipesRes, employeesRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('movements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sales').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('recipes').select('*, recipe_ingredients(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const recipes = recipesRes.data?.map(r => ({
      ...r,
      ingredients: r.recipe_ingredients || [],
    })) || [];

    set({
      products: productsRes.data || [],
      movements: movementsRes.data || [],
      sales: salesRes.data || [],
      recipes,
      employees: employeesRes.data || [],
      categories: categoriesRes.data || [],
      isLoading: false,
    });
  },

  addProduct: async (product) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      return;
    }

    set((state) => ({ products: [data, ...state.products] }));
  },

  updateProduct: async (id, updates) => {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
      return;
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
      console.error('Error deleting product:', error);
      return;
    }

    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, is_active: false } : p),
    }));
  },

  addMovement: async (movement) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let status = movement.status || 'NORMAL';
    
    if ((movement.type === 'SALIDA' || movement.type === 'MERMA') && status === 'NORMAL') {
      const previousOutputs = get().movements.filter(
        m => m.product_id === movement.product_id && (m.type === 'SALIDA' || m.type === 'MERMA')
      );
      
      if (previousOutputs.length > 0) {
        const totalOutput = previousOutputs.reduce((sum, m) => sum + Number(m.quantity), 0);
        const averageOutput = totalOutput / previousOutputs.length;
        
        if (Number(movement.quantity) > averageOutput * 1.5) {
          status = 'ANOMALIA';
        }
      }
    }

    const { data: newMovement, error: movementError } = await supabase
      .from('movements')
      .insert({ ...movement, user_id: user.id, status })
      .select()
      .single();

    if (movementError) {
      console.error('Error adding movement:', movementError);
      return;
    }

    const product = get().products.find(p => p.id === movement.product_id);
    if (!product) return;

    let newQuantity = Number(product.quantity);
    let newCost = Number(product.cost);

    if (movement.type === 'ENTRADA') {
      const currentTotalValue = Number(product.quantity) * Number(product.cost);
      const newTotalValue = Number(movement.quantity) * Number(movement.cost);
      newQuantity = Number(product.quantity) + Number(movement.quantity);
      
      if (newQuantity > 0) {
        newCost = (currentTotalValue + newTotalValue) / newQuantity;
      }
    } else {
      newQuantity = Number(product.quantity) - Number(movement.quantity);
    }

    await get().updateProduct(movement.product_id, { quantity: newQuantity, cost: newCost });

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
      console.error('Error justifying movement:', error);
      return;
    }

    set((state) => ({
      movements: state.movements.map(m =>
        m.id === id ? { ...m, status: 'JUSTIFICADO', justification, justification_date: new Date().toISOString() } : m
      ),
    }));
  },

  addSale: async (sale) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

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
      console.error('Error adding sale:', saleError);
      return;
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
      const product = get().products.find(p => p.id === item.product_id);
      
      if (product && !item.is_recipe) {
        await get().addMovement({
          product_id: product.id,
          type: 'SALIDA',
          quantity: item.quantity,
          unit: product.unit,
          date: sale.date,
          cost: product.cost,
          reason: `Venta ${sale.sale_type === 'DOMICILIO' ? 'a domicilio' : 'en salón'}`,
          status: 'NORMAL',
        });
      } else if (item.is_recipe && item.recipe_snapshot) {
        for (const ing of item.recipe_snapshot.ingredients) {
          const ingProduct = get().products.find(p => p.id === ing.product_id);
          if (ingProduct) {
            await get().addMovement({
              product_id: ing.product_id,
              type: 'SALIDA',
              quantity: ing.quantity * item.quantity,
              unit: ingProduct.unit,
              date: sale.date,
              cost: ingProduct.cost,
              reason: `Venta de receta: ${item.recipe_snapshot?.name}`,
              status: 'NORMAL',
            });
          }
        }
      }
    }

    set((state) => ({ sales: [newSale, ...state.sales] }));
  },

  addRecipe: async (recipe) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data: newRecipe, error } = await supabase
      .from('recipes')
      .insert({ 
        user_id: user.id, 
        name: recipe.name, 
        selling_price: recipe.selling_price 
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding recipe:', error);
      return;
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
      .update({ name: updates.name, selling_price: updates.selling_price })
      .eq('id', id);

    if (error) {
      console.error('Error updating recipe:', error);
      return;
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
      console.error('Error deleting recipe:', error);
      return;
    }

    set((state) => ({ recipes: state.recipes.filter(r => r.id !== id) }));
  },

  addEmployee: async (employee) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .insert({ ...employee, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error adding employee:', error);
      return;
    }

    set((state) => ({ employees: [data, ...state.employees] }));
  },

  updateEmployee: async (id, updates) => {
    const { error } = await supabase.from('employees').update(updates).eq('id', id);

    if (error) {
      console.error('Error updating employee:', error);
      return;
    }

    set((state) => ({
      employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  },

  deleteEmployee: async (id) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      return;
    }

    set((state) => ({ employees: state.employees.filter(e => e.id !== id) }));
  },

  addCategory: async (name) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      return;
    }

    set((state) => ({ categories: [data, ...state.categories] }));
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return;
    }

    set((state) => ({ categories: state.categories.filter(c => c.id !== id) }));
  },

  recalculateStock: async () => {
    await get().fetchAll();
  },
}));
