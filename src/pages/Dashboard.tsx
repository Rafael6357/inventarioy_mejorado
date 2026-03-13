import { useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Box, 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  ShoppingCart, 
  Users, 
  ChefHat, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Filter, 
  Sparkles, 
  Settings, 
  CreditCard,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import StockView from './dashboard/StockView';
import InventoryView from './dashboard/InventoryView';
import TransitView from './dashboard/TransitView';
import SalesView from './dashboard/SalesView';
import HRView from './dashboard/HRView';
import RecipesView from './dashboard/RecipesView';
import AnalysisView from './dashboard/AnalysisView';
import ChartsView from './dashboard/ChartsView';
import ConsumptionView from './dashboard/ConsumptionView';
import FilteredCenterView from './dashboard/FilteredCenterView';
import AIView from './dashboard/AIView';
import SettingsView from './dashboard/SettingsView';
import PaymentsView from './dashboard/PaymentsView';

// Placeholder views
const PlaceholderView = ({ title }: { title: string }) => (
  <div className="flex h-full items-center justify-center p-8">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-text">{title}</h2>
      <p className="mt-2 text-text-secondary">Módulo en construcción</p>
    </div>
  </div>
);

export default function Dashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    { name: 'Stock Actual', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
    { name: 'Tránsitos', href: '/dashboard/transit', icon: ArrowRightLeft },
    { name: 'Ventas', href: '/dashboard/sales', icon: ShoppingCart },
    { name: 'RRHH', href: '/dashboard/hr', icon: Users },
    { name: 'Recetas', href: '/dashboard/recipes', icon: ChefHat },
    { name: 'Consumo', href: '/dashboard/consumption', icon: TrendingUp },
    { name: 'Análisis', href: '/dashboard/analysis', icon: BarChart3 },
    { name: 'Gráficos', href: '/dashboard/charts', icon: PieChart },
    { name: 'Centro Filtrado', href: '/dashboard/filtered', icon: Filter },
    { name: 'Asistente IA', href: '/dashboard/ai', icon: Sparkles },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  if (user.role === 'admin') {
    navigation.push({ name: 'Gestión de Pagos', href: '/dashboard/payments', icon: CreditCard });
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border/50 bg-surface/80 backdrop-blur-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]" />
            <span className="text-xl font-bold text-text text-gradient">InventarioY</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-text-secondary">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(100vh-4rem)] flex-col justify-between overflow-y-auto p-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href === '/dashboard' && location.pathname === '/dashboard/');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-2 border-primary shadow-[inset_0_0_20px_rgba(205,164,52,0.05)]'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]' : 'text-text-secondary'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-border pt-4">
            <div className="mb-4 px-3">
              <p className="text-sm font-medium text-text">{user.name}</p>
              <p className="text-xs text-text-secondary truncate">{user.email}</p>
              <div className="mt-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {user.subscription.status === 'trialing' ? 'Prueba Gratis' : 'Plan Pro'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        <header className="flex h-16 items-center justify-between border-b border-border/50 bg-surface/80 backdrop-blur-xl px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]" />
            <span className="text-xl font-bold text-text text-gradient">InventarioY</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-text-secondary hover:text-text"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<StockView />} />
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/transit" element={<TransitView />} />
            <Route path="/sales" element={<SalesView />} />
            <Route path="/hr" element={<HRView />} />
            <Route path="/recipes" element={<RecipesView />} />
            <Route path="/consumption" element={<ConsumptionView />} />
            <Route path="/analysis" element={<AnalysisView />} />
            <Route path="/charts" element={<ChartsView />} />
            <Route path="/filtered" element={<FilteredCenterView />} />
            <Route path="/ai" element={<AIView />} />
            <Route path="/settings" element={<SettingsView />} />
            {user.role === 'admin' && (
              <Route path="/payments" element={<PaymentsView />} />
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}
