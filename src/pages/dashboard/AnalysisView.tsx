import React, { useMemo, useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { TrendingUp, DollarSign, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity, Download, Search, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  const { products, sales, movements, isLoading } = useDatabaseStore();
  
  // Verificar si los datos aún están cargando para evitar errores
  const isDataLoaded = !isLoading && Array.isArray(products);
  
  const activeProducts = isDataLoaded ? products.filter(p => p.is_active !== false) : [];
  
  // Variables seguras para evitar errores cuando los datos no están cargados
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeMovements = Array.isArray(movements) ? movements : [];

  const [auditProduct, setAuditProduct] = useState<string>('');
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');

  const today = new Date();
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
      .filter(m => m.type === 'SALIDA')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    const merma = filteredMovements
      .filter(m => m.type === 'MERMA')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    const stockFinal = Number(product.quantity);

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

  const exportToExcel = () => {
    if (!auditData) return;
    const headers = ['Fecha', 'Tipo', 'Cantidad', 'Razón'];
    const rows = auditData.movements.map(m => [
      new Date(m.date).toLocaleDateString('es-CO'),
      m.type,
      m.type === 'ENTRADA' ? `+${Number(m.quantity).toFixed(4)}` : `-${Number(m.quantity).toFixed(4)}`,
      (m.reason || '-').replace(/,/g, ' ')
    ]);
    
    // Añadir BOM UTF-8 para que Excel reconozca caracteres especiales
    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${auditData.product.name}_${auditDateFrom}_${auditDateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const abcAnalysis = useMemo(() => {
    if (totalInventoryValue === 0) return [];
    const productsWithValue = activeProducts.map(p => ({
      ...p,
      totalValue: p.quantity * p.cost
    })).sort((a, b) => b.totalValue - a.totalValue);
    let cumulativeValue = 0;
    return productsWithValue.map(p => {
      cumulativeValue += p.totalValue;
      const cumulativePercentage = (cumulativeValue / totalInventoryValue) * 100;
      let classification = 'C';
      if (cumulativePercentage <= 80) classification = 'A';
      else if (cumulativePercentage <= 95) classification = 'B';
      return { ...p, classification, cumulativePercentage };
    });
  }, [activeProducts, totalInventoryValue]);

  const lowStockProducts = activeProducts.filter(p => {
    const physicalStock = Number(p.quantity) - (Number(p.in_transit) || 0);
    return physicalStock <= p.rop;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Análisis y Rentabilidad</h1>
        <p className="text-sm text-text-secondary">
          Métricas clave del negocio, clasificación ABC y auditoría de inventario
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Valor del Inventario</p>
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text font-mono">${totalInventoryValue.toFixed(2)}</p>
          <p className="mt-1 text-xs text-text-secondary">Capital inmovilizado</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-success/30 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Ingresos por Ventas</p>
            <div className="rounded-lg bg-success/10 p-2 text-success drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text font-mono">${totalSalesRevenue.toFixed(2)}</p>
          <p className="mt-1 text-xs text-text-secondary">Histórico total</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Ganancia Bruta</p>
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-text font-mono">${grossProfit.toFixed(2)}</p>
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
          <p className="mt-4 text-2xl font-bold text-text">{lowStockProducts.length}</p>
          <p className="mt-1 text-xs text-text-secondary">Productos por reabastecer</p>
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
                <tbody className="divide-y divide-border">
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
                          {m.type === 'ENTRADA' ? '+' : '-'}{Number(m.quantity).toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{m.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="outline" className="gap-2" onClick={exportToExcel}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm lg:col-span-2 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
          <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Clasificación ABC (Valor de Inventario)</h2>
              <p className="text-xs text-text-secondary">A: 80% del valor | B: 15% del valor | C: 5% del valor</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
              <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Clase</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium text-right">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Valor Total</th>
                  <th className="px-4 py-3 font-medium text-right">% Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abcAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                      No hay productos en el inventario.
                    </td>
                  </tr>
                ) : (
                  abcAnalysis.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          product.classification === 'A' ? 'bg-success/20 text-success' :
                          product.classification === 'B' ? 'bg-primary/20 text-primary' :
                          'bg-text-secondary/20 text-text-secondary'
                        }`}>
                          {product.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-right">{Number(product.quantity).toFixed(4)} {product.unit}</td>
                      <td className="px-4 py-3 text-right font-mono">${product.totalValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {product.cumulativePercentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm lg:col-span-1 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
          <h2 className="text-lg font-semibold text-text mb-4">Recomendaciones</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 shadow-[inset_0_0_15px_rgba(34,197,94,0.05)]">
              <h3 className="font-medium text-success text-sm mb-1">Productos Clase A</h3>
              <p className="text-xs text-text-secondary">
                Representan el 80% del valor de tu inventario. Requieren control estricto, conteos cíclicos frecuentes y negociaciones cuidadosas con proveedores.
              </p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 shadow-[inset_0_0_15px_rgba(205,164,52,0.05)]">
              <h3 className="font-medium text-primary text-sm mb-1">Productos Clase B</h3>
              <p className="text-xs text-text-secondary">
                Representan el 15% del valor. Mantén un control moderado y revisa sus niveles de stock periódicamente.
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-bg/50 p-4">
              <h3 className="font-medium text-text text-sm mb-1">Productos Clase C</h3>
              <p className="text-xs text-text-secondary">
                Representan solo el 5% del valor pero suelen ser la mayoría de los items. Usa controles visuales simples y pedidos automáticos (ROP).
              </p>
            </div>
            
            {lowStockProducts.length > 0 && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 mt-4 shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]">
                <h3 className="font-medium text-danger text-sm mb-1 flex items-center gap-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  <AlertTriangle className="h-4 w-4" />
                  Atención Requerida
                </h3>
                <p className="text-xs text-text-secondary">
                  Tienes {lowStockProducts.length} producto(s) por debajo del stock mínimo. Revisa el módulo de inventario para reabastecer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
