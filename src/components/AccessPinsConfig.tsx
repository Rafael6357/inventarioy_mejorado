import { useState } from 'react';
import { Lock, Plus, X, Pencil, Trash2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useDatabaseStore, ROLE_LABELS, ROLE_MODULES } from '../store/dbStore';
import { toast } from 'sonner';

const MODULE_TRANSLATIONS: Record<string, string> = {
  sales: 'Ventas',
  inventory: 'Almacén',
  movements: 'Movimientos',
  transit: 'Tránsito',
  recipes: 'Recetas',
  consumption: 'Consumo',
  closings: 'Cierres',
  charts: 'Gráficos',
  analysis: 'Análisis',
  filtered: 'Centro Filtrado',
  hr: 'RR.HH.',
  ai: 'IA',
  settings: 'Configuración',
};

const translateModules = (modules: string[]): string => {
  return modules.map(m => MODULE_TRANSLATIONS[m] || m).join(', ');
};

export default function AccessPinsConfig() {
  const { accessPins, saveAccessPin, toggleAccessPin, deleteAccessPin } = useDatabaseStore();
  const [showModal, setShowModal] = useState(false);
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const availableRoles = ['owner', 'economist', 'admin', 'supervisor', 'clerk'] as const;
  
  const hasOwnerPin = accessPins.some(p => p.role === 'owner');

  const handleOpenModal = (role?: string) => {
    if (!hasOwnerPin && role && role !== 'owner') {
      toast.error('Debe configurar primero el PIN de Dueño/a antes de configurar otros roles');
      return;
    }
    if (role) {
      setEditingPin(role);
      setSelectedRole(role);
    } else {
      setEditingPin(null);
      setSelectedRole('');
    }
    setPinValue('');
    setConfirmPin('');
    setShowModal(true);
  };

  const handleSavePin = async () => {
    if (pinValue.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    if (pinValue !== confirmPin) {
      toast.error('Los PINs no coincided');
      return;
    }
    if (!selectedRole) {
      toast.error('Seleccione un rol');
      return;
    }

    if (!hasOwnerPin && selectedRole !== 'owner') {
      toast.error('Debe configurar primero el PIN de Dueño/a antes de configurar otros roles');
      return;
    }

    const result = await saveAccessPin(selectedRole, pinValue);
    if (result.success) {
      toast.success(`PIN de ${ROLE_LABELS[selectedRole]} guardado`);
      setShowModal(false);
      setPinValue('');
      setConfirmPin('');
    } else {
      toast.error(result.error || 'Error al guardar PIN');
    }
  };

  const handleToggle = async (pinId: string, isActive: boolean) => {
    const result = await toggleAccessPin(pinId, !isActive);
    if (result.success) {
      toast.success(isActive ? 'PIN desactivado' : 'PIN activado');
    } else {
      toast.error(result.error || 'Error al actualizar PIN');
    }
  };

  const handleDelete = async (pinId: string) => {
    if (confirm('¿Eliminar este PIN?')) {
      const result = await deleteAccessPin(pinId);
      if (result.success) {
        toast.success('PIN eliminado');
      } else {
        toast.error(result.error || 'Error al eliminar PIN');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Control de Acceso
          </h3>
          <p className="text-sm text-text-secondary">
            Configure pines de seguridad para limitar el acceso a módulos
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Agregar PIN
        </Button>
      </div>

      {accessPins.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-warning">Configure primero el PIN de Dueño/a</p>
          <p className="text-xs mt-1">Debe configurar el PIN de Dueño/a antes que cualquier otro para poder acceder a todos los módulos del sistema.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accessPins.map(pin => (
            <div
              key={pin.id}
              className="flex items-center justify-between p-4 bg-surface-hover rounded-lg border border-border/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{ROLE_LABELS[pin.role]}</span>
                  {pin.is_active ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-text-secondary" />
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Módulos: {translateModules(ROLE_MODULES[pin.role] || [])}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => handleToggle(pin.id, pin.is_active)}
                >
                  {pin.is_active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-danger hover:text-danger"
                  onClick={() => handleDelete(pin.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text">
                {editingPin ? 'Editar PIN' : 'Agregar PIN'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text mb-2 block">Rol</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-bg text-text"
                  disabled={!!editingPin}
                >
                  <option value="">Seleccione un rol</option>
                  {!hasOwnerPin ? (
                    <option value="owner">{ROLE_LABELS['owner']}</option>
                  ) : (
                    availableRoles.map(role => {
                      const existingPin = accessPins.find(p => p.role === role);
                      if (existingPin && editingPin !== role) return null;
                      return (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      );
                    })
                  )}
                </select>
                {!hasOwnerPin && (
                  <p className="text-xs text-warning mt-1">Debe configurar primero el PIN de Dueño/a</p>
                )}
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-text mb-2 block">PIN (4 dígitos)</label>
                <Input
                  type="text"
                  maxLength={4}
                  value={pinValue}
                  onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="font-mono text-center text-lg tracking-widest pr-10"
                  style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-9 text-text-secondary hover:text-text"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-text mb-2 block">Confirmar PIN</label>
                <Input
                  type="text"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="font-mono text-center text-lg tracking-widest pr-10"
                  style={{ WebkitTextSecurity: showConfirmPin ? 'none' : 'disc' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-9 text-text-secondary hover:text-text"
                >
                  {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {selectedRole && (
                <div className="p-3 bg-surface-hover rounded-lg">
                  <p className="text-xs text-text-secondary font-medium mb-1">Módulos permitidos:</p>
                  <p className="text-xs text-text-secondary">
                    {translateModules(ROLE_MODULES[selectedRole] || [])}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSavePin}
                disabled={pinValue.length !== 4 || pinValue !== confirmPin || !selectedRole}
              >
                Guardar PIN
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}