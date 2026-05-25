import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Users, Phone, Search, Download, CheckCircle2, XCircle, Clock, User, Building2, ChevronLeft, ChevronRight, CreditCard, DollarSign, ShieldCheck, AlertCircle, ArrowUpDown } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { validateNumber } from '../../lib/utils';

const ITEMS_PER_PAGE = 10;

interface UserProfile {
  id: string;
  email: string;
  name: string;
  business_name: string;
  role: 'admin' | 'user';
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_ends_at: string;
  valid_until: string | null;
  created_at: string;
  phone: string;
  last_contacted_at: string | null;
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

export default function UsersView() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateOrder, setDateOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [subscriptionDays, setSubscriptionDays] = useState<30 | 365>(30);
  const isMountedRef = useRef(true);
  const lastFetchController = useRef<AbortController | null>(null);

  const totalPages = Math.ceil(totalCount / limit);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (user?.email === 'nikko6357@gmail.com') {
      fetchProfiles();
    }
  }, [page, limit, debouncedSearch, statusFilter, dateOrder, user?.email]);

  useEffect(() => {
    if (searchParams.get('filter') === 'uncontacted') {
      setStatusFilter('uncontacted');
      window.history.replaceState({}, '', '/dashboard/users');
    }
  }, [searchParams]);

  const fetchProfiles = async () => {
    if (!isMountedRef.current) return;

    if (lastFetchController.current) {
      lastFetchController.current.abort();
    }
    const controller = new AbortController();
    lastFetchController.current = controller;
    setLoading(true);

    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let countQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('profiles')
        .select('id, email, name, business_name, role, subscription_status, trial_ends_at, valid_until, created_at, phone, last_contacted_at')
        .order('created_at', { ascending: dateOrder === 'asc' })
        .range(from, to);

      if (debouncedSearch) {
        const filter = `or(name.ilike.%${debouncedSearch}%,business_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%)`;
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }

      if (statusFilter === 'uncontacted') {
        countQuery = countQuery.is('last_contacted_at', null).not('phone', 'is', null).neq('phone', '');
        dataQuery = dataQuery.is('last_contacted_at', null).not('phone', 'is', null).neq('phone', '');
      } else if (statusFilter === 'past_due') {
        const now = new Date().toISOString();
        const filter = `or(subscription_status.eq.past_due,and(subscription_status.eq.trialing,trial_ends_at.lt.${now}))`;
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      } else if (statusFilter !== 'all') {
        countQuery = countQuery.eq('subscription_status', statusFilter);
        dataQuery = dataQuery.eq('subscription_status', statusFilter);
      }

      const [countResult, dataResult] = await Promise.all([
        countQuery.abortSignal(controller.signal),
        dataQuery.abortSignal(controller.signal),
      ]);

      clearTimeout(timeoutId);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;
      setProfiles(dataResult.data || []);
      setTotalCount(countResult.count || 0);
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError'
        || error?.message?.includes('timeout')
        || error?.message?.includes('Timeout');
      if (isTimeout) {
        toast.error('La consulta tardó demasiado. Intenta de nuevo.');
      } else {
        console.error('Error fetching profiles:', error);
        toast.error('Error al cargar los usuarios');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const fetchUserPayments = async (userId: string) => {
    if (!isMountedRef.current) return;
    setLoadingPayments(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) throw error;
      if (isMountedRef.current) {
        setPayments(prev => ({ ...prev, [userId]: data || [] }));
      }
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError'
        || error?.message?.includes('timeout')
        || error?.message?.includes('Timeout');
      if (isTimeout) {
        toast.error('La consulta tardó demasiado. Intenta de nuevo.');
      } else {
        console.error('Error fetching payments:', error);
        toast.error('Error al cargar los pagos');
      }
    } finally {
      if (isMountedRef.current) setLoadingPayments(false);
    }
  };

  const openPaymentModal = (profile: UserProfile) => {
    if (!isMountedRef.current) return;
    setSelectedUser(profile);
    setShowPaymentModal(true);
    fetchUserPayments(profile.id);
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

  const getDaysLeft = (profile: UserProfile) => {
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

  const getDaysRemaining = (profile: UserProfile): number => {
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

  const getEffectiveStatus = (profile: UserProfile) => {
    if (profile.subscription_status === 'trialing' && profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date()) {
      return 'past_due';
    }
    return profile.subscription_status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 8) {
      cleanPhone = '53' + cleanPhone;
    }
    const message = encodeURIComponent(
      `Saludos usuario, gracias por registrarse en InventarioY a través de nuestra publicación, su sistema de gestión y control de inventario pensado para negocios cubanos como el suyo. Quien comunica es el desarrollador y estoy a su disposición para brindarle asesoría personalizada y resolver cualquier duda que pueda tener sobre la plataforma. ¿Le gustaría que le explique las funcionalidades principales para llevar el control adecuado de sus entradas y salidas de almacén, o sus recetas, productos vendidos, finanzas, margen? Nuestro sistema puede llevar de manera automática muchos cálculos, actualizaciones, procesos en su negocio, que un excel o de manera manual sería tedioso y muy complejo llevar a cabo.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const exportToExcel = async () => {
    try {
      toast.info('Generando Excel...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, business_name, email, phone, created_at, subscription_status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const excelData = (data || []).map(p => ({
        'Nombre': p.name,
        'Negocio': p.business_name,
        'Email': p.email,
        'Teléfono': p.phone || '',
        'Fecha de Registro': new Date(p.created_at).toLocaleDateString('es-ES'),
        'Estado': p.subscription_status === 'trialing' ? 'Prueba Gratis' :
                  p.subscription_status === 'active' ? 'Activo' :
                  p.subscription_status === 'past_due' ? 'Pendiente' : 'Desconocido'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
      ws['!cols'] = [
        { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
      ];
      XLSX.writeFile(wb, `usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar usuarios');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 className="h-3 w-3" /> Activo</span>;
      case 'trialing':
        return <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"><Clock className="h-3 w-3" /> Prueba</span>;
      case 'past_due':
        return <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"><AlertCircle className="h-3 w-3" /> Vencido</span>;
      case 'canceled':
        return <span className="inline-flex items-center gap-1 rounded-full bg-text-secondary/10 px-2.5 py-1 text-xs font-medium text-text-secondary"><XCircle className="h-3 w-3" /> Cancelado</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-text-secondary/10 px-2.5 py-1 text-xs font-medium text-text-secondary">Desconocido</span>;
    }
  };

  const handleStatusChange = async (profile: UserProfile, newStatus: UserProfile['subscription_status'], validUntil?: string | null) => {
    if (!isMountedRef.current) return;
    setSavingStatus(true);
    const updates: Partial<UserProfile> = { subscription_status: newStatus };

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
      toast.success(`Suscripción actualizada a "${newStatus === 'active' ? 'Activo' : newStatus === 'trialing' ? 'Prueba' : newStatus === 'past_due' ? 'Vencido' : 'Cancelado'}"`);
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
      if (selectedUser) {
        fetchUserPayments(selectedUser.id);
      }
      fetchProfiles();
    }
  };

  const handleContact = async (profile: UserProfile) => {
    if (!isMountedRef.current) return;
    const now = new Date().toISOString();
    // Actualización optimista local y apertura de WhatsApp (síncrono, antes del await)
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, last_contacted_at: now } : p));
    window.open(getWhatsAppLink(profile.phone), '_blank', 'noopener,noreferrer');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_contacted_at: now })
        .eq('id', profile.id);
      if (error) {
        toast.error('Error al registrar el contacto');
        setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, last_contacted_at: profile.last_contacted_at } : p));
      }
    } catch {
      toast.error('Error al registrar el contacto');
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, last_contacted_at: profile.last_contacted_at } : p));
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const stats = {
    total: totalCount,
    active: profiles.filter(p => getEffectiveStatus(p) === 'active').length,
    trialing: profiles.filter(p => getEffectiveStatus(p) === 'trialing' && !(p.trial_ends_at && new Date(p.trial_ends_at) < new Date())).length,
    inactive: profiles.filter(p => ['past_due', 'canceled'].includes(getEffectiveStatus(p))).length,
  };

  if (user?.email !== 'nikko6357@gmail.com') {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Gestión de Usuarios
        </h1>
        <p className="text-sm text-text-secondary">
          Administra los usuarios, suscripciones y pagos de todos los negocios registrados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Usuarios</p>
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
              <Clock className="h-5 w-5" />
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

      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Buscar por nombre, negocio, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${statusFilter === 'all' ? 'bg-primary text-black' : 'bg-bg text-text-secondary hover:bg-surface-hover'}`}
          >
            Todos
          </button>
          <button
            onClick={() => { setStatusFilter('active'); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'active' ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/20'}`}
          >
            <CheckCircle2 className="h-3 w-3" /> Activos
          </button>
          <button
            onClick={() => { setStatusFilter('trialing'); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'trialing' ? 'bg-warning text-black' : 'bg-warning/10 text-warning hover:bg-warning/20'}`}
          >
            <Clock className="h-3 w-3" /> Prueba
          </button>
          <button
            onClick={() => { setStatusFilter('past_due'); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'past_due' ? 'bg-danger text-white' : 'bg-danger/10 text-danger hover:bg-danger/20'}`}
          >
            Vencidos
          </button>
          <button
            onClick={() => { setStatusFilter('canceled'); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'canceled' ? 'bg-text-secondary text-white' : 'bg-bg text-text-secondary hover:bg-surface-hover'}`}
          >
            <XCircle className="h-3 w-3" /> Cancelados
          </button>
          <button
            onClick={() => { setStatusFilter('uncontacted'); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'uncontacted' ? 'bg-primary text-black' : 'bg-bg text-text-secondary hover:bg-surface-hover'}`}
          >
            <Phone className="h-3 w-3" /> Pendientes
          </button>
        </div>

        <button
          onClick={() => setDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-bg px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          title={dateOrder === 'desc' ? 'Ordenando de más reciente a más antiguo' : 'Ordenando de más antiguo a más reciente'}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {dateOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
        </button>

        <Button variant="outline" onClick={exportToExcel} className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-text-secondary mt-4">Cargando usuarios...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Días</th>
                  <th className="px-4 py-3 font-medium">Registro</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text">{profile.name}</p>
                        <p className="text-xs text-text-secondary">{profile.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-text-secondary shrink-0" />
                        <span className="text-text">{profile.business_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {profile.phone ? (
                        <span className="font-mono text-sm">{profile.phone}</span>
                      ) : (
                        <span className="text-text-secondary text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(getEffectiveStatus(profile))}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={
                        getEffectiveStatus(profile) === 'trialing' ? 'text-warning' :
                        getEffectiveStatus(profile) === 'active' ? 'text-success' :
                        'text-text-secondary'
                      }>
                        {getDaysLeft(profile)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                      {formatDate(profile.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {profile.phone && (
                          profile.last_contacted_at ? (
                            <button
                              onClick={() => handleContact(profile)}
                              className="inline-flex items-center gap-1 rounded-lg bg-text-secondary/10 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/20"
                              title={`Contactado el ${new Date(profile.last_contacted_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                            >
                              <Phone className="h-3 w-3" />
                              Recontactar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleContact(profile)}
                              className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                              Contactar
                            </button>
                          )
                        )}
                        <button
                          onClick={() => openPaymentModal(profile)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          <DollarSign className="h-3 w-3" />
                          Gestionar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-secondary">
            Mostrando {startItem}-{endItem} de {totalCount} usuarios
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-1">
              {renderPageNumbers().map((p, idx) => (
                typeof p === 'number' ? (
                  <Button
                    key={idx}
                    variant={p === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(p)}
                    className="min-w-8"
                  >
                    {p}
                  </Button>
                ) : (
                  <span key={idx} className="px-1 text-text-secondary">...</span>
                )
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="gap-1"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Por página:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {showPaymentModal && selectedUser && (
        <div key={selectedUser.id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text">{selectedUser.business_name || selectedUser.name}</h3>
                <p className="text-xs text-text-secondary">{selectedUser.email}</p>
              </div>
              <button
                onClick={closePaymentModal}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-lg border border-border bg-bg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary">Estado Actual</p>
                    <div className="mt-1">{getStatusBadge(getEffectiveStatus(selectedUser))}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Días Restantes</p>
                    <p className="mt-1 font-bold text-text">{getDaysLeft(selectedUser)}</p>
                  </div>
                </div>
                {getEffectiveStatus(selectedUser) !== 'canceled' && (
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

              <div>
                <h4 className="text-sm font-medium text-text mb-2 flex items-center gap-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Historial de Pagos
                </h4>
                {loadingPayments ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : (payments[selectedUser.id] || []).length === 0 ? (
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

              <div className="rounded-lg border border-border bg-bg p-3">
                <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Registrar Pago Manual
                </h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const amount = (form.elements.namedItem('amount') as HTMLInputElement).value;
                  const method = (form.elements.namedItem('method') as HTMLSelectElement).value;
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
                  if (isMountedRef.current) {
                    fetchUserPayments(selectedUser.id);
                  }
                  closePaymentModal();
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
