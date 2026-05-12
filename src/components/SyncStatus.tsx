import { useEffect, useState } from 'react';
import { getSyncState, onSyncStateChange, SyncStatus, syncNow } from '../lib/syncEngine';
import { Cloud, CloudOff, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import * as sqlite from '../lib/sqliteLocal';

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  isOnline: boolean;
}

interface SyncQueueItem {
  id: number;
  table_name: string;
  operation: string;
  created_at: string;
  retry_count: number;
  failed: number;
  error_message: string | null;
}

interface Props {
  onClick?: () => void;
  showPendingCount?: boolean;
}

export default function SyncStatusComponent({ onClick, showPendingCount = true }: Props) {
  const [state, setState] = useState<SyncState>(getSyncState());
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onSyncStateChange((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadFailedItems = async () => {
      const failed = await sqlite.getFailedSyncItems();
      setFailedItems(failed);
    };
    loadFailedItems();
    const interval = setInterval(loadFailedItems, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    if (!state.isOnline) {
      return {
        icon: CloudOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Sin conexión',
        sublabel: showPendingCount && state.pendingChanges > 0 
          ? `${state.pendingChanges} cambios pendientes`
          : 'Modo offline'
      };
    }

    if (state.status === 'syncing') {
      return {
        icon: RefreshCw,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        label: 'Sincronizando',
        sublabel: showPendingCount && state.pendingChanges > 0
          ? `${state.pendingChanges} cambios pendientes`
          : 'Actualizando...'
      };
    }

    if (state.status === 'error' || failedItems.length > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        label: failedItems.length > 0 ? `${failedItems.length} error${failedItems.length > 1 ? 'es' : ''}` : 'Error de sync',
        sublabel: failedItems.length > 0 
          ? 'Toca para ver detalles'
          : 'Revisa tu conexión'
      };
    }

    return {
      icon: Cloud,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Sincronizado',
      sublabel: state.lastSyncTime
        ? `Última: ${state.lastSyncTime.toLocaleTimeString()}`
        : 'Sin sincronizar'
    };
  };

  const handleClick = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (state.isOnline && failedItems.length > 0) {
      setIsSyncing(true);
      await sqlite.retryAllFailedItems();
      await syncNow();
      setIsSyncing(false);
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} hover:opacity-80 transition-opacity ${onClick ? 'cursor-pointer' : ''}`}
      disabled={isSyncing}
    >
      <Icon className={`h-4 w-4 ${config.color} ${state.status === 'syncing' ? 'animate-spin' : ''}`} />
      <div className="flex flex-col text-left">
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {config.sublabel}
        </span>
      </div>
    </button>
  );
}