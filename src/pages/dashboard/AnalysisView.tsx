import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { TrendingUp, DollarSign, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function AnalysisView() {
  const { products, sales, movements } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  // 1. KPI Calculations
  const totalInventoryValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + (p.quantity * p.cost), 0);
  }, [activeProducts]);

  const totalSalesRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.total_amount, 0);
  }, [sales]);

  const totalCostOfGoodsSold = useMemo(() => {
    return sales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);
  }, [sales]);

  const grossProfit = totalSalesRevenue - totalCostOfGoodsSold;
  const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  // 2. ABC Analysis (Activity-Based Costing / Pareto)
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

  // 3. Low Stock Alerts
  const lowStockProducts = activeProducts.filter(p => p.quantity <= p.stock_min);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Análisis y Rentabilidad</h1>
        <p className="text-sm text-text-secondary">
          Métricas clave del negocio y clasificación ABC de inventario
        </p>
      </div>

      {/* KPI Cards */}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ABC Analysis Table */}
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
                      <td className="px-4 py-3 text-right">{product.quantity} {product.unit}</td>
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

        {/* Actionable Insights */}
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
