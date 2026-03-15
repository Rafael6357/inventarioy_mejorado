import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { ChefHat, Plus, Minus, Trash2, Search, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function RecipesView() {
  const { user } = useAuthStore();
  const { products, recipes, addRecipe, deleteRecipe } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.isActive !== false);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Recipe Form State
  const [recipeName, setRecipeName] = useState('');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [ingredients, setIngredients] = useState<{
    productId: string;
    quantity: number;
    unit: string;
  }[]>([]);

  // Calculate total cost of the recipe based on ingredients
  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const product = products.find(p => p.id === ing.productId);
      if (!product) return sum;
      // Assuming product.cost is per product.unit
      // If the ingredient unit matches the product unit, it's a direct multiplication
      return sum + (product.cost * ing.quantity);
    }, 0);
  }, [ingredients, products]);

  const profitMargin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  const handleAddIngredient = (productId: string) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setIngredients(current => {
      if (current.some(ing => ing.productId === productId)) return current;
      return [...current, {
        productId,
        quantity: 1,
        unit: product.unit
      }];
    });
  };

  const updateIngredientQuantity = (productId: string, quantity: number) => {
    setIngredients(current => current.map(ing => 
      ing.productId === productId ? { ...ing, quantity: Math.max(0.01, quantity) } : ing
    ));
  };

  const removeIngredient = (productId: string) => {
    setIngredients(current => current.filter(ing => ing.productId !== productId));
  };

  const handleCreateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (ingredients.length === 0) {
      toast.error('La receta debe tener al menos un ingrediente.');
      return;
    }

    addRecipe({
      businessId: user.businessName,
      name: recipeName,
      sellingPrice,
      ingredients
    });

    // Reset form
    setRecipeName('');
    setSellingPrice(0);
    setIngredients([]);
    toast.success('Receta creada exitosamente');
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
                  min="0" 
                  step="0.01" 
                  required 
                  value={sellingPrice || ''} 
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
                    const product = products.find(p => p.id === ing.productId);
                    if (!product) return null;
                    
                    return (
                      <div key={ing.productId} className="flex items-center justify-between gap-3 rounded-md bg-surface p-2 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{product.name}</p>
                          <p className="text-xs text-text-secondary">Costo: ${(product.cost * ing.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            className="h-8 w-20 text-right text-sm"
                            value={ing.quantity}
                            onChange={e => updateIngredientQuantity(ing.productId, Number(e.target.value))}
                          />
                          <span className="text-xs text-text-secondary w-8">{ing.unit}</span>
                          <button 
                            type="button"
                            onClick={() => removeIngredient(ing.productId)}
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
                  <span className="font-mono font-medium">${sellingPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-primary/20 pt-2 mt-2">
                  <span className="text-text-secondary">Margen de Ganancia:</span>
                  <span className={`font-mono font-bold ${profitMargin < 30 ? 'text-danger' : 'text-success'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
                {profitMargin < 30 && sellingPrice > 0 && (
                  <p className="text-xs text-danger flex items-center gap-1 mt-2">
                    <AlertCircle className="h-3 w-3" />
                    El margen es menor al 30% recomendado para gastronomía.
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full">
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
                  const product = products.find(p => p.id === ing.productId);
                  return sum + ((product?.cost || 0) * ing.quantity);
                }, 0);
                const margin = recipe.sellingPrice > 0 ? ((recipe.sellingPrice - cost) / recipe.sellingPrice) * 100 : 0;

                return (
                  <div key={recipe.id} className="relative rounded-xl border border-border bg-bg p-4 transition-colors hover:border-primary/50">
                    <button 
                      onClick={() => {
                        if(window.confirm('¿Seguro que deseas eliminar esta receta?')) {
                          deleteRecipe(recipe.id);
                          toast.success('Receta eliminada exitosamente');
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
                        <p className="text-xs text-text-secondary">Venta</p>
                        <p className="font-mono font-medium text-primary">${recipe.sellingPrice.toFixed(2)}</p>
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
                          const product = products.find(p => p.id === ing.productId);
                          return (
                            <span key={ing.productId} className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs text-text-secondary">
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
