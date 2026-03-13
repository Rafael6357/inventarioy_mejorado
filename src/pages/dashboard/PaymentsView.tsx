import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { CreditCard, Search, ShieldCheck, AlertCircle, CheckCircle2, XCircle, MoreVertical } from 'lucide-react';
import { Input } from '../../components/ui/input';

// Mock data for demonstration purposes
const initialMockUsers = [
  {
    id: '1',
    name: 'Carlos Pérez',
    email: 'carlos@ejemplo.com',
    businessName: 'Cafetería El Grano',
    role: 'user',
    createdAt: '2023-10-15T10:00:00Z',
    subscription: {
      status: 'active',
      trialEndsAt: '2023-10-29T10:00:00Z',
      validUntil: '2026-12-31T23:59:59Z'
    }
  },
  {
    id: '2',
    name: 'María Gómez',
    email: 'maria@ejemplo.com',
    businessName: 'Restaurante La Plaza',
    role: 'user',
    createdAt: '2024-01-20T14:30:00Z',
    subscription: {
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      validUntil: null
    }
  },
  {
    id: '3',
    name: 'Juan Rodríguez',
    email: 'juan@ejemplo.com',
    businessName: 'Panadería San Juan',
    role: 'user',
    createdAt: '2023-08-05T09:15:00Z',
    subscription: {
      status: 'past_due',
      trialEndsAt: '2023-08-19T09:15:00Z',
      validUntil: '2024-01-05T23:59:59Z'
    }
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana@ejemplo.com',
    businessName: 'Food Truck Delicias',
    role: 'user',
    createdAt: '2024-02-10T11:45:00Z',
    subscription: {
      status: 'canceled',
      trialEndsAt: '2024-02-24T11:45:00Z',
      validUntil: '2024-03-10T23:59:59Z'
    }
  }
];

export default function PaymentsView() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState(initialMockUsers);
  const [searchTerm, setSearchTerm] = useState('');

  // Only admin should see this
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

  const handleStatusChange = (userId: string, newStatus: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          subscription: {
            ...u.subscription,
            status: newStatus as any,
            validUntil: newStatus === 'active' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : u.subscription.validUntil
          }
        };
      }
      return u;
    }));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.subscription.status === 'active').length,
    trialing: users.filter(u => u.subscription.status === 'trialing').length,
    inactive: users.filter(u => ['past_due', 'canceled'].includes(u.subscription.status)).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Gestión de Pagos (Admin)
        </h1>
        <p className="text-sm text-text-secondary">
          Administra las suscripciones y accesos de todos los negocios registrados.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Negocios</p>
              <p className="text-2xl font-bold text-text">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:border-success/30 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2 text-success drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Suscripciones Activas</p>
              <p className="text-2xl font-bold text-text">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:border-warning/30 hover:shadow-[0_0_20px_-5px_rgba(234,179,8,0.15)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2 text-warning drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">En Prueba (Trial)</p>
              <p className="text-2xl font-bold text-text">{stats.trialing}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:border-danger/30 hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.15)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-danger/10 p-2 text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
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
      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="p-4 border-b border-border/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por nombre, email o negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Negocio / Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Válido Hasta</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{u.businessName}</p>
                      <p className="text-xs text-text-secondary">{u.name}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription.status === 'active' && (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          Activo (Pro)
                        </span>
                      )}
                      {u.subscription.status === 'trialing' && (
                        <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                          Prueba
                        </span>
                      )}
                      {u.subscription.status === 'past_due' && (
                        <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                          Vencido
                        </span>
                      )}
                      {u.subscription.status === 'canceled' && (
                        <span className="inline-flex items-center rounded-full bg-text-secondary/10 px-2 py-1 text-xs font-medium text-text-secondary">
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {u.subscription.validUntil 
                        ? new Date(u.subscription.validUntil).toLocaleDateString('es-ES') 
                        : (u.subscription.status === 'trialing' 
                            ? `Prueba hasta ${new Date(u.subscription.trialEndsAt).toLocaleDateString('es-ES')}` 
                            : 'N/A')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.subscription.status !== 'active' && (
                          <button 
                            onClick={() => handleStatusChange(u.id, 'active')}
                            className="text-xs font-medium text-success hover:underline"
                          >
                            Activar Pro
                          </button>
                        )}
                        {u.subscription.status === 'active' && (
                          <button 
                            onClick={() => handleStatusChange(u.id, 'canceled')}
                            className="text-xs font-medium text-danger hover:underline"
                          >
                            Suspender
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
    </div>
  );
}
