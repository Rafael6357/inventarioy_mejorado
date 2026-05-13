import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsOnline(navigator.onLine);
    }, 1500);

    const handleOnline = () => {
      clearTimeout(timeout);
      setIsOnline(true);
    };

    const handleOffline = () => {
      clearTimeout(timeout);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline === null || isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg shadow-lg border bg-warning/10 border-warning/30 p-3 flex items-center gap-3">
      <WifiOff className="h-5 w-5 text-warning" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-warning">
          Sin conexión
        </span>
        <span className="text-xs text-text-secondary">
          Los datos se guardan cuando vuelvas a conectar
        </span>
      </div>
    </div>
  );
}