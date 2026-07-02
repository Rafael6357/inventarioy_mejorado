import { useEffect, useState, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';
import { useDatabaseStore } from '../store/dbStore';
import gsap from 'gsap';

export default function SyncStatusComponent() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showTooltip, setShowTooltip] = useState(false);
  const [syncEvent, setSyncEvent] = useState<string | null>(null);
  const syncQueueCount = useDatabaseStore((s) => s.syncQueueCount);
  const syncStatus = useDatabaseStore((s) => s.syncStatus);
  const refreshSyncQueueCount = useDatabaseStore((s) => s.refreshSyncQueueCount);
  const dotRef = useRef<HTMLSpanElement>(null);

  const isSyncing = syncStatus === 'syncing' || syncEvent === 'start' || syncEvent === 'progress';
  const hasPending = syncQueueCount > 0;

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;
    if (isSyncing || !isOnline) {
      gsap.to(dot, { opacity: 0.35, duration: 0.8, repeat: -1, yoyo: true, ease: 'power1.inOut' });
    } else {
      gsap.killTweensOf(dot);
      gsap.set(dot, { opacity: 1 });
    }
  }, [isSyncing, isOnline, hasPending]);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); refreshSyncQueueCount(); syncEngine.processPending(); };
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
    const unsub = syncEngine.onEvent((event, data) => {
      setSyncEvent(event);
      if (event === 'progress' || event === 'complete' || event === 'start' || event === 'error') {
        refreshSyncQueueCount();
      }
      if (event === 'idle' || event === 'complete') {
        setSyncEvent(null);
      }
    });
    return () => { unsub(); };
  }, [refreshSyncQueueCount]);

  const handleClick = () => setShowTooltip((prev) => !prev);

  const getIcon = () => {
    if (isSyncing) return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
    if (!isOnline) return <WifiOff className="h-4 w-4 text-danger" />;
    if (hasPending) return <CloudOff className="h-4 w-4 text-warning" />;
    return <Cloud className="h-4 w-4 text-success" />;
  };

  const getDotColor = () => {
    if (isSyncing) return 'bg-primary shadow-[0_0_6px_rgba(255,193,7,0.6)]';
    if (!isOnline) return 'bg-danger shadow-[0_0_6px_rgba(239,68,68,0.6)]';
    if (hasPending) return 'bg-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]';
    return 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]';
  };

  const statusText = () => {
    if (isSyncing) return 'Sincronizando...';
    if (!isOnline) return 'Sin conexión';
    if (hasPending) return `${syncQueueCount} pendiente${syncQueueCount !== 1 ? 's' : ''}`;
    return 'Sincronizado';
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleClick}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-hover transition-colors"
        aria-label={statusText()}
      >
        {getIcon()}
        {hasPending && !isSyncing && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-warning text-bg text-[9px] font-bold leading-[14px] text-center">
            {syncQueueCount > 9 ? '9+' : syncQueueCount}
          </span>
        )}
        {!hasPending && (
          <span ref={dotRef} className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg ${getDotColor()}`} />
        )}
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-xl bg-surface border border-border shadow-lg min-w-[180px] text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {isSyncing ? (
              <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
            ) : !isOnline ? (
              <WifiOff className="h-3.5 w-3.5 text-danger" />
            ) : hasPending ? (
              <CloudOff className="h-3.5 w-3.5 text-warning" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            )}
            <p className="text-xs font-semibold text-text">{statusText()}</p>
          </div>
          <p className="text-[10px] text-text-secondary">
            {isSyncing
              ? 'Enviando cambios al servidor...'
              : !isOnline
                ? 'Los datos se guardan localmente'
                : hasPending
                  ? 'Esperando sincronización'
                  : 'Todo al día'}
          </p>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-l border-t border-border rotate-45" />
        </div>
      )}
    </div>
  );
}
