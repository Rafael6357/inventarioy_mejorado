import { useState, useEffect } from 'react';
import { WifiOff, CloudOff, RefreshCw, ArrowRight } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';
import { useDatabaseStore } from '../store/dbStore';
import SyncQueueModal from './SyncQueueModal';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncActive, setSyncActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const syncQueueCount = useDatabaseStore((s) => s.syncQueueCount);
  const refreshSyncQueueCount = useDatabaseStore((s) => s.refreshSyncQueueCount);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); refreshSyncQueueCount(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
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
    ? 'bg-danger/10 border-danger/30'
    : isSyncing
      ? 'bg-primary/10 border-primary/30'
      : 'bg-warning/10 border-warning/30';

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
      <div className={`fixed bottom-0 left-0 right-0 z-[100] border-t ${bgColor} backdrop-blur-xl`}>
        <div className="flex items-center justify-center gap-4 px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {isOffline ? (
              <WifiOff className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
            ) : isSyncing ? (
              <RefreshCw className={`h-4 w-4 flex-shrink-0 animate-spin ${iconColor}`} />
            ) : (
              <CloudOff className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
            )}
            <span className={`text-sm ${textColor}`}>{message}</span>
          </div>
          {syncQueueCount > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className={`inline-flex items-center gap-1.5 ${isOffline ? 'text-danger/80 hover:text-danger' : isSyncing ? 'text-primary/80 hover:text-primary' : 'text-warning/80 hover:text-warning'} text-xs font-semibold uppercase tracking-wider transition-colors`}
            >
              Ver detalles
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <SyncQueueModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
