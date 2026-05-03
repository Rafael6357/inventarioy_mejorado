import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { Search, Filter, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function MovementsView() {
  const { movements, products, fetchMore } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasMoreMovements, setHasMoreMovements] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Producto Eliminado';

  const filteredMovements = useMemo(() => {
    // Paso 1: Ordenar del más antiguo al más reciente para calcular el balance acumulativo
    const sortedMovements = [...movements].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const productBalances: Record<string, number> = {};

    const movementsWithBal = sortedMovements.map(m => {
      const prevBalance = productBalances[m.product_id] || 0;
      let currentBalance = prevBalance;
      
      if (m.type === 'ENTRADA') {
        currentBalance += m.quantity;
      } else {
        // SALIDA o MERMA: restan del stock
        currentBalance -= m.quantity;
      }
      
      productBalances[m.product_id] = currentBalance;
      
      return {
        ...m,
        balance: currentBalance
      };
    });

    // Paso 2: Aplicar filtros
    return movementsWithBal
      .filter(m => {
        const isNotSale = !m.reason?.startsWith('Venta');
        const matchesSearch = getProductName(m.product_id).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
        
        let matchesDate = true;
        if (startDate) {
          matchesDate = matchesDate && new Date(m.date) >= new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && new Date(m.date) <= end;
        }
        
        return isNotSale && matchesSearch && matchesType && matchesDate;
      })
      .reverse(); // Mostrar los más recientes primero en la tabla
  }, [movements, searchTerm, typeFilter, startDate, endDate, products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Movimientos (Kárdex)</h1>
          <p className="text-sm text-text-secondary">
            Visualización cronológica completa de entradas, salidas y mermas
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por nombre de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-2">
              <Calendar className="h-4 w-4 text-text-secondary" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 bg-transparent text-sm text-text focus:outline-none"
              />
              <span className="text-text-secondary">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 bg-transparent text-sm text-text focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-secondary shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SALIDA">Salidas</option>
                <option value="MERMA">Mermas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                <th className="px-4 py-3 font-medium text-right">Costo Unitario</th>
                <th className="px-4 py-3 font-medium text-right">Importe</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron movimientos.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const isEntrada = movement.type === 'ENTRADA';
                  const isSalida = movement.type === 'SALIDA';
                  
                  return (
                    <tr key={movement.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                        {new Date(movement.date).toLocaleString('es-ES', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{getProductName(movement.product_id)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                          isEntrada ? 'bg-success/10 text-success' :
                          isSalida ? 'bg-primary/10 text-primary' :
                          'bg-danger/10 text-danger'
                        }`}>
                          {isEntrada ? <ArrowDownToLine className="h-3 w-3" /> : 
                           isSalida ? <ArrowUpFromLine className="h-3 w-3" /> : 
                           <AlertTriangle className="h-3 w-3" />}
                          {movement.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${
                        isEntrada ? 'text-success' : 'text-danger'
                      }`}>
                        {isEntrada ? '+' : '-'}{Number(movement.quantity).toFixed(4)} {movement.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        ${movement.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-text">
                        ${(movement.quantity * movement.cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-text">
                        {movement.balance} {movement.unit}
                      </td>
                      <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]" title={movement.reason || '-'}>
                        {movement.reason || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {hasMoreMovements && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={async () => {
                  setLoadingMore(true);
                  const result = await fetchMore(50);
                  setHasMoreMovements(result.hasMore);
                  setLoadingMore(false);
                }}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando...' : 'Ver más movimientos'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
