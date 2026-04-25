import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { ChefHat, Plus, Minus, Trash2, Search, UtensilsCrossed, AlertCircle, Pencil, X, Check } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  convertUnit,
  getCompatibleUnits,
  getLastUsedUnit,
  saveLastUsedUnit,
  normalizeUnit,
  UnitAbbrev,
  UNIT_LABELS,
} from '../../lib/unitConversion';

export default function RecipesView() {
  const { user } = useAuthStore();
  const { products, recipes, addRecipe, deleteRecipe, updateRecipe } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState(0);
  
  // Recipe Form State
  const [recipeName, setRecipeName] = useState('');
  const [selling_price, setSellingPrice] = useState(0);
  const [ingredients, setIngredients] = useState<{
    product_id: string;
    quantity: number;
    unit: string;
    displayUnit: string;
  }[]>([]);

  // Calculate total cost of the recipe based on ingredients
  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const product = products.find(p => p.id === ing.product_id);
      if (!product) return sum;
      const baseUnit = normalizeUnit(product.unit);
      const quantityInBase = convertUnit(ing.quantity, ing.displayUnit as UnitAbbrev, baseUnit);
      return sum + (product.cost * quantityInBase);
    }, 0);
  }, [ingredients, products]);

  const profitMargin = selling_price > 0 ? ((selling_price - totalCost) / selling_price) * 100 : 0;

  const startEditPrice = (recipe: any) => {
    setEditingRecipeId(recipe.id);
    setEditingPrice(Number(recipe.selling_price));
  };

  const cancelEditPrice = () => {
    setEditingRecipeId(null);
    setEditingPrice(0);
  };

  const saveEditPrice = async (recipeId: string) => {
    if (!editingPrice || editingPrice < 0.01) {
      toast.error('El precio debe ser mayor a $0');
      return;
    }
    try {
      await updateRecipe(recipeId, { selling_price: editingPrice });
      toast.success('Precio actualizado');
      cancelEditPrice();
    } catch (err) {
      toast.error((err as Error).message || 'Error al actualizar');
    }
  };

  const handleAddIngredient = (productId: string) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const baseUnit = normalizeUnit(product.unit);
    const compatibleUnits = getCompatibleUnits(baseUnit);
    const savedUnit = getLastUsedUnit(productId);
    const defaultUnit = savedUnit && compatibleUnits.includes(savedUnit) ? savedUnit : baseUnit;

    setIngredients(current => {
      if (current.some(ing => ing.product_id === productId)) return current;
      return [...current, {
        product_id: productId,
        quantity: 1,
        unit: baseUnit,
        displayUnit: defaultUnit
      }];
    });
  };

  const updateIngredientQuantity = (productId: string, quantity: number) => {
    setIngredients(current => current.map(ing => 
      ing.product_id === productId ? { ...ing, quantity: Math.max(0.01, quantity) } : ing
    ));
  };

  const removeIngredient = (productId: string) => {
    setIngredients(current => current.filter(ing => ing.product_id !== productId));
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (ingredients.length === 0) {
      toast.error('La receta debe tener al menos un ingrediente.');
      return;
    }

    try {
      const convertedIngredients = ingredients.map(ing => {
        const product = products.find(p => p.id === ing.product_id);
        const baseUnit = product ? normalizeUnit(product.unit) : 'u';
        const quantityInBase = convertUnit(ing.quantity, ing.displayUnit as UnitAbbrev, baseUnit);
        
        saveLastUsedUnit(ing.product_id, ing.displayUnit as UnitAbbrev);
        
        return {
          product_id: ing.product_id,
          quantity: quantityInBase,
          unit: baseUnit
        };
      });

      await addRecipe({
        name: recipeName,
        selling_price,
        ingredients: convertedIngredients
      });
      setRecipeName('');
      setSellingPrice(0);
      setIngredients([]);
      toast.success('Receta creada exitosamente');
    } catch (err) {
      toast.error((err as Error).message || 'Error al crear la receta');
    }
  };

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Recetas y Escandallos</h1>
        <p className="text-sm text-text-secondary">
          Crea platillos compuestos para descontar de tránsito automáticamente
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel Izquierdo - Creador de Recetas */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm h-fit">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ChefHat className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Nueva Receta</h2>
          </div>

          <form onSubmit={handleCreateRecipe} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipeName">Nombre del Platillo *</Label>
                <Input 
                  id="recipeName" 
                  required 
                  placeholder="Ej: Hamburguesa Clásica"
                  value={recipeName} 
                  onChange={e => setRecipeName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Precio de Venta ($) *</Label>
<Input 
                  id="sellingPrice" 
                  type="number" 
                  min="0.01" 
                  step="0.01" 
                  required 
                  value={selling_price || ''} 
                    onChange={e => setSellingPrice(Number(e.target.value))} 
                />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-bg/50 p-4">
                <div className="flex items-center justify-between">
                  <Label>Ingredientes</Label>
                </div>
                
                <select 
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onChange={e => {
                    handleAddIngredient(e.target.value);
                    e.target.value = ''; // Reset select after adding
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Agregar ingrediente...</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>

                {ingredients.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {ingredients.map(ing => {
                      const product = products.find(p => p.id === ing.product_id);
                      if (!product) return null;
                      
                      const baseUnit = normalizeUnit(product.unit);
                      const compatibleUnits = getCompatibleUnits(baseUnit);
                      const quantityInBase = convertUnit(ing.quantity, ing.displayUnit as UnitAbbrev, baseUnit);
                      
                      return (
                        <div key={ing.product_id} className="flex items-center justify-between gap-3 rounded-md bg-surface p-2 border border-border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">{product.name}</p>
                            <p className="text-xs text-text-secondary">Costo: ${(product.cost * quantityInBase).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              min="0.0001" 
                              step="0.01" 
                              className="h-8 w-20 text-right text-sm"
                              value={ing.quantity}
                              onChange={e => updateIngredientQuantity(ing.product_id, Number(e.target.value))}
                            />
                            <select
                              value={ing.displayUnit}
                              onChange={e => {
                                const newUnit = e.target.value as UnitAbbrev;
                                const convertedQty = convertUnit(ing.quantity, ing.displayUnit as UnitAbbrev, newUnit);
                                setIngredients(current => current.map(i => 
                                  i.product_id === ing.product_id 
                                    ? { ...i, displayUnit: newUnit, quantity: convertedQty }
                                    : i
                                ));
                              }}
                              disabled={compatibleUnits.length <= 1}
                              className="h-8 rounded border border-border bg-bg px-1 text-xs text-text disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {compatibleUnits.map((u) => (
                                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                              ))}
                            </select>
                            <button 
                              type="button"
                              onClick={() => removeIngredient(ing.product_id)}
                              className="text-text-secondary hover:text-danger p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumen de Costos */}
              <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
                <h3 className="text-sm font-medium text-primary mb-3">Resumen Financiero</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Costo Total (Ingredientes):</span>
                    <span className="font-mono font-medium">${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Precio de Venta:</span>
                    <span className="font-mono font-medium">${selling_price.toFixed(2)}</span>
                  </div>
                <div className="flex justify-between border-t border-primary/20 pt-2 mt-2">
                  <span className="text-text-secondary">Margen de Ganancia:</span>
                  <span className={`font-mono font-bold ${profitMargin < 30 ? 'text-danger' : 'text-success'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
                {profitMargin < 30 && selling_price > 0 && (
                  <p className="text-xs text-danger flex items-center gap-1 mt-2">
                    <AlertCircle className="h-3 w-3" />
                    El margen es menor al 30% recomendado para gastronomía.
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="px-8">
              Guardar Receta
            </Button>
          </form>
        </div>

        {/* Panel Derecho - Lista de Recetas */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Recetario</h2>
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar receta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-4">
            {filteredRecipes.length === 0 ? (
              <div className="py-12 text-center text-text-secondary">
                No hay recetas registradas.
              </div>
            ) : (
              filteredRecipes.map(recipe => {
                // Calculate cost for display
                const cost = recipe.ingredients.reduce((sum, ing) => {
                  const product = products.find(p => p.id === ing.product_id);
                  return sum + ((product?.cost || 0) * ing.quantity);
                }, 0);
                const margin = recipe.selling_price > 0 ? ((recipe.selling_price - cost) / recipe.selling_price) * 100 : 0;

                return (
                  <div key={recipe.id} className="relative rounded-xl border border-border bg-bg p-4 transition-colors hover:border-primary/50">
                    <button 
                      onClick={async () => {
                        if(window.confirm('¿Seguro que deseas eliminar esta receta?')) {
                          try {
                            await deleteRecipe(recipe.id);
                            toast.success('Receta eliminada exitosamente');
                          } catch (err) {
                            toast.error((err as Error).message || 'Error al eliminar la receta');
                          }
                        }
                      }}
                      className="absolute right-4 top-4 text-text-secondary hover:text-danger transition-colors"
                      title="Eliminar receta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <h3 className="font-semibold text-text text-lg pr-8">{recipe.name}</h3>
                    
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-md bg-surface p-2 text-center">
                        <p className="text-xs text-text-secondary">Costo</p>
                        <p className="font-mono font-medium">${cost.toFixed(2)}</p>
                      </div>
                      <div className="rounded-md bg-surface p-2 text-center">
                        {editingRecipeId === recipe.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(Number(e.target.value))}
                              className="h-8 w-16 text-center font-mono text-primary text-sm"
                            />
                            <button onClick={() => saveEditPrice(recipe.id)} className="text-success hover:text-green-400">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={cancelEditPrice} className="text-text-secondary hover:text-text">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEditPrice(recipe)}
                            className="w-full hover:bg-primary/20 rounded-md p-1 transition-colors"
                            title="Clic para editar precio de venta"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <Pencil className="h-3 w-3 text-text-secondary" />
                              <p className="text-xs text-text-secondary">Venta</p>
                            </div>
                            <p className="font-mono font-medium text-primary">${recipe.selling_price.toFixed(2)}</p>
                          </button>
                        )}
                      </div>
                      <div className="rounded-md bg-surface p-2 text-center">
                        <p className="text-xs text-text-secondary">Margen</p>
                        <p className={`font-mono font-medium ${margin < 30 ? 'text-danger' : 'text-success'}`}>
                          {margin.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-medium text-text-secondary mb-2">Ingredientes ({recipe.ingredients.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {recipe.ingredients.map(ing => {
                          const product = products.find(p => p.id === ing.product_id);
                          return (
                            <span key={ing.product_id} className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs text-text-secondary">
                              {ing.quantity} {ing.unit} {product?.name || 'Producto Eliminado'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
