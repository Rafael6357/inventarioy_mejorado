import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { Calendar, TrendingUp, Package, UtensilsCrossed } from 'lucide-react';
import { Input } from '../../components/ui/input';

export default function ConsumptionView() {
  const { products, recipes, sales } = useDatabaseStore();
  
  // Date range defaults to today
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Calculate consumption for the date range
  const consumptionData = useMemo(() => {
    // Filter sales by date range
    const dailySales = sales.filter(sale => {
      // Get YYYY-MM-DD from ISO date or locale date
      const saleDateStr = new Date(sale.date).toISOString().split('T')[0];
      
      if (startDate && saleDateStr < startDate) return false;
      if (endDate && saleDateStr > endDate) return false;
      return true;
    });

    // Map to store consumption per product
    // productId -> { product, directQty, recipeQty, totalQty, cost }
    const consumptionMap = new Map<string, {
      product: any;
      directQty: number;
      recipeQty: number;
      totalQty: number;
      totalCost: number;
      recipes: { recipeName: string; qty: number }[];
    }>();

    // Initialize map with all products to 0? No, only show consumed ones.
    
    dailySales.forEach(sale => {
      const items = typeof sale.items === 'string' 
        ? JSON.parse(sale.items || '[]') 
        : (sale.items || []);
      items.forEach(item => {
        // Is it a direct product?
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const existing = consumptionMap.get(product.id) || {
            product,
            directQty: 0,
            recipeQty: 0,
            totalQty: 0,
            totalCost: 0,
            recipes: []
          };
          
          existing.directQty += item.quantity;
          existing.totalQty += item.quantity;
          existing.totalCost += (product.cost * item.quantity);
          consumptionMap.set(product.id, existing);
        } else {
          // Is it a recipe?
          if (item.is_recipe && item.recipe_snapshot) {
            item.recipe_snapshot.ingredients?.forEach(ing => {
              const ingProduct = products.find(p => p.id === ing.product_id);
              if (ingProduct) {
                const existing = consumptionMap.get(ingProduct.id) || {
                  product: ingProduct,
                  directQty: 0,
                  recipeQty: 0,
                  totalQty: 0,
                  totalCost: 0,
                  recipes: []
                };
                
                const consumedQty = ing.quantity * item.quantity;
                existing.recipeQty += consumedQty;
                existing.totalQty += consumedQty;
                existing.totalCost += (ingProduct.cost * consumedQty);
                
                // Track which recipe caused this consumption
                  const recipeEntry = existing.recipes.find(r => r.recipeName === item.recipe_snapshot!.name);
                if (recipeEntry) {
                  recipeEntry.qty += consumedQty;
                } else {
                  existing.recipes.push({ recipeName: item.recipe_snapshot!.name, qty: consumedQty });
                }
                
                consumptionMap.set(ingProduct.id, existing);
              }
            });
          } else {
            // Fallback for legacy sales without snapshot
            const recipe = recipes.find(r => r.id === item.product_id);
            if (recipe && recipe.ingredients) {
              recipe.ingredients.forEach(ing => {
                const ingProduct = products.find(p => p.id === ing.product_id);
                if (ingProduct) {
                  const existing = consumptionMap.get(ingProduct.id) || {
                    product: ingProduct,
                    directQty: 0,
                    recipeQty: 0,
                    totalQty: 0,
                    totalCost: 0,
                    recipes: []
                  };
                  
                  const consumedQty = ing.quantity * item.quantity;
                  existing.recipeQty += consumedQty;
                  existing.totalQty += consumedQty;
                  existing.totalCost += (ingProduct.cost * consumedQty);
                  
                  // Track which recipe caused this consumption
                  const recipeEntry = existing.recipes.find(r => r.recipeName === recipe.name);
                  if (recipeEntry) {
                    recipeEntry.qty += consumedQty;
                  } else {
                    existing.recipes.push({ recipeName: recipe.name, qty: consumedQty });
                  }
                  
                  consumptionMap.set(ingProduct.id, existing);
                }
              });
            }
          }
        }
      });
    });

    // Convert map to array and sort by total cost descending
    return Array.from(consumptionMap.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [sales, products, recipes, startDate, endDate]);

  const totalDailyCost = consumptionData.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Análisis de Consumo</h1>
          <p className="text-sm text-text-secondary">
            Desglose detallado de ingredientes consumidos por fecha
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-border shadow-sm overflow-visible">
          <Calendar className="h-5 w-5 text-primary shrink-0" />
          <span className="text-xs text-text-secondary shrink-0">Desde:</span>
          <Input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 w-28 no-spin"
          />
          <span className="text-xs text-text-secondary shrink-0">Hasta:</span>
          <Input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 w-28 no-spin"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-text-secondary">Costo Total Consumido</h3>
          </div>
          <p className="text-2xl font-bold text-text">${totalDailyCost.toFixed(2)}</p>
        </div>
        
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-text-secondary">Ingredientes Únicos</h3>
          </div>
          <p className="text-2xl font-bold text-text">{consumptionData.length}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h3 className="font-medium text-text-secondary">Recetas Involucradas</h3>
          </div>
          <p className="text-2xl font-bold text-text">
            {new Set(consumptionData.flatMap(c => c.recipes.map(r => r.recipeName))).size}
          </p>
        </div>
      </div>

      {/* Consumption Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-bg/50">
          <h2 className="text-lg font-semibold text-text">Detalle de Ingredientes</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
            <thead className="bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-medium">Ingrediente</th>
                <th className="px-6 py-4 font-medium">Consumo Directo</th>
                <th className="px-6 py-4 font-medium">Consumo en Recetas</th>
                <th className="px-6 py-4 font-medium">Total Consumido</th>
                <th className="px-6 py-4 font-medium">Costo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {consumptionData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                    No hay registros de consumo para el rango de fechas seleccionado.
                  </td>
                </tr>
              ) : (
                consumptionData.map((item) => (
                  <tr key={item.product.id} className="transition-colors hover:bg-surface-hover">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text">{item.product.name}</p>
                      <p className="text-xs text-text-secondary">{item.product.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      {item.directQty > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-medium border border-border">
                          {item.directQty.toFixed(4)} {item.product.unit}
                        </span>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.recipeQty > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {item.recipeQty.toFixed(4)} {item.product.unit}
                          </span>
                          <div className="flex flex-col gap-1 mt-1">
                            {item.recipes.map((r) => (
                              <span key={r.recipeName} className="text-[10px] text-text-secondary">
                                • {r.recipeName}: {r.qty.toFixed(4)} {item.product.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-text">
                        {item.totalQty.toFixed(4)} {item.product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-text-secondary">
                        ${item.totalCost.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
