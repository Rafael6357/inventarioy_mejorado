import { useState, useEffect } from 'react';
import { WifiOff, CloudOff, RefreshCw, ArrowRight, Clock } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';
import { useDatabaseStore } from '../store/dbStore';
import SyncQueueModal from './SyncQueueModal';

function formatLastSynced(isoString: string | null): string {
  if (!isoString) return 'Nunca';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Justo ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncActive, setSyncActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() => localStorage.getItem('lastSyncedAt'));
  const syncQueueCount = useDatabaseStore((s) => s.syncQueueCount);
  const refreshSyncQueueCount = useDatabaseStore((s) => s.refreshSyncQueueCount);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); refreshSyncQueueCount(); syncEngine.processPending(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // Listen for storage changes (updates from other tabs or fetchAll)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lastSyncedAt') setLastSynced(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    // Also poll periodically in case storage event doesn't fire in same tab
    const interval = setInterval(() => setLastSynced(localStorage.getItem('lastSyncedAt')), 5000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [refreshSyncQueueCount]);

  useEffect(() => {
    refreshSyncQueueCount();
  }, [refreshSyncQueueCount]);

  useEffect(() => {
    const unsub = syncEngine.onEvent((event) => {
      if (event === 'start' || event === 'progress') setSyncActive(true);
      if (event === 'complete' || event === 'idle' || event === 'error') {
        setSyncActive(false);
        refreshSyncQueueCount();
      }
    });
    return () => { unsub(); };
  }, [refreshSyncQueueCount]);

  useEffect(() => {
    const interval = setInterval(() => refreshSyncQueueCount(), 2000);
    return () => clearInterval(interval);
  }, [refreshSyncQueueCount]);

  useEffect(() => {
    if (!(isOnline && syncActive && syncQueueCount === 0)) return;
    const timer = setTimeout(() => setSyncActive(false), 5000);
    return () => clearTimeout(timer);
  }, [isOnline, syncActive, syncQueueCount]);

  if (isOnline && !syncActive && syncQueueCount === 0) return null;

  const isSyncing = syncActive;
  const isOffline = !isOnline;

  const bgColor = isOffline
    ? 'bg-danger/15 border-danger/50'
    : isSyncing
      ? 'bg-primary/10 border-primary/30'
      : 'bg-warning/10 border-warning/30';

  const glowClass = isOffline
    ? 'shadow-[0_-4px_20px_rgba(239,68,68,0.15)] animate-[offlinePulse_3s_ease-in-out_infinite]'
    : isSyncing
      ? 'shadow-[0_-4px_20px_rgba(205,164,52,0.15)]'
      : '';

  const textColor = isOffline ? 'text-danger' : isSyncing ? 'text-primary' : 'text-warning';
  const iconColor = isOffline ? 'text-danger' : isSyncing ? 'text-primary' : 'text-warning';

  const message = isOffline
    ? syncQueueCount > 0
      ? `${syncQueueCount} cambio${syncQueueCount !== 1 ? 's' : ''} sin sincronizar — guardando localmente...`
      : 'Sin conexión, los cambios se guardarán en la nube como respaldo al reconectar'
    : isSyncing
      ? `Sincronizando ${syncQueueCount} cambio${syncQueueCount !== 1 ? 's' : ''}...`
      : `${syncQueueCount} cambio${syncQueueCount !== 1 ? 's' : ''} pendiente${syncQueueCount !== 1 ? 's' : ''} de sincronización.`;

  return (
    <>
      <div role="status" aria-live="polite" className={`fixed bottom-0 left-0 right-0 z-[100] border-t ${bgColor} ${glowClass} backdrop-blur-xl`}>
        <div className="flex items-center justify-center gap-4 px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {isOffline ? (
              <WifiOff className={`h-4 w-4 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
            ) : isSyncing ? (
              <RefreshCw className={`h-4 w-4 flex-shrink-0 animate-spin ${iconColor}`} aria-hidden="true" />
            ) : (
              <CloudOff className={`h-4 w-4 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
            )}
            <span className={`text-sm ${textColor}`}>{message}</span>
          </div>
          <div className="flex items-center gap-4">
            {lastSynced && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                Última sincronización: {formatLastSynced(lastSynced)}
              </span>
            )}
            {syncQueueCount > 0 && (
            <button
              onClick={() => setShowModal(true)}
              aria-label="Abrir detalles de sincronización"
              className={`inline-flex items-center gap-1.5 ${isOffline ? 'text-danger/80 hover:text-danger' : isSyncing ? 'text-primary/80 hover:text-primary' : 'text-warning/80 hover:text-warning'} text-xs font-semibold uppercase tracking-wider transition-colors`}
            >
              Ver detalles
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
        </div>
      </div>

      {showModal && (
        <SyncQueueModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
