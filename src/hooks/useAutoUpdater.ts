import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import {
  UpdateInfo,
  UpdateProgress,
  UpdateSettings,
  UpdateError,
  UPDATE_SETTINGS_KEY,
  DEFAULT_UPDATE_SETTINGS,
} from '../types/updater';

export function useAutoUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<UpdateError | null>(null);
  const [settings, setSettings] = useState<UpdateSettings>(DEFAULT_UPDATE_SETTINGS);

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

  useEffect(() => {
    if (!isTauri) {
      return;
    }
    const saved = localStorage.getItem(UPDATE_SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_UPDATE_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_UPDATE_SETTINGS);
      }
    }
  }, []);

  const saveSettings = useCallback((newSettings: Partial<UpdateSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(UPDATE_SETTINGS_KEY, JSON.stringify(updated));
  }, [settings]);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri) {
      return;
    }
    if (!settings.enabled) {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const update = await check();
      
      if (update) {
        setUpdateInfo({
          available: true,
          version: update.version,
          currentVersion: update.currentVersion,
          date: update.date || undefined,
          body: update.body || undefined,
        });
      } else {
        setUpdateInfo({
          available: false,
          currentVersion: '1.0.0',
        });
      }
    } catch (err: any) {
      console.error('Error checking for updates:', err);
      setError({
        message: 'No se pudo verificar actualizaciones',
        code: err.message,
      });
      setUpdateInfo({
        available: false,
        currentVersion: '1.0.0',
      });
    } finally {
      setIsChecking(false);
      saveSettings({ lastCheck: new Date() });
    }
  }, [settings.enabled, saveSettings]);

  const downloadAndInstall = useCallback(async () => {
    if (!isTauri) {
      return;
    }
    if (!updateInfo?.available || !settings.autoUpdate) {
      return;
    }

    setIsDownloading(true);
    setProgress({ downloaded: 0, total: 0, percentage: 0 });

    try {
      const update = await check();
      
      if (!update) {
        throw new Error('No hay actualización disponible');
      }

      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          const percentage = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          setProgress({ downloaded, total, percentage });
        }
      });

      toast.success('Actualización instalada. Reiniciando...');
      
      setTimeout(async () => {
        await relaunch();
      }, 2000);

    } catch (err: any) {
      console.error('Error downloading update:', err);
      setError({
        message: err.message || 'Error al descargar la actualización',
        code: 'DOWNLOAD_ERROR',
      });
      toast.error('Error al descargar la actualización. Intenta de nuevo.');
    } finally {
      setIsDownloading(false);
      setProgress(null);
    }
  }, [updateInfo, settings.autoUpdate]);

  const downloadAndInstallWithRetry = useCallback(async () => {
    setError(null);
    await downloadAndInstall();
  }, [downloadAndInstall]);

  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  const toggleAutoUpdate = useCallback((enabled: boolean) => {
    saveSettings({ autoUpdate: enabled });
    if (enabled) {
      checkForUpdates();
    }
  }, [saveSettings, checkForUpdates]);

  const toggleEnabled = useCallback((enabled: boolean) => {
    saveSettings({ enabled });
  }, [saveSettings]);

  useEffect(() => {
    if (!isTauri) {
      return;
    }
    if (settings.enabled) {
      checkForUpdates();
    }
  }, []);

  return {
    updateInfo,
    progress,
    isChecking,
    isDownloading,
    error,
    settings,
    checkForUpdates,
    downloadAndInstall,
    downloadAndInstallWithRetry,
    dismissUpdate,
    toggleAutoUpdate,
    toggleEnabled,
  };
}