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
import AccessPage from './pages/AccessPage';
import ErrorBoundary from './components/ErrorBoundary';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { initialize: initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

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
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/menu" element={<MenuView />} />
        <Route path="/acceso" element={<AccessPage />} />
        <Route path="/acceso/:businessCode" element={<AccessPage />} />
        <Route path="/dashboard/*" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      </Routes>
    </Router>
  );
}