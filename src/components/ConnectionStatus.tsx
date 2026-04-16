import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useDatabaseStore } from '../store/dbStore';
import { getPendingCounts } from '../lib/offlineDB';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [pendingCounts, setPendingCounts] = useState({ sales: 0, movements: 0, closings: 0, transitConsumptions: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const syncPendingData = useDatabaseStore((state) => state.syncPendingData);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsOnline(navigator.onLine);
    }, 1500);

    if (import.meta.env.DEV) {
      console.log('[ConnectionStatus] Initial isOnline:', navigator.onLine);
    }

    const handleOnline = () => {
      clearTimeout(timeout);
      if (import.meta.env.DEV) {
        console.log('[ConnectionStatus] online event fired');
      }
      setIsOnline(true);
      syncPendingData();
    };

    const handleOffline = () => {
      clearTimeout(timeout);
      if (import.meta.env.DEV) {
        console.log('[ConnectionStatus] offline event fired');
      }
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingData]);

  useEffect(() => {
    const updateCounts = async () => {
      try {
        const counts = await getPendingCounts();
        setPendingCounts(counts);
      } catch (error) {
        console.error('Error getting pending counts:', error);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPending = pendingCounts.sales + pendingCounts.movements + pendingCounts.closings + pendingCounts.transitConsumptions;

  const getPendingText = () => {
    const parts: string[] = [];
    if (pendingCounts.sales > 0) parts.push(`${pendingCounts.sales} venta${pendingCounts.sales !== 1 ? 's' : ''}`);
    if (pendingCounts.movements > 0) parts.push(`${pendingCounts.movements} movimiento${pendingCounts.movements !== 1 ? 's' : ''}`);
    if (pendingCounts.transitConsumptions > 0) parts.push(`${pendingCounts.transitConsumptions} tránsito${pendingCounts.transitConsumptions !== 1 ? 's' : ''}`);
    if (pendingCounts.closings > 0) parts.push(`${pendingCounts.closings} cierre${pendingCounts.closings !== 1 ? 's' : ''}`);
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts.join(' y ');
    return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
  };

  const pendingText = getPendingText();
  const isPlural = pendingText.includes(' y ') || pendingText.includes(', ') || (totalPending > 1 && !pendingText.includes('1 '));

  if (isOnline === null || (isOnline && totalPending === 0)) {
    return null;
  }

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncPendingData();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-lg shadow-lg border ${
      isOnline 
        ? 'bg-success/10 border-success/30' 
        : 'bg-warning/10 border-warning/30'
    } p-3 flex items-center gap-3`}>
      {isOnline ? (
        <Wifi className="h-5 w-5 text-success" />
      ) : (
        <WifiOff className="h-5 w-5 text-warning" />
      )}
      
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${isOnline === false ? 'text-warning' : 'text-success'}`}>
          {isOnline === false ? 'Modo offline' : isOnline === true ? 'Conexión restaurada' : 'Verificando...'}
        </span>
        
        {totalPending > 0 && pendingText && (
          <span className="text-xs text-text-secondary">
            {pendingText} pendiente{isPlural ? 's' : ''}
          </span>
        )}
      </div>

      {isOnline && totalPending > 0 && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="ml-2 p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors disabled:opacity-50"
          title="Sincronizar datos pendientes"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
