import { useState } from 'react';
import { Lock, Plus, X, Pencil, Trash2, CheckCircle, XCircle, Eye, EyeOff, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useDatabaseStore, ROLE_LABELS, ROLE_MODULES } from '../store/dbStore';
import { toast } from 'sonner';
import { useOfflineAction } from '../hooks/useOfflineDisabled';

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
  settings: 'Configuración',
};

const translateModules = (modules: string[]): string => {
  return modules.map(m => MODULE_TRANSLATIONS[m] || m).join(', ');
};

export default function AccessPinsConfig() {
  const { accessPins, saveAccessPin, toggleAccessPin, deleteAccessPin } = useDatabaseStore();
  const { disabled: isOffline, message: offlineMessage } = useOfflineAction('gestionar PINs de acceso');
  const [showModal, setShowModal] = useState(false);
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinName, setPinName] = useState('');
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
      if (role === 'owner' && accessPins.some(p => p.role === 'owner')) {
        setEditingPin(role);
        setSelectedRole(role);
      } else {
        setEditingPin(null);
        setSelectedRole(role);
      }
    } else {
      setEditingPin(null);
      setSelectedRole('');
    }
    setPinValue('');
    setConfirmPin('');
    setPinName('');
    setShowModal(true);
  };

  const handleSavePin = async () => {
    if (!pinName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (pinValue.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }
    if (pinValue !== confirmPin) {
      toast.error('Los PINs no coinciden');
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

    if (selectedRole === 'owner' && accessPins.some(p => p.role === 'owner' && p.is_active)) {
      toast.error('Ya existe un PIN de Dueño/a activo. Puede editarlo o eliminarlo primero.');
      return;
    }

    const result = await saveAccessPin(selectedRole, pinValue, pinName);
    if (result.success) {
      toast.success(`PIN de ${ROLE_LABELS[selectedRole]} - ${pinName} guardado`);
      setShowModal(false);
      setPinValue('');
      setConfirmPin('');
      setPinName('');
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
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h3 className="text-xl font-semibold text-text flex items-center gap-3">
          <Lock className="h-6 w-6 text-primary" />
          Control de Acceso por PIN
        </h3>
        <p className="text-base text-text-secondary mt-2">
          Configure pines de seguridad para limitar el acceso a los módulos del sistema
        </p>
      </div>

      {/* Resumen de Roles */}
      <div className="p-4 rounded-xl bg-surface-hover border border-border/30">
        <h4 className="text-base font-medium text-text mb-3 flex items-center gap-2">
          Resumen de Roles
        </h4>
        <div className="flex flex-wrap gap-2">
          {(['owner', 'economist', 'admin', 'supervisor', 'clerk'] as const).map(role => (
            <span 
              key={role} 
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                accessPins.some(p => p.role === role && p.is_active) 
                  ? 'bg-success/20 text-success' 
                  : accessPins.some(p => p.role === role && !p.is_active)
                    ? 'bg-warning/20 text-warning'
                    : 'bg-border text-text-secondary'
              }`}
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>

      {/* Crear Nuevo PIN */}
      <div className="p-4 rounded-xl bg-bg/50 border border-border/30">
        <h4 className="text-base font-medium text-text mb-3 flex items-center gap-2">
          <span>➕</span> Crear Nuevo PIN
        </h4>
        <Button
          onClick={() => handleOpenModal()}
          className="gap-2 w-full sm:w-auto"
          disabled={isOffline}
          title={isOffline ? offlineMessage : undefined}
        >
          <Plus className="h-4 w-4" />
          Agregar Nuevo PIN
          {isOffline && <WifiOff className="h-3 w-3 ml-1 opacity-60" />}
        </Button>
      </div>

      {/* Lista de PINs Activos */}
      {accessPins.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl bg-warning/5 border border-warning/30">
          <Lock className="h-8 w-8 mx-auto mb-2 text-warning" />
          <p className="font-medium text-warning text-sm">Configure primero el PIN de Propietario/a</p>
          <p className="text-xs text-text-secondary mt-2">
            Debe configurar el PIN de Propietario/a antes que cualquier otro para poder acceder a todos los módulos del sistema.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-base font-medium text-text flex items-center gap-2">
            PINs Configurados
          </h4>
          {accessPins.map(pin => (
            <div
              key={pin.id}
              className="flex flex-col p-4 bg-surface rounded-lg border border-border/30 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text text-base">{ROLE_LABELS[pin.role]}{pin.pin_name ? `: ${pin.pin_name}` : ''}</span>
                  {pin.is_active ? (
                    <span className="flex items-center gap-1 text-sm text-success">
                      <CheckCircle className="h-4 w-4" /> Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-text-secondary">
                      <XCircle className="h-4 w-4" /> Inactivo
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-2">
                <strong>Módulos:</strong> {translateModules(ROLE_MODULES[pin.role] || [])}
              </p>
              <div className="flex gap-2 mt-auto pt-2 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-sm px-3"
                  onClick={() => handleToggle(pin.id, pin.is_active)}
                  disabled={isOffline}
                  title={isOffline ? offlineMessage : undefined}
                >
                  {pin.is_active ? 'Desactivar' : 'Activar'}
                  {isOffline && <WifiOff className="h-3 w-3 ml-1 opacity-60" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-danger hover:text-danger px-2"
                  onClick={() => handleDelete(pin.id)}
                  disabled={isOffline}
                  title={isOffline ? offlineMessage : undefined}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm modal-backdrop">
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
                    <>
                      {availableRoles.map(role => {
                        if (role === 'owner' && accessPins.some(p => p.role === 'owner' && p.is_active)) {
                          return null;
                        }
                        return (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        );
                      })}
                    </>
                  )}
                </select>
                {!hasOwnerPin && (
                  <p className="text-xs text-warning mt-1">Debe configurar primero el PIN de Dueño/a</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text mb-2 block">Nombre del usuario *</label>
                <Input
                  value={pinName}
                  onChange={e => setPinName(e.target.value)}
                  placeholder="Ej: Juan, María, Carlos..."
                  className="text-text"
                />
                <p className="text-xs text-text-secondary">Este nombre aparecerá en el registro de acciones</p>
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
                  style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' } as React.CSSProperties}
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
                  style={{ WebkitTextSecurity: showConfirmPin ? 'none' : 'disc' } as React.CSSProperties}
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
                disabled={isOffline || pinValue.length !== 4 || pinValue !== confirmPin || !selectedRole}
                title={isOffline ? offlineMessage : undefined}
              >
                Guardar PIN
                {isOffline && <WifiOff className="h-3 w-3 ml-1 opacity-60" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}