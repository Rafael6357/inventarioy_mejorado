import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface Props {
  onClick?: () => void;
  showPendingCount?: boolean;
}

export default function SyncStatusComponent({ onClick, showPendingCount = true }: Props) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

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
    if (onClick) {
      onClick();
    }
  };

  const getConfig = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Sin conexión',
        sublabel: 'Revisa tu internet'
      };
    }

    return {
      icon: Cloud,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Conectado',
      sublabel: 'Todo sincronizado'
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} hover:opacity-80 transition-opacity ${onClick ? 'cursor-pointer' : ''}`}
      disabled={isSyncing}
    >
      <Icon className={`h-4 w-4 ${config.color}`} />
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