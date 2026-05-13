import { useEffect, useState } from 'react';
import { CheckCircle, Wifi, WifiOff } from 'lucide-react';

export default function SyncQueuePanel() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        {isOnline ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        <h2 className="text-lg font-semibold">
          Estado de Sincronización
        </h2>
      </div>

      <div className="rounded-lg border border-border p-8 text-center">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
        <p className="font-medium">Todo sincronizado</p>
        <p className="text-sm text-muted-foreground">
          Los datos se guardan directamente en la nube
        </p>
      </div>
    </div>
  );
}