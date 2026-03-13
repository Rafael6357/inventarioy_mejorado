import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---
export interface Product {
  id: string;
  businessId: string;
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
  eoq?: number;
  rop?: number;
  lead_time?: number;
  order_cost?: number;
  holding_cost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  businessId: string;
  type: 'ENTRADA' | 'SALIDA' | 'MERMA';
  productId: string;
  quantity: number;
  unit: string;
  date: string;
  cost: number;
  reason?: string;
  status: 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO';
  justification?: string;
  justificationDate?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  businessId: string;
  employeeId: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
    sellingPrice: number;
    subtotal: number;
  }[];
  totalAmount: number;
  date: string;
  saleType: 'SALON' | 'DOMICILIO';
  notes?: string;
  discount: number;
  createdAt: string;
}

export interface Recipe {
  id: string;
  businessId: string;
  name: string;
  sellingPrice: number;
  ingredients: {
    productId: string;
    quantity: number;
    unit: string;
  }[];
  createdAt: string;
}

export interface Employee {
  id: string;
  businessId: string;
  name: string;
  role: string;
  salary: number;
  phone?: string;
  email?: string;
  createdAt: string;
}

// --- Store ---
interface DatabaseState {
  products: Product[];
  movements: Movement[];
  sales: Sale[];
  recipes: Recipe[];
  employees: Employee[];
  
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  addMovement: (movement: Omit<Movement, 'id' | 'createdAt'>) => void;
  justifyMovement: (id: string, justification: string) => void;
  
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useDatabaseStore = create<DatabaseState>()(
  persist(
    (set) => ({
      products: [],
      movements: [],
      sales: [],
      recipes: [],
      employees: [],

      addProduct: (product) => set((state) => ({
        products: [...state.products, {
          ...product,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      })),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      })),
      
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id)
      })),

      addMovement: (movement) => set((state) => {
        // Also update product stock
        const products = state.products.map(p => {
          if (p.id === movement.productId) {
            const qty = movement.type === 'ENTRADA' ? movement.quantity : -movement.quantity;
            return { ...p, quantity: p.quantity + qty, updatedAt: new Date().toISOString() };
          }
          return p;
        });

        return {
          products,
          movements: [...state.movements, {
            ...movement,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }]
        };
      }),

      justifyMovement: (id, justification) => set((state) => ({
        movements: state.movements.map(m =>
          m.id === id ? {
            ...m,
            status: 'JUSTIFICADO',
            justification,
            justificationDate: new Date().toISOString()
          } : m
        )
      })),

      addSale: (sale) => set((state) => {
        // Update product stock for each item
        const products = [...state.products];
        sale.items.forEach(item => {
          // Check if the item is a product
          const pIndex = products.findIndex(p => p.id === item.productId);
          if (pIndex >= 0) {
            products[pIndex] = {
              ...products[pIndex],
              quantity: products[pIndex].quantity - item.quantity,
              updatedAt: new Date().toISOString()
            };
          } else {
            // Check if the item is a recipe
            const recipe = state.recipes.find(r => r.id === item.productId);
            if (recipe) {
              // Subtract stock for each ingredient
              recipe.ingredients.forEach(ing => {
                const ingIndex = products.findIndex(p => p.id === ing.productId);
                if (ingIndex >= 0) {
                  products[ingIndex] = {
                    ...products[ingIndex],
                    quantity: products[ingIndex].quantity - (ing.quantity * item.quantity),
                    updatedAt: new Date().toISOString()
                  };
                }
              });
            }
          }
        });

        return {
          products,
          sales: [...state.sales, {
            ...sale,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }]
        };
      }),

      addRecipe: (recipe) => set((state) => ({
        recipes: [...state.recipes, {
          ...recipe,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }]
      })),

      updateRecipe: (id, updates) => set((state) => ({
        recipes: state.recipes.map(r => r.id === id ? { ...r, ...updates } : r)
      })),

      deleteRecipe: (id) => set((state) => ({
        recipes: state.recipes.filter(r => r.id !== id)
      })),

      addEmployee: (employee) => set((state) => ({
        employees: [...state.employees, {
          ...employee,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }]
      })),

      updateEmployee: (id, updates) => set((state) => ({
        employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      deleteEmployee: (id) => set((state) => ({
        employees: state.employees.filter(e => e.id !== id)
      })),
    }),
    {
      name: 'inventarioy-db',
    }
  )
);
