import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { PieChart as PieChartIcon, BarChart3, TrendingUp } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ChartsView() {
  const { sales, products, movements } = useDatabaseStore();

  // 1. Sales Over Time (Line Chart)
  const salesOverTime = useMemo(() => {
    const grouped = sales.reduce((acc, sale) => {
      const date = new Date(sale.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + sale.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, total]) => ({ date, total }))
      .slice(-14); // Last 14 days with sales
  }, [sales]);

  // 2. Top Selling Products (Bar Chart)
  const topProducts = useMemo(() => {
    const productSales = sales.flatMap(s => s.items).reduce((acc, item) => {
      const product = products.find(p => p.id === item.product_id);
      const name = product ? product.name : 'Desconocido';
      acc[name] = (acc[name] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // Top 5
  }, [sales, products]);

  // 3. Movements Distribution (Pie Chart)
  const movementsDistribution = useMemo(() => {
    const dist = movements.reduce((acc, mov) => {
      acc[mov.type] = (acc[mov.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [movements]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Gráficos y Visualizaciones</h1>
        <p className="text-sm text-text-secondary">
          Representación visual del rendimiento de tu negocio
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Over Time Chart */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Evolución de Ventas</h2>
          </div>
          
          <div className="h-[300px] w-full">
            {salesOverTime.length === 0 ? (
              <div className="flex h-full items-center justify-center text-text-secondary">
                No hay datos de ventas suficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesOverTime} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                  />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Top 5 Productos Más Vendidos</h2>
          </div>
          
          <div className="h-[250px] w-full">
            {topProducts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-text-secondary">
                No hay datos de ventas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }}
                    cursor={{ fill: '#333', opacity: 0.4 }}
                    formatter={(value: number) => [value, 'Unidades']}
                  />
                  <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Movements Distribution Chart */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <PieChartIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Distribución de Movimientos</h2>
          </div>
          
          <div className="h-[250px] w-full">
            {movementsDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-text-secondary">
                No hay movimientos registrados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={movementsDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {movementsDistribution.map((entry, index) => {
                      // Custom colors based on movement type
                      let color = COLORS[index % COLORS.length];
                      if (entry.name === 'ENTRADA') color = '#10b981'; // success
                      if (entry.name === 'SALIDA') color = '#6366f1'; // primary
                      if (entry.name === 'MERMA') color = '#ef4444'; // danger
                      
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }}
                    formatter={(value: number) => [value, 'Registros']}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
