import { useIsOnline } from './useIsOnline';
import { useEffect, useState } from 'react';

/**
 * Hook simple para detectar si la app está offline
 * Retorna true si está offline (sin conexión)
 */
export function useIsOffline(): boolean {
  const isOnline = useIsOnline();
  return !isOnline;
}

/**
 * Hook que retorna { disabled, message } para acciones que requieren internet
 */
export function useOfflineAction(actionName: string = 'esta acción') {
  const isOffline = useIsOffline();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShowHint(true);
    } else {
      setShowHint(false);
    }
  }, [isOffline]);

  return {
    disabled: isOffline,
    message: isOffline ? `Requiere conexión a internet para ${actionName}` : undefined,
    showHint,
    setShowHint,
  };
}
