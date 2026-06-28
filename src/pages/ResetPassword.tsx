import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import InventarioYLogo from '../components/InventarioYLogo';
import { Loader2, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      setTokenError(true);
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setIsLoading(false);
      setError(updateError.message === 'Session expired'
        ? 'El enlace ha expirado. Solicita uno nuevo.'
        : updateError.message === 'Invalid token'
        ? 'El enlace no es válido. Solicita uno nuevo.'
        : 'Error al actualizar la contraseña. Intente de nuevo.'
      );
      return;
    }

    setIsLoading(false);
    setSuccess(true);
    toast.success('Contraseña actualizada correctamente');

    setTimeout(() => {
      navigate('/login');
    }, 3000);
  };

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verificando enlace...</span>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-xl p-8 shadow-[0_0_40px_-10px_rgba(255,193,7,0.15)]">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6">
              <Link to="/">
                <InventarioYLogo size="xl" variant="image" className="cursor-pointer hover:opacity-80 transition-opacity" />
              </Link>
            </div>
            <div className="rounded-xl bg-danger/10 p-4 border border-danger/30 mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-danger shrink-0" />
                <p className="text-sm text-danger text-left">
                  Enlace inválido o expirado. Solicita un nuevo restablecimiento de contraseña.
                </p>
              </div>
            </div>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Solicitar nuevo enlace
            </Link>
          </div>
          <p className="text-center text-sm text-text-secondary mt-4">
            <Link to="/login" className="flex items-center justify-center gap-1 text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-xl p-8 shadow-[0_0_40px_-10px_rgba(255,193,7,0.15)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <Link to="/">
              <InventarioYLogo size="xl" variant="image" className="cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-text">Nueva contraseña</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Ingrese su nueva contraseña
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-border bg-bg px-10 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-border bg-bg px-10 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                    placeholder="Repite la contraseña"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button type="submit" className="px-8" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Actualizar contraseña
                  </span>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center space-y-4">
            <div className="rounded-xl bg-success/10 p-4 border border-success/30">
              <div className="flex items-center gap-3 justify-center">
                <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                <p className="text-sm text-success font-medium">
                  ¡Contraseña actualizada correctamente!
                </p>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                Serás redirigido al inicio de sesión en 3 segundos...
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-text-secondary mt-4">
          <Link to="/login" className="flex items-center justify-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
