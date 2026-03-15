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

export default function App() {
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
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}
