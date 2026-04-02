import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useDatabaseStore } from '../store/dbStore';
import { getPendingCounts } from '../lib/offlineDB';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCounts, setPendingCounts] = useState({ sales: 0, movements: 0, closings: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const syncPendingData = useDatabaseStore((state) => state.syncPendingData);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
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

  const totalPending = pendingCounts.sales + pendingCounts.movements + pendingCounts.closings;

  if (isOnline && totalPending === 0) {
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
        <span className={`text-sm font-medium ${isOnline ? 'text-success' : 'text-warning'}`}>
          {isOnline ? 'Conexión restaurada' : 'Modo offline'}
        </span>
        
        {totalPending > 0 && (
          <span className="text-xs text-text-secondary">
            {totalPending} operación{totalPending !== 1 ? 'es' : ''} pendiente{totalPending !== 1 ? 's' : ''}
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
