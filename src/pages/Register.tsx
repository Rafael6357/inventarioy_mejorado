import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function Register() {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@gmail.com')) {
      setError('Solo se permiten correos @gmail.com');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Mock registration
    const mockUser = {
      id: Math.random().toString(36).substring(2, 9),
      email,
      name,
      businessName,
      role: (email === 'nikko6357@gmail.com' ? 'admin' : 'user') as 'admin' | 'user',
      createdAt: new Date().toISOString(),
      subscription: {
        status: 'trialing' as const,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        validUntil: null,
      },
    };

    login(mockUser);
    toast.success('Cuenta creada exitosamente');
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-xl p-8 shadow-[0_0_40px_-10px_rgba(255,193,7,0.15)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-[inset_0_0_15px_rgba(255,193,7,0.1)]">
            <Box className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-text text-gradient hero-glow">Crea tu cuenta</h2>
          <div className="mt-2 inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-[0_0_15px_rgba(255,193,7,0.2)]">
            <Sparkles className="mr-2 h-3 w-3 drop-shadow-[0_0_5px_rgba(255,193,7,0.8)]" />
            Empieza con 30 días gratis
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
                Tu Nombre
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-text-secondary mb-1">
                Nombre del Negocio
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                placeholder="Mi Empresa S.A."
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Correo Electrónico (@gmail.com)
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                placeholder="tu@gmail.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Contraseña (mín. 6 caracteres)
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Registrarse y Comenzar
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
