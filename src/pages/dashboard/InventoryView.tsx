import React, { useState, useMemo, useEffect } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { PackagePlus, ArrowRightLeft, RefreshCw, ChevronLeft, ChevronRight, ArrowLeftRight, X } from 'lucide-react';
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
import { validateNumber, getNumberFromString } from '../../lib/utils';

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
  const { products, addProduct, addMovement, logAction, warehouses, currentWarehouseId, productWarehouse, updateProductWarehouseQuantity, set, transitItems } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

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
    is_consumo_directo: false,
    is_gasto_variable: false,
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
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19),
    cost: 0,
    reason: '',
    note: '',
    status: 'NORMAL' as 'NORMAL' | 'ANOMALIA' | 'JUSTIFICADO',
    warehouse_id: currentWarehouseId || '',
  });
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    product_id: '',
    to_warehouse_id: '',
    quantity: '',
    unit: 'und',
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Sincronizar warehouse_id del formulario con el almacén global seleccionado
  useEffect(() => {
    if (currentWarehouseId) {
      setMovement(prev => ({ ...prev, warehouse_id: currentWarehouseId }));
    }
  }, [currentWarehouseId]);

  // Validación para el botón de transferir
  const isTransferValid = (() => {
    if (!transferData.product_id || !transferData.to_warehouse_id || !transferData.quantity) return false;
    const product = products.find(p => p.id === transferData.product_id);
    const sourcePw = productWarehouse.find(pw => pw.product_id === transferData.product_id && pw.warehouse_id === currentWarehouseId);
    const sourceQty = sourcePw?.quantity ?? product?.quantity ?? 0;
    const transferQty = parseFloat(transferData.quantity) || 0;
    return transferQty > 0 && transferQty <= sourceQty;
  })();

  const handleAddProduct = async (e: React.FormEvent) => {
    if (isSubmittingProduct) return; // Evitar múltiples clics
    setIsSubmittingProduct(true);
    e.preventDefault();
    if (!user) return;
    
    const costValidation = validateNumber(String(newProduct.cost), { required: true, min: 0.01, fieldName: 'Costo unitario' });
    if (!costValidation.isValid) {
      toast.error(costValidation.error);
      setIsSubmittingProduct(false);
      return;
    }
    
    if (newProduct.is_individual) {
      const priceValidation = validateNumber(String(newProduct.price), { required: true, min: 0.01, fieldName: 'Precio de venta' });
      if (!priceValidation.isValid) {
        toast.error(priceValidation.error);
        setIsSubmittingProduct(false);
        return;
      }
    }
    
    // Validar que solo se pueda crear productos con el almacén principal seleccionado
    const currentWarehouse = warehouses.find(w => w.id === currentWarehouseId);
    if (currentWarehouse && !currentWarehouse.is_main) {
      toast.error('Solo puedes crear productos cuando el almacén principal está seleccionado');
      setIsSubmittingProduct(false);
      return;
    }
    
    try {
      await addProduct({
        ...newProduct,
        is_active: true,
      });
      
      await useDatabaseStore.getState().logAction('inventory', 'CREAR', {
        product_name: newProduct.name,
        category: newProduct.category,
        quantity: newProduct.quantity,
        unit: newProduct.unit
      });
      
      setNewProduct({
        name: '', category: '', unit: 'u', quantity: 0, price: 0, cost: 0,
        rop: 0, eoq: 0, expiration_date: '', description: '', is_individual: false,
        is_consumo_directo: false, is_gasto_variable: false,
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
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const convertToUTC = (dateStr: string) => {
    return new Date(dateStr).toISOString();
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingMovement) return; // Evitar múltiples clics
    
    if (!user) return;
    if (!movement.product_id) {
      toast.error('Debe seleccionar un producto');
      return;
    }

    const quantityValidation = validateNumber(String(movement.quantity), { required: true, min: 0.0001, fieldName: 'Cantidad' });
    if (!quantityValidation.isValid) {
      toast.error(quantityValidation.error);
      return;
    }

    // Validar nota obligatoria para CONSUMO_DIRECTO
    if (movement.type === 'CONSUMO_DIRECTO' && !movement.note.trim()) {
      toast.error('La nota es obligatoria para Consumo Directo');
      return;
    }

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
    
    // SALIDA requiere validación de stock (usar product_warehouse.quantity como source of truth)
    if (movement.type === 'SALIDA') {
      const pw = productWarehouse.find(
        pw => pw.product_id === movement.product_id && pw.warehouse_id === movement.warehouse_id
      );
      const availableStock = pw ? Number(pw.quantity) : Number(product.quantity);
      if (quantityInBase > availableStock) {
        toast.error(`La cantidad excede el stock disponible (${availableStock} ${baseUnit})`);
        return;
      }
    }

    setIsSubmittingMovement(true);
    try {
      const isConsumoDirecto = product.is_consumo_directo === true;
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
        note: isConsumoDirecto ? (movement.note || null) : null,
        status: isAnomaly ? 'ANOMALIA' : 'NORMAL',
        date: convertToUTC(movement.date),
        warehouse_id: movement.warehouse_id || currentWarehouseId || null,
      };

      await addMovement(movementData);
      
      await useDatabaseStore.getState().logAction('movements', movement.type, {
        product_name: product.name,
        quantity: movement.quantity,
        unit: movement.displayUnit,
        reason: movement.reason,
        note: movement.note
      });
      
      saveLastUsedUnit(movement.product_id, movement.displayUnit);

      setMovement({
        type: 'ENTRADA',
        product_id: '',
        quantity: 0,
        unit: 'u',
        displayUnit: 'u',
        date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19),
        cost: 0,
        reason: '',
        note: '',
        status: 'NORMAL',
        warehouse_id: currentWarehouseId || '',
      });
      toast.success('Movimiento registrado exitosamente');
    } catch (error: any) {
      console.error('Error al registrar movimiento:', error);
      toast.error(error.message || 'Error al registrar movimiento');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTransfer || !currentWarehouseId || !transferData.product_id || !transferData.to_warehouse_id || !transferData.quantity) {
      return;
    }

    setIsSubmittingTransfer(true);

    try {
      const qtyValidation = validateNumber(transferData.quantity, { required: true, min: 0.01, fieldName: 'Cantidad' });
      if (!qtyValidation.isValid) {
        toast.error(qtyValidation.error);
        setIsSubmittingTransfer(false);
        return;
      }

      const quantity = parseFloat(transferData.quantity);
      const product = products.find(p => p.id === transferData.product_id);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      const sourceWarehouse = warehouses.find(w => w.id === currentWarehouseId);
      const destWarehouse = warehouses.find(w => w.id === transferData.to_warehouse_id);

      // Get current quantity from product_warehouse or fallback to product.quantity
      const pwSource = productWarehouse.find(pw => pw.product_id === product.id && pw.warehouse_id === currentWarehouseId);
      const sourceQty = pwSource?.quantity ?? product.quantity ?? 0;

      if (quantity > sourceQty) {
        throw new Error(`Cantidad excede el stock disponible (${sourceQty})`);
      }

      // Get destination current quantity
      const pwDest = productWarehouse.find(pw => pw.product_id === product.id && pw.warehouse_id === transferData.to_warehouse_id);
      const destQty = pwDest?.quantity ?? 0;

      // Update both warehouses (skip auto-heal to avoid overwriting transfer)
      await updateProductWarehouseQuantity(product.id, currentWarehouseId, sourceQty - quantity, true);
      await updateProductWarehouseQuantity(product.id, transferData.to_warehouse_id, destQty + quantity, true);
      
      // Update local products state to reflect the transfer
      useDatabaseStore.setState((state) => ({
        products: state.products.map(p => 
          p.id === product.id ? { ...p, quantity: sourceQty - quantity } : p
        ),
        productWarehouse: state.productWarehouse.map(pw => {
          if (pw.product_id === product.id && pw.warehouse_id === currentWarehouseId) {
            return { ...pw, quantity: sourceQty - quantity };
          }
          if (pw.product_id === product.id && pw.warehouse_id === transferData.to_warehouse_id) {
            return { ...pw, quantity: destQty + quantity };
          }
          return pw;
        })
      }));

      // Create TRANSFER movement for origin warehouse (salida)
      await addMovement({
        product_id: product.id,
        type: 'TRANSFER',
        quantity: quantity,
        unit: transferData.unit || 'und',
        cost: Number(product.cost) || 0,
        reason: `Transferencia a ${destWarehouse?.name}`,
        status: 'NORMAL',
        date: new Date().toISOString(),
        warehouse_id: currentWarehouseId,
      });

      // Create TRANSFER movement for destination warehouse (entrada)
      await addMovement({
        product_id: product.id,
        type: 'TRANSFER',
        quantity: quantity,
        unit: transferData.unit || 'und',
        cost: Number(product.cost) || 0,
        reason: `Transferencia desde ${sourceWarehouse?.name}`,
        status: 'NORMAL',
        date: new Date().toISOString(),
        warehouse_id: transferData.to_warehouse_id,
      });

      // Log the transfer
      await logAction('TRANSFER', `Transferencia: ${product.name} (${quantity} ${transferData.unit}) de ${sourceWarehouse?.name} a ${destWarehouse?.name}`);

      toast.success(`Transferencia realizada: ${quantity} ${transferData.unit} de ${sourceWarehouse?.name} a ${destWarehouse?.name}`);
      setShowTransferModal(false);
      setTransferData({ product_id: '', to_warehouse_id: '', quantity: '', unit: 'und' });
    } catch (error: any) {
      console.error('Error en transferencia:', error);
      toast.error(error.message || 'Error al realizar transferencia');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Gestión de Inventario</h1>
          <p className="text-sm text-text-secondary">
            Alta de productos y registro de movimientos
          </p>
        </div>
        {warehouses.length > 1 && currentWarehouseId && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowTransferModal(true)}
            className="gap-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transferir
          </Button>
        )}
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
                <Label htmlFor={!isCustomCategory ? "category" : "custom_category"}>Categoría *</Label>
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
                  {Object.entries(UNIT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
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
                <Label htmlFor="is_individual" className="cursor-pointer">Se vende individualmente</Label>
              </div>
              <p className="text-xs text-text-secondary pl-6">Ej: Bebidas, postres, platos (se asigna un precio de venta por unidad)</p>
              
              {newProduct.is_individual && (
                <div className="space-y-2 sm:w-1/2">
                  <Label htmlFor="price">Precio de Venta *</Label>
                  <Input id="price" type="number" min="0.01" step="0.01" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_consumo_directo" 
                  className="h-4 w-4 rounded border-border bg-bg text-primary focus:ring-primary"
                  checked={newProduct.is_consumo_directo}
                  onChange={e => setNewProduct({...newProduct, is_consumo_directo: e.target.checked})}
                />
                <Label htmlFor="is_consumo_directo" className="cursor-pointer">Producto de consumo directo</Label>
              </div>
              <p className="text-xs text-text-secondary pl-6">Ej: Sal, orégano, especias (se registra al final del día por peso)</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_gasto_variable" 
                  className="h-4 w-4 rounded border-border bg-bg text-primary focus:ring-primary"
                  checked={newProduct.is_gasto_variable}
                  onChange={e => setNewProduct({...newProduct, is_gasto_variable: e.target.checked})}
                />
                <Label htmlFor="is_gasto_variable" className="cursor-pointer">Gasto variable</Label>
              </div>
              <p className="text-xs text-text-secondary pl-6">Ej: Servilletas, carbón, gasolina (se registra el gasto manualmente desde Tránsito)</p>
            </div>

            

            <Button type="submit" className="mt-6 px-8" disabled={isSubmittingProduct}>
              {isSubmittingProduct ? 'Agregando...' : 'Agregar Producto'}
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
                <option value="SALIDA">Salida (Hacia Tránsito/Cocina)</option>
                <option value="MERMA">Merma (Pérdida/Desperdicio)</option>
              </select>
            </div>

            {warehouses.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="mov_warehouse">Almacén *</Label>
                <select 
                  id="mov_warehouse" 
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={movement.warehouse_id}
                  onChange={e => setMovement({...movement, warehouse_id: e.target.value})}
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.is_main ? '(Principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                {activeProducts
                  .map(p => {
                    const activeWarehouseId = movement.warehouse_id || currentWarehouseId;
                    const warehouseStock = activeWarehouseId 
                      ? productWarehouse.find(pw => pw.product_id === p.id && pw.warehouse_id === activeWarehouseId)
                      : null;
                    
                    const computedInTransit = activeWarehouseId
                      ? transitItems
                        .filter(t => t.product_id === p.id && t.warehouse_id === activeWarehouseId)
                        .reduce((sum, t) => sum + t.remaining, 0)
                      : 0;
                    const availableStock = warehouseStock 
                      ? Number(warehouseStock.quantity)
                      : 0;
                    
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {availableStock} {p.unit})
                        {!warehouseStock && currentWarehouseId && ' [Sin datos en almacén]'}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="grid gap-4 grid-cols-2">
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
                <Input id="mov_date" type="datetime-local" required value={movement.date.slice(0, 16)} onChange={e => { const val = e.target.value; setMovement({...movement, date: val.length <= 16 ? val + ':00' : val}); }} />
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
              className="mt-6 px-8 gap-2"
              variant={movement.type === 'MERMA' ? 'destructive' : 'default'}
              disabled={isSubmittingMovement}
            >
              {isSubmittingMovement && <RefreshCw className="h-4 w-4 animate-spin" />}
              {isSubmittingMovement 
                ? 'Registrando...' 
                : movement.type === 'ENTRADA' 
                  ? 'Registrar Entrada' 
                  : movement.type === 'SALIDA' 
                    ? 'Registrar Salida' 
                    : 'Registrar Merma'}
            </Button>
          </form>
        </div>
      </div>

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl border border-border">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Transferir entre Almacenes
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-text-secondary hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="space-y-2">
                <Label>Almacén Origen</Label>
                <Input value={warehouses.find(w => w.id === currentWarehouseId)?.name || ''} disabled className="bg-bg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer_product">Producto *</Label>
                <select
                  id="transfer_product"
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={transferData.product_id}
                  onChange={(e) => setTransferData({...transferData, product_id: e.target.value})}
                >
                  <option value="">Seleccionar producto...</option>
                  {activeProducts.map(p => {
                    const pw = productWarehouse.find(pw => pw.product_id === p.id && pw.warehouse_id === currentWarehouseId);
                    const qty = pw?.quantity ?? p.quantity ?? 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {qty})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer_dest">Almacén Destino *</Label>
                <select
                  id="transfer_dest"
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={transferData.to_warehouse_id}
                  onChange={(e) => setTransferData({...transferData, to_warehouse_id: e.target.value})}
                >
                  <option value="">Seleccionar almacén...</option>
                  {warehouses.filter(w => w.id !== currentWarehouseId).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer_qty">Cantidad *</Label>
                <Input
                  id="transfer_qty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Cantidad a transferir"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({...transferData, quantity: e.target.value})}
                />
              </div>

              {/* Preview del stock después de la transferencia */}
              {transferData.product_id && transferData.to_warehouse_id && transferData.quantity && (
                <div className="p-3 bg-bg/50 rounded-lg border border-border/50">
                  <p className="text-sm font-medium text-text mb-2">Previsualización:</p>
                  {(() => {
                    const product = products.find(p => p.id === transferData.product_id);
                    const sourcePw = productWarehouse.find(pw => pw.product_id === transferData.product_id && pw.warehouse_id === currentWarehouseId);
                    const destPw = productWarehouse.find(pw => pw.product_id === transferData.product_id && pw.warehouse_id === transferData.to_warehouse_id);
                    const sourceQty = sourcePw?.quantity ?? product?.quantity ?? 0;
                    const destQty = destPw?.quantity ?? 0;
                    const transferQty = parseFloat(transferData.quantity) || 0;
                    const sourceAfter = sourceQty - transferQty;
                    const destAfter = destQty + transferQty;
                    const sourceWarehouse = warehouses.find(w => w.id === currentWarehouseId);
                    const destWarehouse = warehouses.find(w => w.id === transferData.to_warehouse_id);
                    const isValid = transferQty > 0 && transferQty <= sourceQty;
                    
                    return (
                      <div className="space-y-1 text-sm">
                        <p className={isValid ? 'text-text-secondary' : 'text-danger font-medium'}>
                          {sourceWarehouse?.name}: {sourceQty} → {sourceAfter} ({isValid ? `-${transferQty}` : 'Sin stock'})
                        </p>
                        <p className="text-text-secondary">
                          {destWarehouse?.name}: {destQty} → {destAfter} (+{transferQty})
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmittingTransfer || !isTransferValid}>
                  {isSubmittingTransfer && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Transferir
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
