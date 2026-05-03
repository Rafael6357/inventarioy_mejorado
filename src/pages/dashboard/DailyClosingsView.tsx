import { useState, useMemo, useEffect } from 'react';
import { DollarSign, Calendar, Search, X, Eye, ArrowUpDown, ArrowDown, ArrowUp, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { useDatabaseStore } from '../../store/dbStore';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function DailyClosingsView() {
  const { dailyClosings, sales, employees, logAction, products } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClosing, setSelectedClosing] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const [expandedClosing, setExpandedClosing] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('verifiedRole');
    if (stored) {
      setVerifiedRole(stored);
    }
  }, []);

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

  const getSalesForDateWithType = (closingDate: string, type: string) => {
    return sales.filter(s => {
      const saleDate = new Date(s.date).toISOString().split('T')[0];
      return saleDate === closingDate && s.sale_type === type;
    });
  };

  const getAccountHouseSales = (closingDate: string) => {
    return sales.filter(s => {
      const saleDate = new Date(s.date).toISOString().split('T')[0];
      return saleDate === closingDate && s.is_account_house === true;
    });
  };

  const calculateClosingTotals = (closingDate: string) => {
    const allSalesForDate = sales.filter(s => {
      const saleDate = new Date(s.date).toISOString().split('T')[0];
      return saleDate === closingDate;
    });
    
    const salonSales = allSalesForDate.filter(s => s.sale_type === 'SALON' && !s.is_account_house);
    const domicilioSales = allSalesForDate.filter(s => s.sale_type === 'DOMICILIO' && !s.is_account_house);
    const cuentaCasaSales = allSalesForDate.filter(s => s.is_account_house === true);
    
    const salonTotal = salonSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const domicilioTotal = domicilioSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const cuentaCasaTotal = cuentaCasaSales.reduce((sum, s) => {
      const items = (s as any).sale_items || [];
      const itemsTotal = items.reduce((itemSum: number, item: any) => itemSum + Number(item.subtotal || 0), 0);
      return sum + itemsTotal;
    }, 0);
    
    return {
      salon: salonTotal,
      domicilio: domicilioTotal,
      cuenta_casa: cuentaCasaTotal,
      total: salonTotal + domicilioTotal
    };
  };

  const totalVentasHistorico = filteredClosings.reduce((sum, c) => sum + Number(c.total_sales || 0), 0);
  const totalDescuentosHistorico = filteredClosings.reduce((sum, c) => sum + Number(c.total_discounts || 0), 0);
  
  const totalSalonHistorico = filteredClosings.reduce((sum, c) => {
    return sum + calculateClosingTotals(c.closing_date.split('T')[0]).salon;
  }, 0);
  
  const totalDomicilioHistorico = filteredClosings.reduce((sum, c) => {
    return sum + calculateClosingTotals(c.closing_date.split('T')[0]).domicilio;
  }, 0);

  const totalCuentaCasaHistorico = filteredClosings.reduce((sum, c) => {
    return sum + calculateClosingTotals(c.closing_date.split('T')[0]).cuenta_casa;
  }, 0);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setEmployeeFilter('');
    setSortOrder('desc');
  };

  const getSalesItemsGrouped = (closingDate: string) => {
    const dateStr = closingDate.split('T')[0];
    const allSalesForDate = sales.filter(s => {
      const saleDate = new Date(s.date).toISOString().split('T')[0];
      return saleDate === dateStr;
    });

    const grouped = {
      salon: {} as Record<string, { quantity: number; subtotal: number; name: string }>,
      domicilio: {} as Record<string, { quantity: number; subtotal: number; name: string }>,
      cuenta_casa: {} as Record<string, { quantity: number; subtotal: number; name: string }>,
    };

    const getProductName = (item: any) => {
      if (item.is_recipe && item.recipe_snapshot?.name) {
        return item.recipe_snapshot.name;
      }
      const product = products.find(p => p.id === item.product_id);
      return product?.name || item.product_name || 'Producto';
    };

    allSalesForDate.forEach(sale => {
      const items = sale.items || [];
      let groupKey: 'salon' | 'domicilio' | 'cuenta_casa';

      if (sale.is_account_house) {
        groupKey = 'cuenta_casa';
      } else if (sale.sale_type === 'DOMICILIO') {
        groupKey = 'domicilio';
      } else {
        groupKey = 'salon';
      }

      items.forEach((item: any) => {
        const productName = getProductName(item);
        if (!grouped[groupKey][productName]) {
          grouped[groupKey][productName] = { quantity: 0, subtotal: 0, name: productName };
        }
        grouped[groupKey][productName].quantity += item.quantity || 1;
        grouped[groupKey][productName].subtotal += Number(item.subtotal || 0);
      });
    });

    return grouped;
  };

  const canPrint = verifiedRole && ['owner', 'economist', 'supervisor'].includes(verifiedRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Cierres de Caja</h1>
          <p className="text-sm text-text-secondary mt-1">
            {filteredClosings.length} cierres encontrados
          </p>
        </div>
        <div className="flex gap-3 text-right flex-wrap">
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Total Histórico</p>
            <p className="font-mono font-bold text-primary">${totalVentasHistorico.toFixed(2)}</p>
          </div>
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Descuentos</p>
            <p className="font-mono font-bold text-danger">${totalDescuentosHistorico.toFixed(2)}</p>
          </div>
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Salón</p>
            <p className="font-mono font-bold text-text">${totalSalonHistorico.toFixed(2)}</p>
          </div>
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Domicilio</p>
            <p className="font-mono font-bold text-text">${totalDomicilioHistorico.toFixed(2)}</p>
          </div>
          <div className="bg-bg/50 rounded-lg px-4 py-2 border border-border/50">
            <p className="text-xs text-text-secondary">Cuenta Casa</p>
            <p className="font-mono font-bold text-text">${totalCuentaCasaHistorico.toFixed(2)}</p>
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
              
              <div className="mt-3 pt-3 border-t border-border/30">
                <button
                  onClick={() => setExpandedClosing(expandedClosing === closing.id ? null : closing.id)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {expandedClosing === closing.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {expandedClosing === closing.id ? 'Ocultar ventas' : 'Ver ventas del día'}
                </button>
                
                {expandedClosing === closing.id && (
                  <div className="mt-3 bg-bg/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {(() => {
                      const closingDate = closing.closing_date.split('T')[0];
                      const daySales = sales.filter(s => {
                        const saleDate = new Date(s.date).toISOString().split('T')[0];
                        return saleDate === closingDate;
                      });
                      
                      if (daySales.length === 0) {
                        return <p className="text-sm text-text-secondary text-center py-2">No hay ventas registradas</p>;
                      }
                      
                      return (
                        <div className="space-y-2">
                          {daySales.map(sale => (
                            <div key={sale.id} className="flex justify-between items-center text-sm border-b border-border/30 pb-2 last:border-0">
                              <div>
                                <span className="text-text">
                                  {sale.is_account_house 
                                    ? 'Cuenta Casa' 
                                    : sale.sale_type === 'SALON' ? 'Salón' : 'Domicilio'}
                                </span>
                                <span className="text-text-secondary ml-2">• {sale.items?.length || 0} items</span>
                              </div>
                              <span className="font-mono text-primary">${Number(sale.total_amount || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
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
              <div className="text-xs font-medium text-text-secondary mb-2">Desglose de Ventas:</div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Salón:</span>
                <span className="font-mono text-text">${calculateClosingTotals(selectedClosing.closing_date.split('T')[0]).salon.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Domicilio:</span>
                <span className="font-mono text-text">${calculateClosingTotals(selectedClosing.closing_date.split('T')[0]).domicilio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Cuenta Casa:</span>
                <span className="font-mono text-text">${calculateClosingTotals(selectedClosing.closing_date.split('T')[0]).cuenta_casa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border/50 pt-2">
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

            <div className="flex gap-2 mt-4">
              {canPrint && (
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Previsualizar
                </Button>
              )}
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setSelectedClosing(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Ticket Preview Modal */}
      {showPreview && selectedClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-surface p-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between print-hide">
              <h2 className="text-lg font-bold text-text">Previsualización de Ticket</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div id="ticket-container" className="bg-white text-black p-4 rounded-lg font-mono text-xs overflow-x-auto">
              <div className="text-center border-b-2 border-dashed border-gray-400 pb-2 mb-3">
                <p className="font-bold text-sm">RESUMEN DE VENTAS</p>
                <p className="text-xs mt-1">
                  {new Date(selectedClosing.closing_date).toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {selectedClosing.created_by_name && (
                  <p className="text-xs">Cerró: {selectedClosing.created_by_name}</p>
                )}
              </div>

              {(() => {
                const grouped = getSalesItemsGrouped(selectedClosing.closing_date);
                const formatItem = (name: string, qty: number, subtotal: number) => {
                  const qtyStr = qty.toString().padStart(2, ' ');
                  const subStr = subtotal.toFixed(2).padStart(8, ' ');
                  return `${qtyStr}x ${name.slice(0, 15).padEnd(15)} ${subStr}`;
                };
                const formatTotal = (label: string, total: number) => {
                  const labelStr = label.padEnd(18, ' ');
                  const totalStr = total.toFixed(2).padStart(9, ' ');
                  return `${labelStr}${totalStr}`;
                };

                const salonItems = Object.entries(grouped.salon);
                const domicilioItems = Object.entries(grouped.domicilio);
                const cuentaCasaItems = Object.entries(grouped.cuenta_casa);

                const salonTotal = salonItems.reduce((sum, [, v]) => sum + v.subtotal, 0);
                const domicilioTotal = domicilioItems.reduce((sum, [, v]) => sum + v.subtotal, 0);
                const cuentaCasaTotal = cuentaCasaItems.reduce((sum, [, v]) => sum + v.subtotal, 0);
                const totalDia = salonTotal + domicilioTotal + cuentaCasaTotal;

                return (
                  <>
                    {salonItems.length > 0 && (
                      <div className="mb-3">
                        <p className="font-bold border-b border-gray-300 mb-1">--- SALON ---</p>
                        {salonItems.map(([name, data]) => (
                          <p key={name}>{formatItem(name, data.quantity, data.subtotal)}</p>
                        ))}
                        <p className="font-bold mt-1 border-t border-gray-300 pt-1">
                          {formatTotal('TOTAL SALON:', salonTotal)}
                        </p>
                      </div>
                    )}

                    {domicilioItems.length > 0 && (
                      <div className="mb-3">
                        <p className="font-bold border-b border-gray-300 mb-1">--- DOMICILIO ---</p>
                        {domicilioItems.map(([name, data]) => (
                          <p key={name}>{formatItem(name, data.quantity, data.subtotal)}</p>
                        ))}
                        <p className="font-bold mt-1 border-t border-gray-300 pt-1">
                          {formatTotal('TOTAL DOMICILIO:', domicilioTotal)}
                        </p>
                      </div>
                    )}

                    {cuentaCasaItems.length > 0 && (
                      <div className="mb-3">
                        <p className="font-bold border-b border-gray-300 mb-1">--- CUENTA CASA ---</p>
                        {cuentaCasaItems.map(([name, data]) => (
                          <p key={name}>{formatItem(name, data.quantity, data.subtotal)}</p>
                        ))}
                        <p className="font-bold mt-1 border-t border-gray-300 pt-1">
                          {formatTotal('TOTAL CTA.CASA:', cuentaCasaTotal)}
                        </p>
                      </div>
                    )}

                    {salonItems.length === 0 && domicilioItems.length === 0 && cuentaCasaItems.length === 0 && (
                      <p className="text-center text-gray-500">Sin ventas en este cierre</p>
                    )}

                    <div className="border-t-2 border-dashed border-gray-400 mt-3 pt-2 text-center">
                      <p className="font-bold text-sm">
                        {formatTotal('TOTAL DEL DIA:', totalDia)}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-2 mt-4 print-hide">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => window.print()}
              >
                Imprimir
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => setShowPreview(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}