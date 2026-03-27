import { useState, useMemo } from 'react';
import { DollarSign, Calendar, Search, X, Eye, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useDatabaseStore } from '../../store/dbStore';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function DailyClosingsView() {
  const { dailyClosings, sales, employees } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClosing, setSelectedClosing] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const uniqueEmployees = useMemo(() => {
    const names = new Set<string>();
    dailyClosings.forEach(c => {
      if (c.created_by_name) {
        names.add(c.created_by_name);
      }
    });
    return Array.from(names).sort();
  }, [dailyClosings]);

  const filteredClosings = useMemo(() => {
    let result = dailyClosings;

    if (searchTerm) {
      result = result.filter(c => {
        const date = new Date(c.closing_date).toLocaleDateString('es-CO');
        return date.includes(searchTerm) || c.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (startDate) {
      result = result.filter(c => new Date(c.closing_date) >= new Date(startDate));
    }

    if (endDate) {
      result = result.filter(c => new Date(c.closing_date) <= new Date(endDate));
    }

    if (employeeFilter) {
      result = result.filter(c => 
        c.created_by_name?.toLowerCase() === employeeFilter.toLowerCase()
      );
    }

    result = [...result].sort((a, b) => {
      const dateA = new Date(a.closing_date).getTime();
      const dateB = new Date(b.closing_date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [dailyClosings, searchTerm, startDate, endDate, sortOrder, employeeFilter]);

  const getSalesForDate = (closingDate: string) => {
    return sales.filter(s => {
      const saleDate = new Date(s.date).toISOString().split('T')[0];
      return saleDate === closingDate;
    });
  };

  const totalVentasHistorico = filteredClosings.reduce((sum, c) => sum + Number(c.total_sales || 0), 0);
  const totalDescuentosHistorico = filteredClosings.reduce((sum, c) => sum + Number(c.total_discounts || 0), 0);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setEmployeeFilter('');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Cierres de Caja</h1>
          <p className="text-sm text-text-secondary mt-1">
            {filteredClosings.length} cierres encontrados
          </p>
        </div>
        <div className="flex gap-3 text-right">
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Total Histórico</p>
            <p className="font-mono font-bold text-primary">${totalVentasHistorico.toFixed(2)}</p>
          </div>
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Descuentos</p>
            <p className="font-mono font-bold text-danger">${totalDescuentosHistorico.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder="Buscar por fecha o nota..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary whitespace-nowrap">Desde:</span>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary whitespace-nowrap">Hasta:</span>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los empleados</option>
            {uniqueEmployees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="gap-1"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
          </Button>
          {(searchTerm || startDate || endDate || employeeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {filteredClosings.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-surface/80 p-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">No hay cierres de caja registrados.</p>
          <p className="text-xs text-text-secondary mt-1">
            Los cierres se registran desde el Punto de Venta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClosings.map(closing => (
            <div
              key={closing.id}
              className="rounded-xl border border-border/50 bg-surface/80 p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_15px_-3px_rgba(205,164,52,0.15)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text">
                      {new Date(closing.closing_date + 'T12:00:00').toLocaleDateString('es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-text-secondary">
                        {closing.total_sales > 0 ? (
                          `${getSalesForDate(closing.closing_date).length} ventas`
                        ) : 'Sin ventas'}
                      </p>
                      {closing.created_by_name && (
                        <span className="text-xs text-primary">
                          • Cerró: {closing.created_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-bold text-primary">${Number(closing.closing_amount || 0).toFixed(2)}</p>
                    {Number(closing.total_discounts || 0) > 0 && (
                      <p className="text-xs text-danger">-${Number(closing.total_discounts).toFixed(2)} dto.</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedClosing(closing)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {closing.notes && (
                <p className="mt-2 text-xs text-text-secondary italic pl-9">{closing.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detalle Modal */}
      {selectedClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text">Detalle de Cierre</h2>
                <p className="text-sm text-text-secondary">
                  {new Date(selectedClosing.closing_date).toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {selectedClosing.created_by_name && (
                  <p className="text-xs text-primary mt-1">Cerrado por: {selectedClosing.created_by_name}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedClosing(null)}
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl bg-bg/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Ventas brutas:</span>
                <span className="font-mono text-text">${Number(selectedClosing.total_sales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-danger">
                <span>Descuentos otorgados:</span>
                <span className="font-mono">-${Number(selectedClosing.total_discounts || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Devoluciones:</span>
                <span className="font-mono">$${Number(selectedClosing.total_refunds || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border/50 pt-2">
                <span className="text-text">Total en Caja:</span>
                <span className="font-mono text-primary">${Number(selectedClosing.closing_amount || 0).toFixed(2)}</span>
              </div>
              {selectedClosing.notes && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-text-secondary font-medium mb-1">Notas:</p>
                  <p className="text-sm text-text">{selectedClosing.notes}</p>
                </div>
              )}
            </div>

            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setSelectedClosing(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}