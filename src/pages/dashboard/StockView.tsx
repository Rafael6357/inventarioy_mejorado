import { useState, useMemo } from 'react';
import { Search, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Trash2, Filter } from 'lucide-react';
import { useDatabaseStore } from '../../store/dbStore';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function StockView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [productToDelete, setProductToDelete] = useState<{id: string, name: string} | null>(null);
  
  const products = useDatabaseStore((state) => state.products);
  const movements = useDatabaseStore((state) => state.movements);
  const deleteProduct = useDatabaseStore((state) => state.deleteProduct);

  const activeProducts = useMemo(() => {
    return products.filter(p => p.isActive !== false);
  }, [products]);

  const lastMovementDates = useMemo(() => {
    const dates: Record<string, string> = {};
    movements.forEach(m => {
      if (!dates[m.productId] || new Date(m.date) > new Date(dates[m.productId])) {
        dates[m.productId] = m.date;
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
      if (statusFilter === 'LOW_STOCK') {
        matchesStatus = product.quantity <= product.stock_min && product.quantity > 0;
      } else if (statusFilter === 'OUT_OF_STOCK') {
        matchesStatus = product.quantity <= 0;
      } else if (statusFilter === 'OPTIMAL') {
        matchesStatus = product.quantity > product.stock_min;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeProducts, searchTerm, categoryFilter, statusFilter]);

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      toast.success('Producto eliminado exitosamente');
      setProductToDelete(null);
    }
  };

  const totalInventoryValue = useMemo(() => {
    return filteredProducts.reduce((total, product) => total + (product.quantity * product.cost), 0);
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
                <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                <th className="px-4 py-3 font-medium text-right">Costo Unitario</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Unidad de Medida</th>
                <th className="px-4 py-3 font-medium">Fecha de Vencimiento</th>
                <th className="px-4 py-3 font-medium">Fecha Última Actualización</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.quantity <= 0;
                  const isLowStock = product.quantity <= product.stock_min && !isOutOfStock;
                  const lastUpdate = lastMovementDates[product.id];
                  
                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-surface-hover ${
                        isOutOfStock ? 'bg-danger/10' : isLowStock ? 'bg-warning/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{product.name}</td>
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
                        {product.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ${product.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                        ${(product.quantity * product.cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {product.expiration_date ? new Date(product.expiration_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {lastUpdate ? new Date(lastUpdate).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                          className="rounded-lg p-2 text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
    </div>
  );
}
