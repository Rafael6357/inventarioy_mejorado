/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MenuView from './pages/MenuView';
import ConnectionStatus from './components/ConnectionStatus';
import { Button } from './components/ui/button';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { initOfflineDB } from './lib/offlineDB';
import { initSyncEngine } from './lib/syncEngine';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import { useAuthStore } from './store/authStore';

export default function App() {
  const [isTauri, setIsTauri] = useState(false);
  const [syncEngineReady, setSyncEngineReady] = useState(false);
  const [appVersion, setAppVersion] = useState('1.1.0');
  const [isLoadingVersion, setIsLoadingVersion] = useState(true);

  const refreshVersion = async () => {
    setIsLoadingVersion(true);
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        const version = await getVersion();
        console.log('📱 Versión actualizada:', version);
        setAppVersion(version);
      } catch (e) {
        console.warn('Could not get app version:', e);
      }
    }
    setIsLoadingVersion(false);
  };

  useEffect(() => {
    async function getVersion() {
      setIsLoadingVersion(true);
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          const { getVersion } = await import('@tauri-apps/api/app');
          const version = await getVersion();
          console.log('📱 Versión obtenida:', version);
          setAppVersion(version);
        } catch (e) {
          console.warn('Could not get app version:', e);
        }
      }
      setIsLoadingVersion(false);
    }
    getVersion();
  }, []);

  const {
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
  } = useAutoUpdater();

  const { initialize: initializeAuth } = useAuthStore();

  useEffect(() => {
    async function checkEnvironment() {
      const hasTauriGlobal = typeof window !== 'undefined' && (window as any).__TAURI__;
      if (hasTauriGlobal) {
        setIsTauri(true);
        return;
      }
      
      try {
        await import('@tauri-apps/api/core');
        const hasTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
        setIsTauri(!!hasTauri);
      } catch {
        setIsTauri(false);
      }
    }

    checkEnvironment();

    initOfflineDB().catch(err => console.error('Failed to initialize offline DB:', err));
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isTauri && !syncEngineReady) {
      initSyncEngine()
        .then(() => {
          console.log('Sync engine initialized');
          setSyncEngineReady(true);
        })
        .catch(err => console.error('Failed to initialize sync engine:', err));
    }
  }, [isTauri, syncEngineReady]);

  useEffect(() => {
    if (isTauri && settings.enabled) {
      checkForUpdates();
    }
  }, [isTauri, settings.enabled]);

  return (
    <Router>
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          classNames: {
            toast: 'bg-surface border-border text-text shadow-2xl',
            title: 'text-text font-medium',
            description: 'text-text-secondary',
            success: 'border-success/30 text-success',
            error: 'border-danger/30 text-danger',
          }
        }}
      />
      <ConnectionStatus />
      {isTauri && updateInfo?.available && !isDownloading && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface border border-border/50 rounded-xl shadow-lg p-4 w-80 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text">Nueva versión disponible</h4>
              <p className="text-xs text-text-secondary mt-1">
                Actualiza a la versión {updateInfo.version} para obtener las últimas mejoras y correcciones.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={downloadAndInstall} 
              size="sm" 
              className="flex-1 bg-primary text-black hover:bg-primary/90"
            >
              Instalar y reiniciar
            </Button>
            <Button 
              onClick={dismissUpdate} 
              variant="outline" 
              size="sm" 
              className="flex-1"
            >
              Todavía no
            </Button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/menu" element={<MenuView />} />
        <Route path="/dashboard/*" element={<Dashboard updateSettings={settings} onToggleAutoUpdate={toggleAutoUpdate} onToggleEnabled={toggleEnabled} appVersion={appVersion} isLoadingVersion={isLoadingVersion} onRefreshVersion={refreshVersion} />} />
      </Routes>
    </Router>
  );
}