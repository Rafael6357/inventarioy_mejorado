import { useEffect, useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';

export default function SyncStatusComponent() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleClick = () => {
    setShowTooltip(prev => !prev);
    if (!showTooltip) {
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleClick}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-hover transition-colors"
        aria-label={isOnline ? 'Conectado' : 'Sin conexión'}
      >
        {isOnline ? (
          <Cloud className="h-4 w-4 text-primary" />
        ) : (
          <CloudOff className="h-4 w-4 text-danger" />
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg ${
            isOnline
              ? 'bg-success animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]'
              : 'bg-danger animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]'
          }`}
        />
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-xl bg-surface border border-border shadow-lg max-w-[200px] text-center">
          <p className={`text-xs font-semibold ${isOnline ? 'text-primary' : 'text-danger'}`}>
            {isOnline ? 'Conectado' : 'Sin conexión'}
          </p>
          <p className="text-[10px] text-text-secondary mt-0.5">
            {isOnline ? 'Todo sincronizado' : 'Revisa tu internet'}
          </p>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-l border-t border-border rotate-45" />
        </div>
      )}
    </div>
  );
}
