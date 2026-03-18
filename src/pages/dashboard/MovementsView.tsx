import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { Search, Filter, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function MovementsView() {
  const { movements, products, recalculateStock } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    recalculateStock();
    setTimeout(() => {
      setIsRecalculating(false);
      toast.success('Stock sincronizado exitosamente');
    }, 1000);
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Producto Eliminado';

  const filteredMovements = useMemo(() => {
    // Group movements by product to calculate running balance
    const productBalances: Record<string, number> = {};
    
    // Initialize balances with current stock
    products.forEach(p => {
      productBalances[p.id] = p.quantity;
    });

    // Sort all movements by date descending (newest first)
    const sortedAllMovements = [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const movementsWithBal = sortedAllMovements.map(m => {
      const balanceAfter = productBalances[m.product_id] || 0;
      
      // Calculate balance before this movement to use for the next older movement
      const qty = m.type === 'ENTRADA' ? m.quantity : -m.quantity;
      productBalances[m.product_id] = balanceAfter - qty;
      
      return {
        ...m,
        balance: balanceAfter
      };
    });

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
      });
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
        <Button 
          onClick={handleRecalculate} 
          disabled={isRecalculating}
          className="flex items-center gap-2"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          {isRecalculating ? 'Sincronizando...' : 'Sincronizar Stock'}
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
                        {new Date(movement.date).toLocaleString()}
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
                        {isEntrada ? '+' : '-'}{movement.quantity} {movement.unit}
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
        </div>
      </div>
    </div>
  );
}
