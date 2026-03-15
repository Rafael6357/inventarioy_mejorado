import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { Filter, Search, ArrowUpDown, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function FilteredCenterView() {
  const { products } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.isActive !== false);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, LOW, NORMAL, OVER
  const [sortBy, setSortBy] = useState('name'); // name, price, stock, value
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map(p => p.category));
    return Array.from(cats).sort();
  }, [activeProducts]);

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...activeProducts];

    // 1. Search Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lowerSearch) || 
        p.category.toLowerCase().includes(lowerSearch) ||
        p.description?.toLowerCase().includes(lowerSearch)
      );
    }

    // 2. Category Filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(p => p.category === categoryFilter);
    }

    // 3. Stock Status Filter
    if (stockFilter !== 'ALL') {
      result = result.filter(p => {
        if (stockFilter === 'LOW') return p.quantity <= p.stock_min;
        if (stockFilter === 'NORMAL') return p.quantity > p.stock_min && p.quantity <= p.stock_max;
        if (stockFilter === 'OVER') return p.quantity > p.stock_max;
        return true;
      });
    }

    // 4. Sorting
    result.sort((a, b) => {
      let valA: any = a.name;
      let valB: any = b.name;

      if (sortBy === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortBy === 'stock') {
        valA = a.quantity;
        valB = b.quantity;
      } else if (sortBy === 'value') {
        valA = a.quantity * a.cost;
        valB = b.quantity * b.cost;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [activeProducts, searchTerm, categoryFilter, stockFilter, sortBy, sortOrder]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return <ArrowUpDown className={`ml-1 h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''} text-primary`} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Centro Filtrado</h1>
        <p className="text-sm text-text-secondary">
          Búsqueda avanzada y filtros combinados para tu inventario
        </p>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">Búsqueda General</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <Input
                placeholder="Nombre, categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">Categoría</Label>
            <select 
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">Estado de Stock</Label>
            <select 
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="LOW">Stock Bajo (Crítico)</option>
              <option value="NORMAL">Stock Normal</option>
              <option value="OVER">Sobre-stock</option>
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-bg border border-border text-sm text-text-secondary">
              <Filter className="h-4 w-4" />
              <span>{filteredAndSortedProducts.length} resultados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center">Producto <SortIcon field="name" /></div>
                </th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => toggleSort('stock')}>
                  <div className="flex items-center">Stock Actual <SortIcon field="stock" /></div>
                </th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => toggleSort('price')}>
                  <div className="flex items-center">Precio <SortIcon field="price" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => toggleSort('value')}>
                  <div className="flex items-center">Valor Total <SortIcon field="value" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-8 w-8 mb-2 opacity-20" />
                      <p>No se encontraron productos con estos filtros.</p>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setCategoryFilter('ALL');
                          setStockFilter('ALL');
                        }}
                        className="mt-4 text-primary hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((product) => {
                  const isLow = product.quantity <= product.stock_min;
                  const isOver = product.quantity > product.stock_max;
                  const totalValue = product.quantity * product.cost;

                  return (
                    <tr key={product.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg text-text-secondary">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-text">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-text-secondary truncate max-w-[200px]">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-secondary border border-border">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {product.quantity} <span className="text-xs text-text-secondary">{product.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                            <AlertTriangle className="h-3 w-3" /> Bajo
                          </span>
                        ) : isOver ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            <ArrowUpDown className="h-3 w-3" /> Exceso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                            <CheckCircle2 className="h-3 w-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-text-secondary">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-text">
                        ${totalValue.toFixed(2)}
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
