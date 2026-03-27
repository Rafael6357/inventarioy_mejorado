import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { CreditCard, Search, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Calendar, DollarSign, Eye } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar los perfiles');
    } else {
      setProfiles(data || []);
      const allPayments: Record<string, Payment[]> = {};
      for (const p of (data || [])) {
        const { data: pmt } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', p.id)
          .order('payment_date', { ascending: false });
        allPayments[p.id] = pmt || [];
      }
      setPayments(allPayments);
    }
    setLoading(false);
  };

  const handleStatusChange = async (profile: ProfilePayment, newStatus: ProfilePayment['subscription_status'], validUntil?: string | null) => {
    setSavingStatus(true);
    const updates: Partial<ProfilePayment> = { subscription_status: newStatus };
    if (validUntil !== undefined) {
      updates.valid_until = validUntil;
    }
    if (newStatus === 'active' && !validUntil) {
      updates.valid_until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

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

  const filteredProfiles = profiles.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.business_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: profiles.length,
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
    setSelectedUser(profile);
    setShowPaymentModal(true);
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
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por nombre, email o negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-text-secondary shrink-0">
            {filteredProfiles.length} negocio{filteredProfiles.length !== 1 ? 's' : ''}
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
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openPaymentModal(p)}
                          className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          title="Registrar pago"
                        >
                          <DollarSign className="h-3 w-3" />
                          Pago
                        </button>
                        {p.subscription_status !== 'active' && (
                          <button 
                            onClick={() => handleStatusChange(p, 'active')}
                            disabled={savingStatus}
                            className="rounded-md bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                          >
                            Activar
                          </button>
                        )}
                        {p.subscription_status === 'active' && (
                          <button 
                            onClick={() => handleStatusChange(p, 'canceled')}
                            disabled={savingStatus}
                            className="rounded-md bg-danger/10 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                          >
                            Suspender
                          </button>
                        )}
                        {p.subscription_status === 'trialing' && (
                          <button 
                            onClick={() => handleStatusChange(p, 'past_due')}
                            disabled={savingStatus}
                            className="rounded-md bg-danger/10 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                          >
                            Marcar Vencido
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment & History Modal */}
      {showPaymentModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text">{selectedUser.business_name || selectedUser.name}</h3>
                <p className="text-xs text-text-secondary">{selectedUser.email}</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
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
                {selectedUser.valid_until && (
                  <p className="mt-2 text-xs text-text-secondary">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Válido hasta: {new Date(selectedUser.valid_until).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleStatusChange(selectedUser, 'active')}
                  disabled={savingStatus || selectedUser.subscription_status === 'active'}
                  className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3 w-3" /> Activar Suscripción
                </button>
                <button 
                  onClick={() => handleStatusChange(selectedUser, 'canceled')}
                  disabled={savingStatus || selectedUser.subscription_status === 'canceled'}
                  className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-3 w-3" /> Suspender
                </button>
                <button 
                  onClick={() => handleStatusChange(selectedUser, 'trialing')}
                  disabled={savingStatus || selectedUser.subscription_status === 'trialing'}
                  className="flex items-center gap-1 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
                >
                  <AlertCircle className="h-3 w-3" /> Resetear a Prueba
                </button>
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

                  if (!amount || Number(amount) <= 0) {
                    toast.error('Ingresa un monto válido');
                    return;
                  }

                  const { error } = await supabase.from('payments').insert({
                    user_id: selectedUser.id,
                    admin_id: user?.id,
                    amount: Number(amount),
                    payment_method: method || 'No especificado',
                    reference: reference,
                    notes: notes,
                    payment_date: date || new Date().toISOString().split('T')[0],
                  });

                  if (error) {
                    toast.error('Error al registrar el pago');
                  } else {
                    toast.success('Pago registrado exitosamente');
                    fetchProfiles();
                  }
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
                  <Button type="submit" className="w-full text-sm">
                    Registrar Pago
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
