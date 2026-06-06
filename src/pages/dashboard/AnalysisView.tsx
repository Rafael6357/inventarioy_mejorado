import React, { useMemo, useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { TrendingUp, DollarSign, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity, Download, Search, Calendar, RotateCcw, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { exportToExcel } from '../../lib/utils';
import { formatNumber } from '../../lib/formatNumber';
import { useStaggerEnter } from '../../lib/animations/useStaggerEnter';
import { useCountUp } from '../../lib/animations/useCountUp';
import { usePersistentFilters } from '../../lib/hooks/usePersistentFilters';

function parseSaleItems(items: any): any[] {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch {
      return [];
    }
  }
  return [];
}

export default function AnalysisView() {
  const { products, sales, movements, isLoading, warehouses, currentWarehouseId, setCurrentWarehouse } = useDatabaseStore();
  
  // Verificar si los datos aún están cargando para evitar errores
  const isDataLoaded = !isLoading && Array.isArray(products);
  
  const activeProducts = useMemo(() => 
    isDataLoaded ? products.filter(p => p.is_active !== false) : [],
    [isDataLoaded, products]
  );
  
  // Variables seguras para evitar errores cuando los datos no están cargados
  const safeSales = useMemo(() => Array.isArray(sales) ? sales : [], [sales]);
  const safeMovements = useMemo(() => Array.isArray(movements) ? movements : [], [movements]);

  const { filters, setFilters, resetFilters } = usePersistentFilters<{
    auditProduct: string;
    auditDateFrom: string;
    auditDateTo: string;
    turnoverDateFrom: string;
    turnoverDateTo: string;
  }>('analysis', { auditProduct: '', auditDateFrom: '', auditDateTo: '', turnoverDateFrom: '', turnoverDateTo: '' });
  const { auditProduct, auditDateFrom, auditDateTo, turnoverDateFrom, turnoverDateTo } = filters;
  const setAuditProduct = (v: string) => setFilters({ auditProduct: v });
  const setAuditDateFrom = (v: string) => setFilters({ auditDateFrom: v });
  const setAuditDateTo = (v: string) => setFilters({ auditDateTo: v });
  const setTurnoverDateFrom = (v: string) => setFilters({ turnoverDateFrom: v });
  const setTurnoverDateTo = (v: string) => setFilters({ turnoverDateTo: v });

  const today = new Date();
  const setTurnoverHoy = () => {
    const d = today.toISOString().split('T')[0];
    setTurnoverDateFrom(d);
    setTurnoverDateTo(d);
  };
  const setTurnoverAyer = () => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const y = d.toISOString().split('T')[0];
    setTurnoverDateFrom(y);
    setTurnoverDateTo(y);
  };
  const setTurnoverUltimos30 = () => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    setTurnoverDateFrom(d.toISOString().split('T')[0]);
    setTurnoverDateTo(today.toISOString().split('T')[0]);
  };
  const setTurnoverEsteMes = () => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setTurnoverDateFrom(firstDay.toISOString().split('T')[0]);
    setTurnoverDateTo(today.toISOString().split('T')[0]);
  };
  const setTurnoverEsteAno = () => {
    const firstDay = new Date(today.getFullYear(), 0, 1);
    setTurnoverDateFrom(firstDay.toISOString().split('T')[0]);
    setTurnoverDateTo(today.toISOString().split('T')[0]);
  };
  const setHoy = () => {
    const d = today.toISOString().split('T')[0];
    setAuditDateFrom(d);
    setAuditDateTo(d);
  };
  const setAyer = () => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const y = d.toISOString().split('T')[0];
    setAuditDateFrom(y);
    setAuditDateTo(y);
  };
  const setUltimos15 = () => {
    const d = new Date(today);
    d.setDate(d.getDate() - 15);
    setAuditDateFrom(d.toISOString().split('T')[0]);
    setAuditDateTo(today.toISOString().split('T')[0]);
  };

  const auditData = useMemo(() => {
    if (!auditProduct || !auditDateFrom || !auditDateTo) return null;
    const product = products.find(p => p.id === auditProduct);
    if (!product) return null;

    const fromDate = new Date(auditDateFrom + 'T00:00:00');
    const toDate = new Date(auditDateTo + 'T23:59:59');

    const filteredMovements = movements.filter(m => {
      const mDate = new Date(m.date);
      return m.product_id === auditProduct && mDate >= fromDate && mDate <= toDate;
    });

    const entradas = filteredMovements
      .filter(m => m.type === 'ENTRADA')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    const salidas = filteredMovements
      .filter(m => m.type === 'SALIDA' && !m.reason?.startsWith('Venta #') && m.reason !== 'Venta de producto/ingrediente')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    const merma = filteredMovements
      .filter(m => m.type === 'MERMA')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    const stockFinal = entradas - salidas - merma;

    const chartData = filteredMovements.map(m => ({
      fecha: new Date(m.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
      cantidad: m.type === 'ENTRADA' ? Number(m.quantity) : -Number(m.quantity),
      tipo: m.type
    }));

    return {
      product,
      entradas,
      salidas,
      merma,
      stockFinal,
      movements: filteredMovements,
      chartData
    };
  }, [auditProduct, auditDateFrom, auditDateTo, movements, products]);

  const handleExportAudit = () => {
    if (!auditData) return;
    const columns = [
      { header: 'Fecha', key: 'date' },
      { header: 'Tipo', key: 'type' },
      { header: 'Cantidad', key: 'quantity' },
      { header: 'Razón', key: 'reason' },
    ];
    
    const data = auditData.movements.map(m => ({
      ...m,
      date: new Date(m.date).toLocaleDateString('es-CO'),
      quantity: m.type === 'ENTRADA' ? `+${Number(m.quantity).toFixed(3).replace('.', ',')}` : `-${Number(m.quantity).toFixed(3).replace('.', ',')}`,
      reason: m.reason || '-',
    }));
    
    exportToExcel(columns, data, `auditoria_${auditData.product.name}_${auditDateFrom}_${auditDateTo}`);
  };

  const totalInventoryValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + (p.quantity * p.cost), 0);
  }, [activeProducts]);

  const totalSalesRevenue = useMemo(() => {
    return safeSales.reduce((sum, s) => sum + (s?.total_amount || 0), 0);
  }, [safeSales]);

  const totalCostOfGoodsSold = useMemo(() => {
    return safeSales.reduce((sum, s) => {
      const items = parseSaleItems(s?.items);
      return sum + items.reduce((itemSum: number, item: any) => itemSum + ((item?.quantity || 0) * (item?.unit_cost || 0)), 0);
    }, 0);
  }, [safeSales]);

  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  const turnoverData = useMemo(() => {
    if (!turnoverDateFrom || !turnoverDateTo || activeProducts.length === 0) return [];
    
    const fromDate = new Date(turnoverDateFrom + 'T00:00:00');
    const toDate = new Date(turnoverDateTo + 'T23:59:59');
    const daysInPeriod = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    return activeProducts.map(product => {
      const salesInPeriod = safeSales.filter(s => {
        const sDate = new Date(s.date || s.created_at);
        return sDate >= fromDate && sDate <= toDate;
      });
      
      // 1. Ventas directas (productos individuales)
      const ventasDirectas = salesInPeriod.reduce((sum, s) => {
        const items = parseSaleItems(s.items);
        return sum + items
          .filter((item: any) => item.product_id === product.id && !item.is_recipe)
          .reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
      }, 0);
      
      // 2. Ingredientes de recetas vendidas
      const ventasEnRecetas = salesInPeriod.reduce((sum, s) => {
        const items = parseSaleItems(s.items);
        return sum + items.reduce((itemSum: number, item: any) => {
          if (item.recipe_snapshot?.ingredients) {
            const ingredientConsumed = item.recipe_snapshot.ingredients
              .filter((ing: any) => ing.product_id === product.id)
              .reduce((ingSum: number, ing: any) => ingSum + (ing.quantity || 0), 0);
            return itemSum + ingredientConsumed;
          }
          return itemSum;
        }, 0);
      }, 0);
      
      // 3. Movimiento de consumo directo (CONSUMO_DIRECTO)
      const consumoDirecto = safeMovements.filter(m => 
        m.product_id === product.id && 
        m.type === 'CONSUMO_DIRECTO' &&
        new Date(m.date) >= fromDate && new Date(m.date) <= toDate
      ).reduce((sum, m) => sum + Number(m.quantity), 0);
      
      // 4. SALIDA movements (tránsito a cocina - gasto variable)
      const salidasTransito = safeMovements.filter(m => 
        m.product_id === product.id && 
        m.type === 'SALIDA' &&
        !m.reason?.startsWith('Venta #') &&
        m.reason !== 'Venta de producto/ingrediente' &&
        new Date(m.date) >= fromDate && new Date(m.date) <= toDate
      ).reduce((sum, m) => sum + Number(m.quantity), 0);
      
      // Total consumo/salida real
      const totalOutput = ventasDirectas + ventasEnRecetas + consumoDirecto + salidasTransito;
      const currentStock = Number(product.quantity);
      const dailySalesRate = totalOutput > 0 ? totalOutput / daysInPeriod : 0;
      const daysCoverage = dailySalesRate > 0 ? currentStock / dailySalesRate : Infinity;
      const turnoverRate = currentStock > 0 ? totalOutput / currentStock : 0;
      const annualTurnover = daysInPeriod > 0 ? turnoverRate * (365 / daysInPeriod) : 0;
      const cogs = totalOutput * Number(product.cost);
      const suggestedRop = Math.round(dailySalesRate * 7);
      
      let classification: string;
      let classificationColor: string;
      if (!isFinite(daysCoverage) || daysCoverage > 15) {
        classification = 'Exceso';
        classificationColor = 'success';
      } else if (daysCoverage <= 3) {
        classification = 'Crítico';
        classificationColor = 'danger';
      } else {
        classification = 'Normal';
        classificationColor = 'warning';
      }
      
      return {
        product,
        ventasDirectas,
        ventasEnRecetas,
        consumoDirecto,
        totalOutput,
        cogs,
        currentStock,
        dailySalesRate,
        daysCoverage: isFinite(daysCoverage) ? daysCoverage : 999,
        turnoverRate,
        annualTurnover,
        suggestedRop,
        classification,
        classificationColor,
      };
    })
    .filter(d => d.totalOutput > 0 || d.currentStock > 0)
    .sort((a, b) => a.daysCoverage - b.daysCoverage);
  }, [activeProducts, safeSales, safeMovements, turnoverDateFrom, turnoverDateTo]);

  const criticalProductsCount = turnoverData.filter(d => d.classification === 'Crítico').length;

  const analysisStatsRef = useStaggerEnter([totalInventoryValue]);
  const inventoryCountRef = useCountUp(totalInventoryValue, 0.8, 2);
  const revenueCountRef = useCountUp(totalSalesRevenue, 0.8, 2);
  const profitCountRef = useCountUp(grossProfit, 0.8, 2);
  const alertsCountRef = useCountUp(criticalProductsCount, 0.8, 0);
  const auditTbodyRef = useStaggerEnter<HTMLTableSectionElement>([auditData?.movements?.length ?? 0]);
  const turnoverTbodyRef = useStaggerEnter<HTMLTableSectionElement>([turnoverData.length]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Análisis y Rentabilidad</h1>
        <p className="text-sm text-text-secondary">
          Métricas clave del negocio, rotación de inventario y auditoría
        </p>
      </div>

      {warehouses.length > 1 && (
        <div className="flex items-center gap-2">
          <select
            value={currentWarehouseId || ''}
            onChange={(e) => setCurrentWarehouse(e.target.value)}
            className="h-10 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los almacenes</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      )}

      <div ref={analysisStatsRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Valor del Inventario</p>
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text font-mono">$<span ref={inventoryCountRef}>0.00</span></p>
          <p className="mt-1 text-xs text-text-secondary">Capital inmovilizado</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-success/30 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Ingresos por Ventas</p>
            <div className="rounded-lg bg-success/10 p-2 text-success drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text font-mono">$<span ref={revenueCountRef}>0.00</span></p>
          <p className="mt-1 text-xs text-text-secondary">Histórico total</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Ganancia Bruta</p>
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text font-mono">$<span ref={profitCountRef}>0.00</span></p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className={grossProfit >= 0 ? 'text-success flex items-center' : 'text-danger flex items-center'}>
              {grossProfit >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {grossMargin.toFixed(1)}% margen
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-danger/30 hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Alertas de Stock</p>
            <div className="rounded-lg bg-danger/10 p-2 text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text"><span ref={alertsCountRef}>0</span></p>
          <p className="mt-1 text-xs text-text-secondary">Productos críticos (≤3 días)</p>
        </div>
      </div>

      {/* AUDITORÍA DE INVENTARIO */}
      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Auditoría de Inventario</h2>
            <p className="text-xs text-text-secondary">Selecciona un producto y rango de fechas para ver el movimiento detallado</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-text-secondary block mb-1">Producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <select
                className="w-full rounded-md border border-border bg-bg pl-9 pr-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                value={auditProduct}
                onChange={e => setAuditProduct(e.target.value)}
              >
                <option value="">-- Seleccionar producto --</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <Input
                type="date"
                value={auditDateFrom}
                onChange={e => setAuditDateFrom(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <Input
                type="date"
                value={auditDateTo}
                onChange={e => setAuditDateTo(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={setHoy}>Hoy</Button>
          <Button size="sm" variant="outline" onClick={setAyer}>Ayer</Button>
          <Button size="sm" variant="outline" onClick={setUltimos15}>Últimos 15 días</Button>
          {(auditProduct || auditDateFrom || auditDateTo) && (
            <Button size="sm" variant="ghost" onClick={resetFilters} className="gap-1.5 text-xs">
              <X className="h-3 w-3" /> Limpiar
            </Button>
          )}
        </div>

        {!auditData && auditProduct && (
          <p className="mt-4 text-sm text-text-secondary text-center py-4">
            Selecciona un rango de fechas para ver la auditoría.
          </p>
        )}

        {auditData && (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-center">
                <p className="text-xs text-success">Entradas</p>
                <p className="font-mono font-bold text-success mt-1">+{auditData.entradas}</p>
              </div>
              <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-center">
                <p className="text-xs text-danger">Salidas</p>
                <p className="font-mono font-bold text-danger mt-1">-{auditData.salidas}</p>
              </div>
              {auditData.merma > 0 && (
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-center">
                  <p className="text-xs text-warning">Merma</p>
                  <p className="font-mono font-bold text-warning mt-1">-{auditData.merma}</p>
                </div>
              )}
              <div className={`rounded-lg border p-3 text-center ${auditData.stockFinal >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-danger/10 border-danger/30'}`}>
                <p className="text-xs text-text-secondary">Almacén</p>
                <p className={`font-mono font-bold mt-1 ${auditData.stockFinal >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {auditData.stockFinal} {auditData.product.unit}
                </p>
              </div>
            </div>

            {auditData.chartData.length === 0 && (
              <p className="mt-4 text-sm text-text-secondary text-center py-4">
                No hay movimientos en este período para este producto.
              </p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
                <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                    <th className="px-4 py-3 font-medium">Razón</th>
                  </tr>
                </thead>
                <tbody ref={auditTbodyRef} className="divide-y divide-border">
                  {auditData.movements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                        Sin movimientos en este período.
                      </td>
                    </tr>
                  ) : (
                    auditData.movements.map(m => (
                      <tr key={m.id} className="transition-colors hover:bg-surface-hover">
                        <td className="px-4 py-3">{new Date(m.date).toLocaleDateString('es-CO', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.type === 'ENTRADA' ? 'bg-success/20 text-success' :
                            m.type === 'SALIDA' ? 'bg-danger/20 text-danger' :
                            'bg-warning/20 text-warning'
                          }`}>{m.type}</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${
                          m.type === 'ENTRADA' ? 'text-success' : 'text-danger'
                        }`}>
                          {m.type === 'ENTRADA' ? '+' : '-'}{formatNumber(Number(m.quantity), 4)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{m.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportAudit}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Rotación de Inventario</h2>
            <p className="text-xs text-text-secondary">Análisis de velocidad de venta y cobertura de stock</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-text-secondary block mb-1">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <Input
                type="date"
                value={turnoverDateFrom}
                onChange={e => setTurnoverDateFrom(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-text-secondary block mb-1">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <Input
                type="date"
                value={turnoverDateTo}
                onChange={e => setTurnoverDateTo(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={setTurnoverHoy}>Hoy</Button>
            <Button size="sm" variant="outline" onClick={setTurnoverAyer}>Ayer</Button>
            <Button size="sm" variant="outline" onClick={setTurnoverUltimos30}>30D</Button>
            <Button size="sm" variant="outline" onClick={setTurnoverEsteMes}>Mes</Button>
            <Button size="sm" variant="outline" onClick={setTurnoverEsteAno}>Año</Button>
          </div>
        </div>

        {(!turnoverDateFrom || !turnoverDateTo) && (
          <p className="text-sm text-text-secondary text-center py-8">
            Selecciona un rango de fechas para ver el análisis de rotación.
          </p>
        )}

        {turnoverDateFrom && turnoverDateTo && (
          <>
            <div className="mb-4 flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger"></span> Crítico: ≤3 días</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning"></span> Normal: 4-15 días</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"></span> Exceso: &gt;15 días</span>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
                <thead className="sticky top-0 z-10 border-b border-border bg-bg/95 text-xs uppercase text-text-secondary shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      <div>Producto</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Nombre y categoría</div>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <div>Consumido</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Ventas + Recetas + Consumo</div>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <div>Stock</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Cantidad actual</div>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <div>Cobertura</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Días que durará el stock</div>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <div>Rot. Anual</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Veces que renueva/año</div>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <div>ROP Sug.</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Punto de reorden ×7 días</div>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <div>Estado</div>
                      <div className="text-[10px] normal-case font-normal text-text-secondary/70">Crítico/Normal/Exceso</div>
                    </th>
                  </tr>
                </thead>
                <tbody ref={turnoverTbodyRef} className="divide-y divide-border">
                  {turnoverData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                        No hay datos de ventas en el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    turnoverData.map((item) => (
                      <tr key={item.product.id} className={`transition-colors hover:bg-surface-hover ${
                        item.classification === 'Crítico' ? 'bg-danger/5' : 
                        item.classification === 'Exceso' ? 'bg-success/5' : ''
                      }`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-xs text-text-secondary">{item.product.category}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.totalOutput.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.currentStock.toFixed(2)} {item.product.unit}</td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${
                          item.classification === 'Crítico' ? 'text-danger' :
                          item.classification === 'Exceso' ? 'text-success' : 'text-warning'
                        }`}>
                          {item.daysCoverage > 999 ? '∞' : item.daysCoverage.toFixed(1)} días
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.annualTurnover.toFixed(1)}x</td>
                        <td className="px-4 py-3 text-right font-mono">{item.suggestedRop}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            item.classificationColor === 'danger' ? 'bg-danger/20 text-danger' :
                            item.classificationColor === 'success' ? 'bg-success/20 text-success' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {item.classification}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {criticalProductsCount > 0 && (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
                <div className="flex items-center gap-2 text-danger font-medium text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Productos críticos requieren atención inmediata
                </div>
                <p className="text-xs text-text-secondary">
                  {criticalProductsCount} producto(s) con cobertura ≤3 días. Considera reabastecerlos pronto.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
