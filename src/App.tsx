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
import ConnectionStatus from './components/ConnectionStatus';
import UpdateNotification from './components/UpdateNotification';
import { useEffect, useState } from 'react';
import { initOfflineDB } from './lib/offlineDB';
import { initSyncEngine } from './lib/syncEngine';
import { useAutoUpdater } from './hooks/useAutoUpdater';

export default function App() {
  const [isTauri, setIsTauri] = useState(false);
  const [syncEngineReady, setSyncEngineReady] = useState(false);
  const [appVersion] = useState('1.0.0');

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
      {isTauri && settings.enabled && (
        <UpdateNotification
          updateInfo={{
            available: !!updateInfo?.available,
            version: updateInfo?.version,
            currentVersion: updateInfo?.currentVersion || appVersion,
          }}
          progress={progress}
          isDownloading={isDownloading}
          error={error}
          onDownload={downloadAndInstall}
          onRetry={downloadAndInstallWithRetry}
          onDismiss={dismissUpdate}
        />
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard/*" element={<Dashboard updateSettings={settings} onToggleAutoUpdate={toggleAutoUpdate} onToggleEnabled={toggleEnabled} />} />
      </Routes>
    </Router>
  );
}