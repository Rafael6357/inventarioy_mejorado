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
  isActive?: boolean;
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
    isRecipe?: boolean;
    recipeSnapshot?: {
      name: string;
      ingredients: {
        productId: string;
        quantity: number;
        cost: number;
      }[];
    };
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
  
  recalculateStock: () => void;
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
          isActive: true,
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
        products: state.products.map(p => 
          p.id === id ? { ...p, isActive: false, updatedAt: new Date().toISOString() } : p
        )
      })),

      addMovement: (movement) => set((state) => {
        // Calculate anomaly if it's a SALIDA or MERMA
        let status = movement.status || 'NORMAL';
        
        if ((movement.type === 'SALIDA' || movement.type === 'MERMA') && status === 'NORMAL') {
          // Find previous outputs for this product
          const previousOutputs = state.movements.filter(
            m => m.productId === movement.productId && (m.type === 'SALIDA' || m.type === 'MERMA')
          );
          
          if (previousOutputs.length > 0) {
            const totalOutput = previousOutputs.reduce((sum, m) => sum + m.quantity, 0);
            const averageOutput = totalOutput / previousOutputs.length;
            
            if (movement.quantity > averageOutput * 1.5) {
              status = 'ANOMALIA';
            }
          }
        }

        // Also update product stock and weighted average cost
        const products = state.products.map(p => {
          if (p.id === movement.productId) {
            let newQuantity = p.quantity;
            let newCost = p.cost;

            if (movement.type === 'ENTRADA') {
              const currentTotalValue = p.quantity * p.cost;
              const newTotalValue = movement.quantity * movement.cost;
              newQuantity = p.quantity + movement.quantity;
              
              // Calculate weighted average cost
              if (newQuantity > 0) {
                newCost = (currentTotalValue + newTotalValue) / newQuantity;
              }
            } else {
              newQuantity = p.quantity - movement.quantity;
            }

            return { 
              ...p, 
              quantity: newQuantity, 
              cost: newCost,
              updatedAt: new Date().toISOString() 
            };
          }
          return p;
        });

        return {
          products,
          movements: [...state.movements, {
            ...movement,
            status,
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
        const products = [...state.products];
        const newMovements: Movement[] = [];
        const saleDate = sale.date || new Date().toISOString();

        sale.items.forEach(item => {
          // Check if the item is a product
          const pIndex = products.findIndex(p => p.id === item.productId);
          if (pIndex >= 0) {
            const product = products[pIndex];
            products[pIndex] = {
              ...product,
              quantity: product.quantity - item.quantity,
              updatedAt: new Date().toISOString()
            };
            
            // Calculate anomaly
            let status: 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO' = 'NORMAL';
            const previousOutputs = state.movements.filter(
              m => m.productId === product.id && (m.type === 'SALIDA' || m.type === 'MERMA')
            );
            if (previousOutputs.length > 0) {
              const totalOutput = previousOutputs.reduce((sum, m) => sum + m.quantity, 0);
              const averageOutput = totalOutput / previousOutputs.length;
              if (item.quantity > averageOutput * 1.5) {
                status = 'ANOMALIA';
              }
            }

            newMovements.push({
              id: generateId(),
              businessId: sale.businessId,
              type: 'SALIDA',
              productId: product.id,
              quantity: item.quantity,
              unit: product.unit,
              date: saleDate,
              cost: product.cost,
              reason: `Venta ${sale.saleType === 'DOMICILIO' ? 'a domicilio' : 'en salón'}`,
              status,
              createdAt: new Date().toISOString(),
            });

          } else {
            // Check if the item is a recipe
            const recipe = state.recipes.find(r => r.id === item.productId);
            if (recipe) {
              // Subtract stock for each ingredient
              recipe.ingredients.forEach(ing => {
                const ingIndex = products.findIndex(p => p.id === ing.productId);
                if (ingIndex >= 0) {
                  const product = products[ingIndex];
                  const totalQty = ing.quantity * item.quantity;
                  products[ingIndex] = {
                    ...product,
                    quantity: product.quantity - totalQty,
                    updatedAt: new Date().toISOString()
                  };
                  
                  // Calculate anomaly
                  let status: 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO' = 'NORMAL';
                  const previousOutputs = state.movements.filter(
                    m => m.productId === product.id && (m.type === 'SALIDA' || m.type === 'MERMA')
                  );
                  if (previousOutputs.length > 0) {
                    const totalOutput = previousOutputs.reduce((sum, m) => sum + m.quantity, 0);
                    const averageOutput = totalOutput / previousOutputs.length;
                    if (totalQty > averageOutput * 1.5) {
                      status = 'ANOMALIA';
                    }
                  }

                  newMovements.push({
                    id: generateId(),
                    businessId: sale.businessId,
                    type: 'SALIDA',
                    productId: product.id,
                    quantity: totalQty,
                    unit: product.unit,
                    date: saleDate,
                    cost: product.cost,
                    reason: `Venta de receta: ${recipe.name}`,
                    status,
                    createdAt: new Date().toISOString(),
                  });
                }
              });
            }
          }
        });

        return {
          products,
          movements: [...state.movements, ...newMovements],
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

      recalculateStock: () => set((state) => {
        const products = state.products.map(product => {
          const productMovements = state.movements.filter(m => m.productId === product.id);
          const calculatedQuantity = productMovements.reduce((total, m) => {
            if (m.type === 'ENTRADA') return total + m.quantity;
            if (m.type === 'SALIDA' || m.type === 'MERMA') return total - m.quantity;
            return total;
          }, 0);
          
          return {
            ...product,
            quantity: calculatedQuantity,
            updatedAt: new Date().toISOString()
          };
        });

        return { products };
      }),
    }),
    {
      name: 'inventarioy-db',
    }
  )
);
