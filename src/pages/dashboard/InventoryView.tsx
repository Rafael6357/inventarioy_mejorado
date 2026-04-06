import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { PackagePlus, ArrowRightLeft, Settings2 } from 'lucide-react';
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

  const normalizeStr = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const existingCategories = Array.from(
    new Set(
      activeProducts
        .map(p => p.category)
        .filter(Boolean)
        .map(c => normalizeStr(c))
    )
  );
  const allCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES.map(c => normalizeStr(c)),
      ...existingCategories
    ])
  ).sort().map(c => c.charAt(0).toUpperCase() + c.slice(1));

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    unit: 'u',
    quantity: 0,
    price: 0,
    cost: 0,
    rop: 0,
    eoq: 0,
    expiration_date: '',
    description: '',
    is_individual: false,
    lead_time: 0,
    order_cost: 0,
    holding_cost: 0,
  });

  const [movement, setMovement] = useState({
    type: 'ENTRADA' as 'ENTRADA' | 'SALIDA' | 'MERMA',
    product_id: '',
    quantity: 0,
    unit: 'u' as UnitAbbrev,
    displayUnit: 'u' as UnitAbbrev,
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    cost: 0,
    reason: '',
    status: 'NORMAL' as 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO',
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await addProduct({
        ...newProduct,
        is_active: true,
      });
      
      setNewProduct({
        name: '', category: '', unit: 'unidades', quantity: 0, price: 0, cost: 0,
        rop: 0, eoq: 0, expiration_date: '', description: '', is_individual: false,
        lead_time: 0, order_cost: 0, holding_cost: 0,
      });
      setIsCustomCategory(false);
      toast.success('Producto agregado exitosamente');
    } catch (error: any) {
      if (error.message?.includes("ya existe")) {
        toast.warning(error.message);
      } else {
        toast.error(error.message || 'Error al agregar producto');
      }
    }
  };

  const convertToUTC = (dateStr: string) => {
    return new Date(dateStr).toISOString();
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !movement.product_id) return;

    try {
      const product = products.find(p => p.id === movement.product_id);
      if (!product) {
        toast.error('Producto no encontrado');
        return;
      }
      
      const baseUnit = normalizeUnit(product.unit);
      const quantityInBase = convertUnit(movement.quantity, movement.displayUnit, baseUnit);
      
      if (quantityInBase <= 0) {
        toast.error('La cantidad debe ser mayor a 0');
        return;
      }
      
      if (movement.type === 'SALIDA') {
        const availableStock = Number(product.quantity) - (Number(product.in_transit) || 0);
        if (quantityInBase > availableStock) {
          toast.error(`La cantidad excede el stock disponible (${availableStock} ${baseUnit})`);
          return;
        }
      }
      
      const isAnomaly = movement.type === 'SALIDA' && quantityInBase > (Number(product.quantity) * 0.5);

      const movementCost = movement.type === 'ENTRADA' 
        ? Number(movement.cost) 
        : Number(product.cost);

      const movementData = {
        product_id: movement.product_id,
        type: movement.type,
        quantity: quantityInBase,
        unit: baseUnit,
        cost: movementCost,
        reason: movement.reason || null,
        status: isAnomaly ? 'ANOMALIA' : 'NORMAL',
        date: convertToUTC(movement.date),
      };

      await addMovement(movementData);
      
      saveLastUsedUnit(movement.product_id, movement.displayUnit);

      setMovement({
        type: 'ENTRADA',
        product_id: '',
        quantity: 0,
        unit: 'u',
        displayUnit: 'u',
        date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        cost: 0,
        reason: '',
        status: 'NORMAL',
      });
      toast.success('Movimiento registrado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar movimiento');
    }
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
                  <option value="u">Unidades (u)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="g">Gramos (g)</option>
                  <option value="lb">Libras (lb)</option>
                  <option value="oz">Onzas (oz)</option>
                  <option value="L">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="gal">Galones (gal)</option>
                  <option value="fl oz">Onzas líquidas (fl oz)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Costo Unitario *</Label>
              <Input 
                id="cost" 
                type="number" 
                min="0.01" 
                step="0.01" 
                required 
                value={newProduct.cost} 
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val >= 0) setNewProduct({...newProduct, cost: val});
                }} 
              />
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
                {showAdvanced ? 'Ocultar Parámetros Avanzados' : 'Mostrar Parámetros Avanzados (ROP, EOQ)'}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid gap-4 rounded-lg border border-border bg-bg/50 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rop" className="text-xs">ROP (Punto de Reorden)</Label>
                  <Input id="rop" type="number" min="0" value={newProduct.rop} onChange={e => setNewProduct({...newProduct, rop: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eoq" className="text-xs">EOQ (Cant. Económica)</Label>
                  <Input id="eoq" type="number" min="0" value={newProduct.eoq} onChange={e => setNewProduct({...newProduct, eoq: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead_time" className="text-xs">Tiempo de Entrega (días)</Label>
                  <Input id="lead_time" type="number" min="0" value={newProduct.lead_time} onChange={e => setNewProduct({...newProduct, lead_time: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order_cost" className="text-xs">Costo de Pedido</Label>
                  <Input id="order_cost" type="number" min="0" value={newProduct.order_cost} onChange={e => setNewProduct({...newProduct, order_cost: Number(e.target.value)})} />
                </div>
              </div>
            )}

            <Button type="submit" className="mt-6 px-8">
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
                  if (!prod) return;
                  
                  const baseUnit = normalizeUnit(prod.unit);
                  const compatibleUnits = getCompatibleUnits(baseUnit);
                  const savedUnit = getLastUsedUnit(prod.id);
                  const defaultUnit = savedUnit && compatibleUnits.includes(savedUnit) ? savedUnit : baseUnit;
                  
                  setMovement(prev => ({
                    ...prev, 
                    product_id: e.target.value,
                    unit: baseUnit,
                    displayUnit: defaultUnit,
                    cost: Number(prod.cost),
                  }));
                }}
              >
                <option value="">Seleccione un producto...</option>
                {activeProducts.map(p => {
                  const availableStock = Number(p.quantity) - (Number(p.in_transit) || 0);
                  return (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {availableStock} {p.unit})</option>
                  );
                })}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mov_qty">Cantidad *</Label>
                <Input 
                  id="mov_qty" 
                  type="number" 
                  min="0.0001" 
                  step="any"
                  required 
                  value={movement.quantity} 
                  onChange={e => setMovement({...movement, quantity: Number(e.target.value)})} 
                  className="no-spin"
                  placeholder="Ej: 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov_unit">Unidad</Label>
                <select
                  id="mov_unit"
                  value={movement.displayUnit}
                  onChange={e => {
                    const newUnit = e.target.value as UnitAbbrev;
                    const convertedQty = convertUnit(movement.quantity, movement.displayUnit, newUnit);
                    setMovement({...movement, displayUnit: newUnit, quantity: convertedQty});
                  }}
                  disabled={getCompatibleUnits(movement.unit).length <= 1}
                  className="h-10 w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getCompatibleUnits(movement.unit).map((u) => (
                    <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov_date">Fecha *</Label>
                <Input id="mov_date" type="datetime-local" required value={movement.date.slice(0, 16)} onChange={e => setMovement({...movement, date: e.target.value})} />
              </div>
            </div>

            {movement.type === 'ENTRADA' && (
              <div className="space-y-2">
                <Label htmlFor="mov_cost">Costo Unitario *</Label>
                <Input id="mov_cost" type="number" min="0" step="0.01" required value={movement.cost} onChange={e => setMovement({...movement, cost: Number(e.target.value)})} />
              </div>
            )}

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
              className="mt-6 px-8"
              variant={movement.type === 'MERMA' ? 'destructive' : 'default'}
            >
              {movement.type === 'ENTRADA' ? 'Registrar Entrada' : movement.type === 'SALIDA' ? 'Registrar Salida' : 'Registrar Merma'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
