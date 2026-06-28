import { useState, useEffect } from 'react';
import { Download, Smartphone, Globe, MonitorSmartphone } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

function isDevOrLocalhost(): boolean {
  return import.meta.env.DEV || 
    location.hostname === 'localhost' || 
    location.hostname === '127.0.0.1';
}

function getBrowserInstructions(): string {
  const ua = navigator.userAgent;
  if (isDevOrLocalhost()) {
    return 'En modo desarrollo no es posible instalar la PWA. Use build de producción.';
  }
  if (/Firefox/i.test(ua)) return 'Busque "Instalar" en el menú ☰';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Toque "Compartir" ▸ "Añadir a pantalla de inicio"';
  if (/Edg/i.test(ua)) return 'Busque "Instalar sitio como app" en el menú ⋯';
  if (/Chrome|Brave|Opera/i.test(ua)) return 'Busque "Instalar página como app" en el menú ⋯';
  return 'Busque "Instalar" o "Añadir a inicio" en el menú';
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);
      return standalone;
    };

    if (checkStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (isStandalone) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      // Si no hay prompt nativo, mostramos el toast con instrucciones
      toast('Instrucciones de instalación', {
        description: getBrowserInstructions(),
        duration: 10000,
        action: {
          label: 'Entendido',
          onClick: () => {},
        },
      });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <Button onClick={handleNativeInstall} variant="outline" size="sm" className="gap-2">
      {deferredPrompt ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
      Instalar App
    </Button>
  );
}
