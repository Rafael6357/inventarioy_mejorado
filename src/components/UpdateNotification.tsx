import { useEffect } from 'react';
import { Download, X, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { UpdateInfo, UpdateProgress } from '../types/updater';

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  progress: UpdateProgress | null;
  isDownloading: boolean;
  error: { message: string; code?: string } | null;
  onDownload: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function UpdateNotification({
  updateInfo,
  progress,
  isDownloading,
  error,
  onDownload,
  onRetry,
  onDismiss,
}: UpdateNotificationProps) {
  useEffect(() => {
    if (updateInfo.available && !isDownloading && !error) {
      toast(
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-text">Nueva versión disponible</p>
              <p className="text-sm text-text-secondary">
                v{updateInfo.version} (actual: v{updateInfo.currentVersion})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onDownload}
              className="bg-primary text-black hover:bg-primary/90"
            >
              Actualizar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-text-secondary hover:text-text"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>,
        {
          duration: 10000,
          id: 'update-available',
        }
      );
    }

    if (isDownloading && progress) {
      toast(
        <div className="flex items-center gap-3 w-full">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="font-medium text-text">Descargando actualización...</p>
            <div className="w-full bg-border rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {progress.percentage}% ({Math.round(progress.downloaded / 1024 / 1024)}MB / {Math.round(progress.total / 1024 / 1024)}MB)
            </p>
          </div>
        </div>,
        {
          duration: Infinity,
          id: 'update-downloading',
        }
      );
    }

    if (error && !isDownloading) {
      toast(
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-danger" />
            <div>
              <p className="font-medium text-text">Error de actualización</p>
              <p className="text-sm text-text-secondary">{error.message}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reintentar
          </Button>
        </div>,
        {
          duration: 10000,
          id: 'update-error',
        }
      );
    }

    return () => {
      toast.dismiss('update-available');
      toast.dismiss('update-downloading');
      toast.dismiss('update-error');
    };
  }, [updateInfo.available, updateInfo.version, updateInfo.currentVersion, isDownloading, progress, error]);

  return null;
}