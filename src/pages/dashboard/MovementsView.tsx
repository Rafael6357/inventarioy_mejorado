import React, { useState, useMemo, useEffect } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { Search, Filter, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Calendar, ChevronLeft, ChevronRight, TrendingDown, Settings2, Printer } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { exportToExcel } from '../../lib/utils';

export default function MovementsView() {
  const { movements, products, fetchMore, warehouses, currentWarehouseId } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Producto Eliminado';

  const filteredMovements = useMemo(() => {
    // Paso 1: Ordenar del más antiguo al más reciente para calcular el balance acumulativo
    const sortedMovements = [...movements].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const productBalances: Record<string, number> = {};

    const movementsWithBal = sortedMovements.map(m => {
      const balanceKey = `${m.product_id}::${m.warehouse_id || '__legacy__'}`;
      const prevBalance = productBalances[balanceKey] || 0;
      let currentBalance = prevBalance;
      
      if (m.type === 'ENTRADA') {
        currentBalance += m.quantity;
      } else {
        currentBalance -= m.quantity;
      }
      
      productBalances[balanceKey] = currentBalance;
      
      return {
        ...m,
        balance: currentBalance
      };
    });

    // Paso 2: Aplicar filtros
    return movementsWithBal
      .filter(m => {
        const isInventoryMovement = m.type === 'ENTRADA' || m.type === 'SALIDA' || m.type === 'MERMA' || m.type === 'AJUSTE' || m.type === 'TRANSFER';
        const matchesSearch = getProductName(m.product_id).toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesType = true;
        if (typeFilter === 'ALL') {
          matchesType = true;
        } else if (typeFilter === 'CONSUMO_DIRECTO') {
          matchesType = m.is_consumo_directo === true;
        } else if (typeFilter === 'GASTO_VARIABLE') {
          matchesType = m.is_gasto_variable === true;
        } else {
          matchesType = m.type === typeFilter;
        }
        
        let matchesDate = true;
        if (startDate) {
          matchesDate = matchesDate && new Date(m.date) >= new Date(startDate);
        }
if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && new Date(m.date) <= end;
        }

        let matchesWarehouse = true;
        if (currentWarehouseId) {
          // Mostrar: movimientos del almacén específico O movimientos históricos (sin warehouse_id)
          matchesWarehouse = m.warehouse_id === currentWarehouseId || m.warehouse_id === null || m.warehouse_id === undefined;
        }
        
        return isInventoryMovement && matchesSearch && matchesType && matchesDate && matchesWarehouse;
      })
      .reverse();
  }, [movements, searchTerm, typeFilter, startDate, endDate, products, currentWarehouseId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, startDate, endDate]);

  useEffect(() => {
    if (typeFilter === 'TRANSFER' && currentWarehouseId) {
      useDatabaseStore.getState().setCurrentWarehouse('');
    }
  }, [typeFilter]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Movimientos (Kárdex)</h1>
          <p className="text-sm text-text-secondary">
            Visualización cronológica completa de entradas, salidas y mermas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const columns = [
              { header: 'Fecha', key: 'date' },
              { header: 'Tipo', key: 'type' },
              { header: 'Producto', key: 'product_name' },
              { header: 'Cantidad', key: 'quantity', format: (v: number) => v?.toFixed(3).replace('.', ',') || '0' },
              { header: 'Unidad', key: 'unit' },
              { header: 'Costo', key: 'cost', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
              { header: 'Razón', key: 'reason' },
            ];
            const data = filteredMovements.map(m => ({
              ...m,
              date: new Date(m.date).toLocaleString('es-ES'),
              product_name: getProductName(m.product_id),
              quantity: Number(m.quantity),
              cost: Number(m.cost) || 0,
            }));
            exportToExcel(columns, data, `movimientos_${new Date().toISOString().split('T')[0]}`);
          }}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Exportar
        </Button>
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
                <option value="TRANSFER">Transferencias</option>
                <option value="MERMA">Mermas</option>
                <option value="AJUSTE">Ajustes de Inventario</option>
                <option value="CONSUMO_DIRECTO">Consumo Directo</option>
                <option value="GASTO_VARIABLE">Gasto Variable</option>
              </select>
            </div>

            {warehouses.length > 1 && (
              <div className="flex items-center gap-2">
                <select
                  value={currentWarehouseId || 'ALL'}
                  onChange={(e) => useDatabaseStore.getState().setCurrentWarehouse(e.target.value === 'ALL' ? '' : e.target.value)}
                  className="h-10 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Todos los almacenes</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
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
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron movimientos.
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((movement) => {
                  const isEntrada = movement.type === 'ENTRADA';
                  const isSalida = movement.type === 'SALIDA';
                  const isAjuste = movement.type === 'AJUSTE';
                  const isConsumoDirecto = movement.is_consumo_directo === true;
                  const isGastoVariable = movement.is_gasto_variable === true;
                  
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
                          isConsumoDirecto ? 'bg-amber-500/10 text-amber-600' :
                          isGastoVariable ? 'bg-purple-500/10 text-purple-600' :
                          isAjuste ? 'bg-blue-500/10 text-blue-600' :
                          isSalida ? 'bg-primary/10 text-primary' :
                          'bg-danger/10 text-danger'
                        }`}>
                          {isEntrada ? <ArrowDownToLine className="h-3 w-3" /> : 
                           isConsumoDirecto ? <ArrowUpFromLine className="h-3 w-3" /> :
                           isGastoVariable ? <TrendingDown className="h-3 w-3" /> :
                           isAjuste ? <Settings2 className="h-3 w-3" /> :
                           isSalida ? <ArrowUpFromLine className="h-3 w-3" /> : 
                           <AlertTriangle className="h-3 w-3" />}
                          {isConsumoDirecto ? 'CONSUMO DIRECTO' : 
                           isGastoVariable ? 'GASTO VARIABLE' : 
                           isAjuste ? 'AJUSTE' :
                           movement.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${
                        isEntrada || (isAjuste && Number(movement.quantity) > 0) ? 'text-success' : 'text-danger'
                      }`}>
                        {isEntrada || (isAjuste && Number(movement.quantity) > 0) ? '+' : '-'}{Math.abs(Number(movement.quantity)).toFixed(4)} {movement.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        ${movement.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-text">
                        ${(Math.abs(movement.quantity) * movement.cost).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-text">
                        {movement.balance} {movement.unit}
                      </td>
                      <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]" title={isConsumoDirecto && movement.note ? movement.note : movement.reason || '-'}>
                        {isConsumoDirecto && movement.note ? movement.note : movement.reason || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 px-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredMovements.length)} de {filteredMovements.length} movimientos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-text-secondary px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
