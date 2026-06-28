import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import InventarioYLogo from '../components/InventarioYLogo';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { forgotPassword } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Ingrese su correo electrónico');
      setIsLoading(false);
      return;
    }

    const result = await forgotPassword(email);

    if (!result.success) {
      setIsLoading(false);
      setError(result.error || 'Error al enviar el correo');
      return;
    }

    setIsLoading(false);
    setSuccess(true);
    toast.success('Si el correo existe, recibirá un enlace para restablecer su contraseña');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-xl p-8 shadow-[0_0_40px_-10px_rgba(255,193,7,0.15)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <Link to="/">
              <InventarioYLogo size="xl" variant="image" className="cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-text">Restablecer contraseña</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Ingrese su correo y le enviaremos un enlace para crear una nueva contraseña
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
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-border bg-bg px-10 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                    placeholder="tu@gmail.com"
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
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar enlace
                  </span>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center space-y-4">
            <div className="rounded-xl bg-success/10 p-4 border border-success/30">
              <p className="text-sm text-success font-medium mb-2">
                ¡Correo enviado!
              </p>
              <p className="text-sm text-text-secondary">
                Revise su bandeja de entrada (y spam) en <strong>{email}</strong>. El enlace expira en 1 hora.
              </p>
            </div>
            <p className="text-sm text-text-secondary">
              ¿No recibió el correo? <Link to="/forgot-password" className="font-medium text-primary hover:underline">Intente de nuevo</Link>
            </p>
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