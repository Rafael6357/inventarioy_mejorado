import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
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
  X,
  History,
  ChevronRight,
  DollarSign,
  FileText,
  LockOpen
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDatabaseStore, MODULE_ROLES } from '../store/dbStore';
import InventarioYLogo from '../components/InventarioYLogo';
import SubscriptionBanner from '../components/SubscriptionBanner';
import SyncStatus from '../components/SyncStatus';
import PinModal from '../components/PinModal';
import StockView from './dashboard/StockView';
import InventoryView from './dashboard/InventoryView';
import TransitView from './dashboard/TransitView';
import MovementsView from './dashboard/MovementsView';
import SalesView from './dashboard/SalesView';
import HRView from './dashboard/HRView';
import RecipesView from './dashboard/RecipesView';
import AnalysisView from './dashboard/AnalysisView';
import ChartsView from './dashboard/ChartsView';
import ConsumptionView from './dashboard/ConsumptionView';
import FilteredCenterView from './dashboard/FilteredCenterView';
import AIView from './dashboard/AIView';
import SettingsView from './dashboard/SettingsView';
import ActionLogsView from './dashboard/ActionLogsView';
import PaymentsView from './dashboard/PaymentsView';
import DailyClosingsView from './dashboard/DailyClosingsView';
import { UpdateSettings } from '../types/updater';

interface DashboardProps {
  updateSettings?: UpdateSettings;
  onToggleAutoUpdate?: (enabled: boolean) => void;
  onToggleEnabled?: (enabled: boolean) => void;
  appVersion?: string;
  isLoadingVersion?: boolean;
  onRefreshVersion?: () => void;
}

export default function Dashboard({ updateSettings, onToggleAutoUpdate, onToggleEnabled, appVersion = '1.0.0', isLoadingVersion = false, onRefreshVersion }: DashboardProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading, initialize } = useAuthStore();
  const { fetchAll, isLoading: dbLoading, accessPins, verifiedRole, clearVerifiedRole, verifyPinSimple } = useDatabaseStore();
  const [localVerifiedRole, setLocalVerifiedRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('verifiedRole');
    }
    return null;
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [showInitialPinModal, setShowInitialPinModal] = useState(false);
  const [pendingModule, setPendingModule] = useState('');
  const [moduleAllowed, setModuleAllowed] = useState<Record<string, boolean>>({});

  const baseNav = useMemo(() => [
    // INVENTARIO
    { name: 'Almacén', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
    { name: 'Movimientos', href: '/dashboard/movements', icon: History },
    { name: 'Tránsito', href: '/dashboard/transit', icon: ArrowRightLeft },
    // VENTAS
    { name: 'Ventas', href: '/dashboard/sales', icon: ShoppingCart },
    { name: 'Cierres de Caja', href: '/dashboard/closings', icon: DollarSign },
    // PRODUCCIÓN
    { name: 'Recetas', href: '/dashboard/recipes', icon: ChefHat },
    { name: 'Consumo', href: '/dashboard/consumption', icon: TrendingUp },
    // ANÁLISIS
    { name: 'Análisis', href: '/dashboard/analysis', icon: BarChart3 },
    { name: 'Gráficos', href: '/dashboard/charts', icon: PieChart },
    { name: 'Centro Filtrado', href: '/dashboard/filtered', icon: Filter },
    { name: 'Asistente IA', href: '/dashboard/ai', icon: Sparkles },
    // RRHH
    { name: 'RRHH', href: '/dashboard/hr', icon: Users },
    // CONFIGURACIÓN
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
    { name: 'Registro de Acciones', href: '/dashboard/action-logs', icon: FileText, requiresOwnerPin: true },
  ], []);

  const navigation = useMemo(() => {
    if (user?.role === 'admin') {
      return [...baseNav, { name: 'Gestión de Pagos', href: '/dashboard/payments', icon: CreditCard }];
    }
    return baseNav;
  }, [user?.role, baseNav]);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && accessPins.length > 0 && !localVerifiedRole) {
      setShowInitialPinModal(true);
    }
  }, [user, accessPins, localVerifiedRole]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // No limpiar el localStorage al recargar - permitir persistencia
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const currentPath = location.pathname.replace('/dashboard', '') || '/';
    if (currentPath === '/') return;
    
    const requiredRoles = MODULE_ROLES[currentPath];
    if (!requiredRoles || requiredRoles.length === 0) {
      setModuleAllowed(prev => ({ ...prev, [currentPath]: true }));
      return;
    }

    const anyPinExists = accessPins && accessPins.length > 0;
    const hasOwnerPin = accessPins?.some(p => p.role === 'owner');
    const isSettingsWithoutOwnerPin = currentPath === '/settings' && !hasOwnerPin;
    
    if (!anyPinExists || isSettingsWithoutOwnerPin) {
      setModuleAllowed(prev => ({ ...prev, [currentPath]: true }));
      return;
    }

    if (verifiedRole && requiredRoles.includes(verifiedRole)) {
      setModuleAllowed(prev => ({ ...prev, [currentPath]: true }));
      return;
    }

    const userPin = accessPins.find(p => p.is_active && requiredRoles.includes(p.role));
    if (!userPin) {
      setModuleAllowed(prev => ({ ...prev, [currentPath]: false }));
      setPendingModule(currentPath);
      setShowPinModal(true);
      return;
    }

    if (moduleAllowed[currentPath] === undefined) {
      setModuleAllowed(prev => ({ ...prev, [currentPath]: false }));
      setPendingModule(currentPath);
      setShowPinModal(true);
    }
  }, [location.pathname, accessPins, verifiedRole]);

  const handleSidebarMouseEnter = () => {
    setIsSidebarVisible(true);
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }
  };

  const handleSidebarMouseLeave = () => {
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarVisible(false);
    }, 500);
  };

  useEffect(() => {
    handleSidebarMouseLeave();
    return () => {
      if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mb-2"><InventarioYLogo size="xl" /></div>
          <p className="text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    console.log('handleLogout ejecutado');
    clearVerifiedRole();
    localStorage.removeItem('verifiedRole');
    setLocalVerifiedRole(null);
    await logout();
    console.log('logout completado');
  };

  const bannerPadding = user?.isSubscriptionActive === false ? 'pt-16' : '';

  return (
    <div className={`flex h-screen overflow-hidden bg-bg ${bannerPadding}`}>
      <SubscriptionBanner />
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div 
        className="fixed inset-y-0 left-0 w-4 z-40 hidden lg:flex items-center justify-center group"
        onMouseEnter={handleSidebarMouseEnter}
      >
        {!isSidebarVisible && (
          <div className="absolute left-0 w-6 h-12 bg-surface/80 border border-border/50 border-l-0 rounded-r-xl flex items-center justify-center shadow-[0_0_10px_rgba(255,193,7,0.2)] transition-all group-hover:w-8 group-hover:bg-surface cursor-pointer">
            <ChevronRight className="h-4 w-4 text-primary animate-pulse" />
          </div>
        )}
      </div>

      <aside
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border/50 bg-surface/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen || isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <InventarioYLogo size="lg" />
          </div>
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsSidebarVisible(false);
            }} 
            className="text-danger/80 hover:text-danger transition-colors"
          >
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
                      ? 'bg-gradient-to-r from-primary/20 to-transparent border-l-2 border-primary shadow-[inset_0_0_20px_rgba(255,193,7,0.05)]'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.5)]' : 'text-text-secondary'}`} />
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
                {user.subscription.status === 'trialing' ? 'Prueba Gratis' : 'Plan Profesional'}
              </div>
            </div>
            {verifiedRole && (
              <div className="mb-3 px-3">
                <div className="flex items-center justify-between rounded-lg bg-warning/10 border border-warning/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <LockOpen className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-warning">
                      Sesión: {verifiedRole === 'owner' ? 'Dueño/a' : verifiedRole === 'economist' ? 'Económico/a' : verifiedRole === 'admin' ? 'Administrador/a' : verifiedRole === 'supervisor' ? 'Supervisor/a' : 'Dependiente/a'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      clearVerifiedRole();
                      setLocalVerifiedRole(null);
                    }}
                    className="text-xs text-text-secondary hover:text-warning"
                    title="Cerrar sesión de PIN"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
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

      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        <header className="flex h-16 items-center justify-between border-b border-border/50 bg-surface/80 backdrop-blur-xl px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <InventarioYLogo size="lg" />
            <SyncStatus />
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
            <Route path="/movements" element={<MovementsView />} />
            <Route path="/transit" element={<TransitView />} />
            <Route path="/sales" element={<SalesView />} />
            <Route path="/closings" element={<DailyClosingsView />} />
            <Route path="/hr" element={<HRView />} />
            <Route path="/recipes" element={<RecipesView />} />
            <Route path="/consumption" element={<ConsumptionView />} />
            <Route path="/analysis" element={<AnalysisView />} />
            <Route path="/charts" element={<ChartsView />} />
            <Route path="/filtered" element={<FilteredCenterView />} />
            <Route path="/ai" element={<AIView />} />
            <Route path="/settings" element={<SettingsView appVersion={appVersion} isLoadingVersion={isLoadingVersion} onRefreshVersion={onRefreshVersion} />} />
            <Route path="/action-logs" element={<ActionLogsView />} />
            {user.role === 'admin' && (
              <Route path="/payments" element={<PaymentsView />} />
            )}
          </Routes>
        </main>

        <PinModal
          isOpen={showPinModal}
          moduleName={pendingModule}
          onSuccess={() => {
            setShowPinModal(false);
            setLocalVerifiedRole(localStorage.getItem('verifiedRole'));
            setModuleAllowed(prev => ({ ...prev, [pendingModule]: true }));
          }}
          onCancel={() => {
            setShowPinModal(false);
            navigate('/dashboard');
          }}
        />

        <PinModal
          isOpen={showInitialPinModal}
          moduleName="/"
          isInitialVerification={true}
          onSuccess={() => {
            setShowInitialPinModal(false);
            setLocalVerifiedRole(localStorage.getItem('verifiedRole'));
          }}
          onCancel={() => {
            logout();
          }}
        />

        {!moduleAllowed[location.pathname.replace('/dashboard', '') || '/'] && location.pathname !== '/dashboard' && (
          <div className="fixed inset-0 z-40 bg-surface/80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-secondary">Verificando acceso...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
