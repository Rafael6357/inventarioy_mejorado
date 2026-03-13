import { useState } from 'react';
import { Search, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useDatabaseStore } from '../../store/dbStore';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';

export default function StockView() {
  const [searchTerm, setSearchTerm] = useState('');
  const products = useDatabaseStore((state) => state.products);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Stock Actual</h1>
          <p className="text-sm text-text-secondary">
            Vista rápida del inventario en tiempo real
          </p>
        </div>
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

      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text">
            <thead className="border-b border-border/50 bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.quantity <= product.stock_min;
                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-surface-hover ${
                        isLowStock ? 'bg-danger/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{product.category}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {product.quantity} {product.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]">
                            <AlertTriangle className="h-3 w-3 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success shadow-[inset_0_0_10px_rgba(34,197,94,0.2)]">
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link to="/dashboard/inventory">
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            Gestionar
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
