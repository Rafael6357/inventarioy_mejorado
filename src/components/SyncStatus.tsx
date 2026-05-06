import { useEffect, useState } from 'react';
import { getSyncState, onSyncStateChange, SyncStatus } from '../lib/syncEngine';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  isOnline: boolean;
}

export default function SyncStatusComponent() {
  const [state, setState] = useState<SyncState>(getSyncState());

  useEffect(() => {
    const unsubscribe = onSyncStateChange((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const getStatusConfig = () => {
    if (!state.isOnline) {
      return {
        icon: CloudOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Sin conexión',
        sublabel: `${state.pendingChanges} cambios pendientes`
      };
    }

    switch (state.status) {
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: 'Sincronizando',
          sublabel: `${state.pendingChanges} cambios pendientes`
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          label: 'Error de sync',
          sublabel: 'Revisa tu conexión'
        };
      default:
        return {
          icon: Cloud,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: 'Sincronizado',
          sublabel: state.lastSyncTime
            ? `Última sync: ${state.lastSyncTime.toLocaleTimeString()}`
            : 'Sin sincronizar'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {config.sublabel}
        </span>
      </div>
    </div>
  );
}