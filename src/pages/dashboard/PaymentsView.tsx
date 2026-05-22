import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { CreditCard, Search, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Calendar, DollarSign, Eye } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { validateNumber, getNumberFromString } from '../../lib/utils';

interface ProfilePayment {
  id: string;
  email: string;
  name: string;
  business_name: string;
  role: 'admin' | 'user';
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_ends_at: string;
  valid_until: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  user_id: string;
  admin_id: string | null;
  amount: number;
  payment_method: string;
  reference: string;
  notes: string;
  payment_date: string;
  created_at: string;
}

export default function PaymentsView() {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<ProfilePayment[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ProfilePayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [subscriptionDays, setSubscriptionDays] = useState<30 | 365>(30);
  const isMountedRef = useRef(true);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalProfiles, setTotalProfiles] = useState(0);
  
  // Filtro por estado de suscripción
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trialing' | 'past_due' | 'canceled'>('all');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkOnline = () => {
      const online = navigator.onLine;
      setIsOffline(!online);
    };
    checkOnline();
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, []);

  const getDaysRemaining = (profile: ProfilePayment): number => {
    if (profile.subscription_status === 'active' && profile.valid_until) {
      const days = Math.ceil((new Date(profile.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    }
    if (profile.subscription_status === 'trialing' && profile.trial_ends_at) {
      const days = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const fetchProfiles = useCallback(async (page = 1) => {
    if (!isMountedRef.current) return;
    setLoading(true);
    
    let timeoutId: NodeJS.Timeout;
    let isCancelled = false;

    const fetchWithTimeout = async (ms: number) => {
      // Primero obtener el total de perfiles
      const countPromise = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Luego obtener los perfiles de la página actual
      const offset = (page - 1) * itemsPerPage;
      const dataPromise = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
      });

      try {
        const [countResult, dataResult] = await Promise.all([
          Promise.race([countPromise, timeoutPromise]),
          Promise.race([dataPromise, timeoutPromise])
        ]);
        clearTimeout(timeoutId);
        return { count: countResult, data: dataResult };
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      console.log('Iniciando consulta a profiles... página', page);
      const queryStart = Date.now();
      
      const result = await fetchWithTimeout(20000) as { count?: { count: number | null }; data?: { data: ProfilePayment[]; error: Error | null } };
      
      // Extraer correctamente los datos de la respuesta
      const countResponse = result?.count;
      const dataResponse = result?.data;
      
      const profilesData = dataResponse?.data || [];
      const countValue = countResponse?.count ?? null;
      const error = dataResponse?.error;

      console.log('Consulta completada en', Date.now() - queryStart, 'ms');
      console.log('Perfiles obtenidos:', profilesData);
      console.log('Total count:', countValue);

      if (isCancelled) return;

      if (error) {
        console.error('Error cargando perfiles:', error);
        toast.error('Error al cargar los perfiles: ' + error.message);
        setLoading(false);
      } else {
        // Usar fallback: si count es null, usar la longitud de los datos obtidos
        const totalCount = countValue !== null ? countValue : (profilesData?.length || 0);
        setTotalProfiles(totalCount);
        
        if (!profilesData || profilesData.length === 0) {
          console.log('No se encontraron perfiles en la base de datos');
          toast.info('No hay usuarios registrados');
          setProfiles([]);
          setPayments({});
          setLoading(false);
        } else {
          setProfiles(profilesData);
          const allPayments: Record<string, Payment[]> = {};
          for (const p of profilesData) {
            const { data: pmt } = await supabase
              .from('payments')
              .select('*')
              .eq('user_id', p.id)
              .order('payment_date', { ascending: false });
            if (isMountedRef.current) {
              allPayments[p.id] = pmt || [];
            }
          }
          if (isMountedRef.current) {
            setPayments(allPayments);
          }
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Excepción en fetchProfiles:', err);
      toast.error('Error al cargar los perfiles');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    console.log('PaymentsView - user:', user);
    console.log('PaymentsView - user.role:', user?.role);
    
    if (!user) {
      console.log('PaymentsView - Usuario no autenticado');
      return;
    }
    
    console.log('PaymentsView - Llamando fetchProfiles página', currentPage);
    fetchProfiles(currentPage);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [user, fetchProfiles, currentPage]);

  const handleStatusChange = async (profile: ProfilePayment, newStatus: ProfilePayment['subscription_status'], validUntil?: string | null) => {
    if (!isMountedRef.current) return;
    setSavingStatus(true);
    const updates: Partial<ProfilePayment> = { subscription_status: newStatus };
    
    if (validUntil !== undefined) {
      updates.valid_until = validUntil;
    } else if (newStatus === 'active') {
      updates.valid_until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (newStatus === 'trialing') {
      updates.valid_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (!isMountedRef.current) return;

    if (error) {
      toast.error('Error al actualizar el estado');
    } else {
      toast.success(`Suscripción actualizada a "${newStatus}"`);
      fetchProfiles();
      if (selectedUser?.id === profile.id) {
        setSelectedUser({ ...profile, ...updates });
      }
    }
    setSavingStatus(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!isMountedRef.current) return;
    
    const confirmed = window.confirm('¿Estás seguro de eliminar este registro de pago?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (!isMountedRef.current) return;

    if (error) {
      toast.error('Error al eliminar el pago');
    } else {
      toast.success('Pago eliminado exitosamente');
      setDeletingPaymentId(null);
      fetchProfiles();
    }
  };

  const handleUpdateExpirationDate = async (profile: ProfilePayment, newDate: string) => {
    if (!newDate) return;
    setSavingStatus(true);
    const formattedDate = newDate.split('T')[0];
    const { error } = await supabase
      .from('profiles')
      .update({ valid_until: formattedDate })
      .eq('id', profile.id);

    if (!isMountedRef.current) return;

    if (error) {
      toast.error('Error al actualizar la fecha');
    } else {
      toast.success('Fecha de expiración actualizada');
      fetchProfiles();
      if (selectedUser?.id === profile.id) {
        setSelectedUser({ ...profile, valid_until: newDate });
      }
    }
    setSavingStatus(false);
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.business_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.subscription_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: totalProfiles,
    active: profiles.filter(p => p.subscription_status === 'active').length,
    trialing: profiles.filter(p => p.subscription_status === 'trialing').length,
    inactive: profiles.filter(p => ['past_due', 'canceled'].includes(p.subscription_status)).length,
  };

  const getStatusBadge = (status: ProfilePayment['subscription_status']) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 className="h-3 w-3" /> Activo</span>;
      case 'trialing':
        return <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"><AlertCircle className="h-3 w-3" /> Prueba</span>;
      case 'past_due':
        return <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><AlertCircle className="h-3 w-3" /> Vencido</span>;
      case 'canceled':
        return <span className="inline-flex items-center gap-1 rounded-full bg-text-secondary/10 px-2.5 py-1 text-xs font-medium text-text-secondary"><XCircle className="h-3 w-3" /> Cancelado</span>;
    }
  };

  const getDaysLeft = (profile: ProfilePayment) => {
    if (profile.subscription_status === 'active' && profile.valid_until) {
      const days = Math.ceil((new Date(profile.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} días` : 'Vencido';
    }
    if (profile.subscription_status === 'trialing' && profile.trial_ends_at) {
      const days = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} días` : 'Vencido';
    }
    return '-';
  };

  const openPaymentModal = (profile: ProfilePayment) => {
    setSelectedUser(null);
    setTimeout(() => {
      if (isMountedRef.current) {
        setSelectedUser(profile);
        setShowPaymentModal(true);
        setDeletingPaymentId(null);
      }
    }, 0);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSubscriptionDays(30);
    setTimeout(() => {
      if (isMountedRef.current) {
        setSelectedUser(null);
        setDeletingPaymentId(null);
      }
    }, 100);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-danger mb-4" />
          <h2 className="text-2xl font-bold text-text">Acceso Denegado</h2>
          <p className="mt-2 text-text-secondary">No tienes permisos para ver este módulo.</p>
        </div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-warning mb-4" />
          <h2 className="text-2xl font-bold text-text">Sin Conexión</h2>
          <p className="mt-2 text-text-secondary">
            Este módulo requiere conexión a internet.<br />
            Por favor, conéctate a internet para acceder a la gestión de pagos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Gestión de Suscripciones
        </h1>
        <p className="text-sm text-text-secondary">
          Administra las suscripciones y pagos de todos los negocios registrados.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Negocios</p>
              <p className="text-2xl font-bold text-text">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Suscripciones Activas</p>
              <p className="text-2xl font-bold text-text">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2 text-warning">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">En Prueba (Trial)</p>
              <p className="text-2xl font-bold text-text">{stats.trialing}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-danger/10 p-2 text-danger">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Inactivos / Vencidos</p>
              <p className="text-2xl font-bold text-text">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por nombre, email o negocio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          
          {/* Filtros por estado de suscripción */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-primary text-black' 
                  : 'bg-bg text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                statusFilter === 'active' 
                  ? 'bg-success text-white' 
                  : 'bg-success/10 text-success hover:bg-success/20'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" /> Activos
            </button>
            <button
              onClick={() => { setStatusFilter('trialing'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                statusFilter === 'trialing' 
                  ? 'bg-warning text-black' 
                  : 'bg-warning/10 text-warning hover:bg-warning/20'
              }`}
            >
              <AlertCircle className="h-3 w-3" /> Prueba
            </button>
            <button
              onClick={() => { setStatusFilter('past_due'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                statusFilter === 'past_due' 
                  ? 'bg-danger text-white' 
                  : 'bg-danger/10 text-danger hover:bg-danger/20'
              }`}
            >
              Vencidos
            </button>
            <button
              onClick={() => { setStatusFilter('canceled'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${
                statusFilter === 'canceled' 
                  ? 'bg-text-secondary text-white' 
                  : 'bg-bg text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <XCircle className="h-3 w-3" /> Cancelados
            </button>
          </div>
          
          <span className="text-sm text-text-secondary shrink-0">
            {filteredProfiles.length} / {totalProfiles} negocio{totalProfiles !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text [&_tr]:divide-y [&_tr]:divide-border">
            <thead className="bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Negocio / Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Días Restantes</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    Cargando...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{p.business_name || p.name || 'Sin nombre'}</p>
                      <p className="text-xs text-text-secondary">{p.name || 'Sin nombre'}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {p.email}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(p.subscription_status)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={p.subscription_status === 'trialing' ? 'text-warning' : p.subscription_status === 'active' ? 'text-success' : 'text-text-secondary'}>
                        {getDaysLeft(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => openPaymentModal(p)}
                        className="flex items-center gap-1 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        title="Gestionar suscripción y registrar pago"
                      >
                        <DollarSign className="h-3 w-3" />
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {totalProfiles > itemsPerPage && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              Página {currentPage} de {Math.ceil(totalProfiles / itemsPerPage)}
            </div>
          <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              {Array.from({ length: Math.min(5, Math.ceil(totalProfiles / itemsPerPage)) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalProfiles / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(totalProfiles / itemsPerPage)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment & History Modal */}
      {showPaymentModal && selectedUser && (
        <div key={selectedUser.id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text">{selectedUser.business_name || selectedUser.name}</h3>
                <p className="text-xs text-text-secondary">{selectedUser.email}</p>
              </div>
              <button 
                onClick={() => closePaymentModal()}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Current Status */}
              <div className="rounded-lg border border-border bg-bg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary">Estado Actual</p>
                    <div className="mt-1">{getStatusBadge(selectedUser.subscription_status)}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Días Restantes</p>
                    <p className="mt-1 font-bold text-text">{getDaysLeft(selectedUser)}</p>
                  </div>
                </div>
                {selectedUser.subscription_status !== 'canceled' && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button 
                      onClick={() => {
                        if (window.confirm('¿Estás seguro de cancelar la suscripción de este usuario?')) {
                          handleStatusChange(selectedUser, 'canceled');
                        }
                      }}
                      disabled={savingStatus}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" /> Cancelar Suscripción
                    </button>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="text-sm font-medium text-text mb-2 flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Historial de Pagos
                </h4>
                {(payments[selectedUser.id] || []).length === 0 ? (
                  <p className="text-sm text-text-secondary italic">Sin pagos registrados.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(payments[selectedUser.id] || []).map(pmt => (
                      <div key={pmt.id} className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-xs">
                        <div>
                          <p className="font-medium text-text">
                            ${Number(pmt.amount).toLocaleString('es-CO')} 
                            {pmt.payment_method && <span className="text-text-secondary ml-1">({pmt.payment_method})</span>}
                          </p>
                          <p className="text-text-secondary">
                            {new Date(pmt.payment_date).toLocaleDateString('es-ES')} 
                            {pmt.reference && <span className="ml-1">· Ref: {pmt.reference}</span>}
                          </p>
                          {pmt.notes && <p className="text-text-secondary italic">{pmt.notes}</p>}
                        </div>
                        <button 
                          onClick={() => {
                            setDeletingPaymentId(pmt.id);
                            handleDeletePayment(pmt.id);
                          }}
                          disabled={deletingPaymentId === pmt.id}
                          className="ml-2 rounded p-1 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                          title="Eliminar pago"
                        >
                          {deletingPaymentId === pmt.id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-danger border-t-transparent" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Payment Form */}
              <div className="rounded-lg border border-border bg-bg p-3">
                <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Registrar Pago Manual
                </h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const amount = (form.elements.namedItem('amount') as HTMLInputElement).value;
                  const method = (form.elements.namedItem('method') as HTMLInputElement).value;
                  const reference = (form.elements.namedItem('reference') as HTMLInputElement).value;
                  const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                  const date = (form.elements.namedItem('date') as HTMLInputElement).value;

                  const amountValidation = validateNumber(amount, { required: true, min: 1, fieldName: 'Monto' });
                  if (!amountValidation.isValid) {
                    toast.error(amountValidation.error);
                    return;
                  }

                  const currentDays = getDaysRemaining(selectedUser!);
                  if (selectedUser!.subscription_status === 'active' && currentDays > 0) {
                    const confirmed = window.confirm(
                      `El usuario ya tiene ${currentDays} días restantes. ¿Está seguro de activar por ${subscriptionDays} días adicionales?`
                    );
                    if (!confirmed) return;
                  }

                  const { error: paymentError } = await supabase.from('payments').insert({
                    user_id: selectedUser.id,
                    admin_id: user?.id,
                    amount: Number(amount),
                    payment_method: method || 'No especificado',
                    reference: reference,
                    notes: notes,
                    payment_date: date || new Date().toISOString().split('T')[0],
                  });

                  if (paymentError) {
                    toast.error('Error al registrar el pago');
                    return;
                  }

                  const now = new Date();
                  let startDate = now;

                  // Solo extendemos si el estado es 'active' y la fecha actual es futura.
                  // Si está cancelado, trialing o past_due, empezamos desde ahora.
                  if (selectedUser.subscription_status === 'active' && selectedUser.valid_until) {
                    const currentValidDate = new Date(selectedUser.valid_until);
                    if (currentValidDate > now) {
                      startDate = currentValidDate;
                    }
                  }

                  const newDate = new Date(startDate.getTime() + (subscriptionDays * 24 * 60 * 60 * 1000));
                  const formattedDate = newDate.toISOString().split('T')[0];

                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ 
                      subscription_status: 'active',
                      valid_until: formattedDate 
                    })
                    .eq('id', selectedUser.id);

                  if (updateError) {
                    toast.error('Pago registrado pero error al activar suscripción');
                  } else {
                    toast.success(`Pago registrado y suscripción activada por ${subscriptionDays} días`);
                  }

                  setSubscriptionDays(30);
                  form.reset();
                  fetchProfiles();
                  setShowPaymentModal(false);
                }} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-text-secondary">Monto *</label>
                      <input name="amount" type="number" min="1" step="0.01" required placeholder="50000" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary">Fecha</label>
                      <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-text-secondary">Método de Pago</label>
                      <select name="method" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="Transferencia">Transferencia</option>
                        <option value="Efectivo">Efectivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary">Referencia</label>
                      <input name="reference" type="text" placeholder="N° comprobante" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary">Notas</label>
                    <textarea name="notes" rows={2} placeholder="Observaciones..." className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </div>

                  <div className="rounded-lg border border-border bg-bg p-3 space-y-2">
                    <span className="text-sm font-medium text-text">Activar Suscripción:</span>
                    <div className="flex gap-4 ml-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="subscriptionDays"
                          checked={subscriptionDays === 30}
                          onChange={() => setSubscriptionDays(30)}
                          className="w-4 h-4 text-primary border-border focus:ring-primary"
                        />
                        <span className="text-sm text-text">30 días (1 mes)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="subscriptionDays"
                          checked={subscriptionDays === 365}
                          onChange={() => setSubscriptionDays(365)}
                          className="w-4 h-4 text-primary border-border focus:ring-primary"
                        />
                        <span className="text-sm text-text">365 días (1 año)</span>
                      </label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full text-sm">
                    {`Registrar Pago y Activar Suscripción (${subscriptionDays} días)`}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
