import { useState, useMemo } from 'react';
import { Search, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Trash2, Filter, Pencil, X, Settings2 } from 'lucide-react';
import { useDatabaseStore } from '../../store/dbStore';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function StockView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [productToDelete, setProductToDelete] = useState<{id: string, name: string} | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editParams, setEditParams] = useState({
    rop: 0,
    eoq: 0,
    lead_time: 0,
    order_cost: 0,
    holding_cost: 0,
  });
  
  const products = useDatabaseStore((state) => state.products);
  const movements = useDatabaseStore((state) => state.movements);
  const deleteProduct = useDatabaseStore((state) => state.deleteProduct);
  const updateProduct = useDatabaseStore((state) => state.updateProduct);

  const activeProducts = useMemo(() => {
    return products.filter(p => p.is_active !== false);
  }, [products]);

  const lastMovementDates = useMemo(() => {
    const dates: Record<string, string> = {};
    movements.forEach(m => {
      if (!dates[m.product_id] || new Date(m.date) > new Date(dates[m.product_id])) {
        dates[m.product_id] = m.date;
      }
    });
    return dates;
  }, [movements]);

  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
      
              let matchesStatus = true;
      const physicalStock = Number(product.quantity) - (Number(product.in_transit) || 0);
      if (statusFilter === 'LOW_STOCK') {
        matchesStatus = physicalStock <= product.rop && physicalStock > 0;
      } else if (statusFilter === 'OUT_OF_STOCK') {
        matchesStatus = physicalStock <= 0;
      } else if (statusFilter === 'OPTIMAL') {
        matchesStatus = physicalStock > product.rop;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeProducts, searchTerm, categoryFilter, statusFilter]);

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete.id);
        toast.success('Producto eliminado exitosamente');
      } catch (err) {
        toast.error((err as Error).message || 'Error al eliminar el producto');
      }
      setProductToDelete(null);
    }
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setEditParams({
      rop: Number(product.rop) || 0,
      eoq: Number(product.eoq) || 0,
      lead_time: Number(product.lead_time) || 0,
      order_cost: Number(product.order_cost) || 0,
      holding_cost: Number(product.holding_cost) || 0,
    });
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditParams({ rop: 0, eoq: 0, lead_time: 0, order_cost: 0, holding_cost: 0 });
  };

  const handleSaveParams = async () => {
    if (!editingProduct) return;
    
    const updates = {
      rop: Math.max(0, editParams.rop),
      eoq: Math.max(0, editParams.eoq),
      lead_time: Math.max(0, editParams.lead_time),
      order_cost: Math.max(0, editParams.order_cost),
      holding_cost: Math.max(0, editParams.holding_cost),
    };

    try {
      await updateProduct(editingProduct.id, updates);
      toast.success('Parámetros actualizados exitosamente');
      closeEditModal();
    } catch (err) {
      toast.error((err as Error).message || 'Error al actualizar los parámetros');
    }
  };

  const hasConfiguredParams = (product: any) => {
    return (
      Number(product.rop) > 0 ||
      Number(product.eoq) > 0 ||
      Number(product.lead_time) > 0 ||
      Number(product.order_cost) > 0 ||
      Number(product.holding_cost) > 0
    );
  };

  const totalInventoryValue = useMemo(() => {
    return filteredProducts.reduce((total, product) => {
      const inTransit = Number(product.in_transit) || 0;
      const availableStock = Number(product.quantity) - inTransit;
      return total + (availableStock * Number(product.cost));
    }, 0);
  }, [filteredProducts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Stock Actual</h1>
          <p className="text-sm text-text-secondary">
            Vista rápida del inventario en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-text-secondary uppercase tracking-wider">Valor Total</p>
            <p className="text-xl font-bold text-primary font-mono">${totalInventoryValue.toFixed(2)}</p>
          </div>
          <div className="h-8 w-px bg-border/50 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard/inventory">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                Entrada
              </Button>
            </Link>
            <Link to="/dashboard/inventory">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                Salida
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-1 gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <select
                className="h-10 w-full appearance-none rounded-xl border border-border bg-bg pl-9 pr-4 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <select
              className="h-10 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="OPTIMAL">Óptimo</option>
              <option value="LOW_STOCK">Stock Bajo</option>
              <option value="OUT_OF_STOCK">Sin Stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
            <thead className="border-b border-border/50 bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium text-right">Disponible</th>
                <th className="px-4 py-3 font-medium text-right">En Transito</th>
                <th className="px-4 py-3 font-medium text-right">Costo Unitario</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Unidad de Medida</th>
                <th className="px-4 py-3 font-medium">Parámetros</th>
                <th className="px-4 py-3 font-medium">Fecha Última Actualización</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const inTransit = Number(product.in_transit) || 0;
                  const physicalStock = Number(product.quantity) - inTransit;
                  const isOutOfStock = physicalStock <= 0;
                  const isLowStock = physicalStock <= Number(product.rop) && !isOutOfStock;
                  const lastUpdate = lastMovementDates[product.id];
                  const isConfigured = hasConfiguredParams(product);
                  
                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-surface-hover ${
                        isOutOfStock ? 'bg-danger/10' : isLowStock ? 'bg-warning/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {product.name}
                          {isConfigured && (
                            <span title="Parámetros configurados">
                              <Settings2 className="h-4 w-4 text-primary drop-shadow-[0_0_4px_rgba(205,164,52,0.8)]" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{product.category}</td>
                      <td className="px-4 py-3">
                        {product.is_individual ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            Individual
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-1 text-xs font-medium text-text-secondary">
                            Ingrediente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {Number(physicalStock).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {inTransit > 0 ? (
                          <span className="text-warning" title="En transito a produccion">{Number(inTransit).toFixed(4)}</span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ${Number(product.cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                        ${(physicalStock * Number(product.cost)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3">
                        {isConfigured ? (
                          <div className="flex flex-wrap gap-1 text-xs">
                            <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-primary" title="ROP">
                              ROP: {product.rop}
                            </span>
                            <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-primary" title="EOQ">
                              EOQ: {product.eoq}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary">Sin configurar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {lastUpdate ? new Date(lastUpdate).toLocaleString('es-ES', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(product)}
                            className="rounded-lg p-2 text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Editar parámetros (ROP, EOQ)"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                            className="rounded-lg p-2 text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-danger/10 p-4 text-danger">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-text">¿Eliminar producto?</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Estás a punto de eliminar <span className="font-bold text-text">"{productToDelete.name}"</span>. 
                El producto se ocultará del inventario actual y del punto de venta, pero se mantendrá en el historial para no afectar tus reportes pasados.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setProductToDelete(null)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-danger text-white hover:bg-danger/90"
                onClick={confirmDelete}
              >
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text">Editar Parámetros</h2>
                  <p className="text-sm text-text-secondary">{editingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_rop">ROP (Punto de Reorden)</Label>
                <Input
                  id="edit_rop"
                  type="number"
                  min="0"
                  step="1"
                  value={editParams.rop}
                  onChange={(e) => setEditParams({...editParams, rop: Number(e.target.value)})}
                />
                <p className="text-xs text-text-secondary">Umbral para alertar cuando debas reordenar</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_eoq">EOQ (Cantidad Económica)</Label>
                <Input
                  id="edit_eoq"
                  type="number"
                  min="0"
                  step="1"
                  value={editParams.eoq}
                  onChange={(e) => setEditParams({...editParams, eoq: Number(e.target.value)})}
                />
                <p className="text-xs text-text-secondary">Cantidad óptima por pedido</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_lead_time">Tiempo de Entrega (días)</Label>
                <Input
                  id="edit_lead_time"
                  type="number"
                  min="0"
                  step="1"
                  value={editParams.lead_time}
                  onChange={(e) => setEditParams({...editParams, lead_time: Number(e.target.value)})}
                />
                <p className="text-xs text-text-secondary">Días que tarda el proveedor en entregar</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_order_cost">Costo de Pedido</Label>
                <Input
                  id="edit_order_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editParams.order_cost}
                  onChange={(e) => setEditParams({...editParams, order_cost: Number(e.target.value)})}
                />
                <p className="text-xs text-text-secondary">Costo fijo por cada pedido al proveedor</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_holding_cost">Costo de Almacenamiento</Label>
                <Input
                  id="edit_holding_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editParams.holding_cost}
                  onChange={(e) => setEditParams({...editParams, holding_cost: Number(e.target.value)})}
                />
                <p className="text-xs text-text-secondary">Costo de guardar 1 unidad por año</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={closeEditModal}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveParams}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
