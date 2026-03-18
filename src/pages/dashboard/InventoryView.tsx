import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { PackagePlus, ArrowRightLeft, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  "Bebidas y Refrescos",
  "Lácteos y Quesos",
  "Carnes y Embutidos",
  "Pescados y Mariscos",
  "Frutas y Verduras",
  "Panadería y Dulces",
  "Enlatados y Conservas",
  "Galletas y Snacks",
  "Granos y Cereales",
  "Condimentos y Salsas",
  "Limpieza y Hogar",
  "Otros"
];

export default function InventoryView() {
  const { user } = useAuthStore();
  const { products, addProduct, addMovement } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const existingCategories = Array.from(new Set(activeProducts.map(p => p.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories])).sort();

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    unit: 'unidades',
    quantity: 0,
    price: 0,
    cost: 0,
    stock_min: 0,
    stock_max: 0,
    expiration_date: '',
    description: '',
    is_individual: false,
    eoq: 0,
    rop: 0,
    lead_time: 0,
    order_cost: 0,
    holding_cost: 0,
  });

  const [movement, setMovement] = useState({
    type: 'ENTRADA' as 'ENTRADA' | 'SALIDA' | 'MERMA',
    product_id: '',
    quantity: 0,
    unit: 'unidades',
    date: new Date().toISOString(),
    cost: 0,
    reason: '',
    status: 'NORMAL' as 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO',
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await addProduct({
      ...newProduct,
      is_active: true,
    });
    
    setNewProduct({
      name: '', category: '', unit: 'unidades', quantity: 0, price: 0, cost: 0,
      stock_min: 0, stock_max: 0, expiration_date: '', description: '', is_individual: false,
      eoq: 0, rop: 0, lead_time: 0, order_cost: 0, holding_cost: 0,
    });
    setIsCustomCategory(false);
    toast.success('Producto agregado exitosamente');
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !movement.product_id) return;

    const product = products.find(p => p.id === movement.product_id);
    const isAnomaly = movement.type === 'SALIDA' && product && movement.quantity > (Number(product.quantity) * 0.5);

    await addMovement({
      ...movement,
      quantity: Number(movement.quantity),
      cost: Number(movement.cost) || (product ? Number(product.cost) : 0),
      status: isAnomaly ? 'ANOMALIA' : 'NORMAL',
    });

    setMovement({
      type: 'ENTRADA',
      product_id: '',
      quantity: 0,
      unit: 'unidades',
      date: new Date().toISOString(),
      cost: 0,
      reason: '',
      status: 'NORMAL',
    });
    toast.success('Movimiento registrado exitosamente');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Gestión de Inventario</h1>
        <p className="text-sm text-text-secondary">
          Alta de productos y registro de movimientos
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <PackagePlus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Alta de Producto</h2>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input id="name" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                {!isCustomCategory ? (
                  <select
                    id="category"
                    required
                    className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newProduct.category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomCategory(true);
                        setNewProduct({ ...newProduct, category: '' });
                      } else {
                        setNewProduct({ ...newProduct, category: e.target.value });
                      }
                    }}
                  >
                    <option value="" disabled>Seleccione una categoría...</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ Agregar nueva categoría...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      id="custom_category" 
                      required 
                      placeholder="Nueva categoría"
                      value={newProduct.category} 
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                      autoFocus
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsCustomCategory(false);
                        setNewProduct({ ...newProduct, category: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad Inicial *</Label>
                <Input id="quantity" type="number" min="0" step="0.01" required value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad *</Label>
                <select 
                  id="unit" 
                  className="flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newProduct.unit}
                  onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                >
                  <option value="unidades">Unidades</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="g">Gramos (g)</option>
                  <option value="Lb">Libras (Lb)</option>
                  <option value="L">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cost">Costo Unitario *</Label>
                <Input id="cost" type="number" min="0" step="0.01" required value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_min">Stock Mínimo *</Label>
                <Input id="stock_min" type="number" min="0" step="0.01" required value={newProduct.stock_min} onChange={e => setNewProduct({...newProduct, stock_min: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_max">Stock Máximo *</Label>
                <Input id="stock_max" type="number" min="0" step="0.01" required value={newProduct.stock_max} onChange={e => setNewProduct({...newProduct, stock_max: Number(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <textarea 
                id="description" 
                rows={2}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={newProduct.description}
                onChange={e => setNewProduct({...newProduct, description: e.target.value})}
              />
            </div>

            <div className="space-y-4 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_individual" 
                  className="h-4 w-4 rounded border-border bg-bg text-primary focus:ring-primary"
                  checked={newProduct.is_individual}
                  onChange={e => setNewProduct({...newProduct, is_individual: e.target.checked})}
                />
                <Label htmlFor="is_individual" className="cursor-pointer">¿Se vende individualmente?</Label>
              </div>
              
              {newProduct.is_individual && (
                <div className="space-y-2 sm:w-1/2">
                  <Label htmlFor="price">Precio de Venta *</Label>
                  <Input id="price" type="number" min="0" step="0.01" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                </div>
              )}
            </div>

            <div className="pt-4">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Settings2 className="h-4 w-4" />
                {showAdvanced ? 'Ocultar Parámetros Avanzados' : 'Mostrar Parámetros Avanzados (EOQ, ROP)'}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid gap-4 rounded-lg border border-border bg-bg/50 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="eoq" className="text-xs">EOQ (Cant. Económica)</Label>
                  <Input id="eoq" type="number" min="0" value={newProduct.eoq} onChange={e => setNewProduct({...newProduct, eoq: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rop" className="text-xs">ROP (Punto Reorden)</Label>
                  <Input id="rop" type="number" min="0" value={newProduct.rop} onChange={e => setNewProduct({...newProduct, rop: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead_time" className="text-xs">Lead Time (días)</Label>
                  <Input id="lead_time" type="number" min="0" value={newProduct.lead_time} onChange={e => setNewProduct({...newProduct, lead_time: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order_cost" className="text-xs">Costo de Pedido</Label>
                  <Input id="order_cost" type="number" min="0" value={newProduct.order_cost} onChange={e => setNewProduct({...newProduct, order_cost: Number(e.target.value)})} />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-6">
              Agregar Producto
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
          <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Registrar Movimiento</h2>
          </div>

          <form onSubmit={handleAddMovement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mov_type">Tipo de Movimiento *</Label>
              <select 
                id="mov_type" 
                className="flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={movement.type}
                onChange={e => setMovement({...movement, type: e.target.value as any})}
              >
                <option value="ENTRADA">Entrada (Aumenta Stock)</option>
                <option value="SALIDA">Salida (Disminuye Stock)</option>
                <option value="MERMA">Merma (Pérdida/Desperdicio)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mov_product">Producto *</Label>
              <select 
                id="mov_product" 
                required
                className="flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={movement.product_id}
                onChange={e => {
                  const prod = products.find(p => p.id === e.target.value);
                  setMovement({
                    ...movement, 
                    product_id: e.target.value,
                    unit: prod ? prod.unit : 'unidades'
                  });
                }}
              >
                <option value="">Seleccione un producto...</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity} {p.unit})</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mov_qty">Cantidad *</Label>
                <div className="relative">
                  <Input id="mov_qty" type="number" min="0.01" step="0.01" required value={movement.quantity} onChange={e => setMovement({...movement, quantity: Number(e.target.value)})} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    {movement.unit}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov_date">Fecha *</Label>
                <Input id="mov_date" type="datetime-local" required value={movement.date.slice(0, 16)} onChange={e => setMovement({...movement, date: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mov_cost">Costo Total del Movimiento (Opcional)</Label>
              <Input id="mov_cost" type="number" min="0" step="0.01" value={movement.cost} onChange={e => setMovement({...movement, cost: Number(e.target.value)})} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mov_reason">Razón / Motivo (Opcional)</Label>
              <textarea 
                id="mov_reason" 
                rows={3}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={movement.reason}
                onChange={e => setMovement({...movement, reason: e.target.value})}
                placeholder={movement.type === 'MERMA' ? 'Ej: Producto caducado, daño en almacén...' : 'Ej: Compra a proveedor, ajuste de inventario...'}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6"
              variant={movement.type === 'ENTRADA' ? 'default' : movement.type === 'SALIDA' ? 'secondary' : 'destructive'}
            >
              Registrar {movement.type}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
