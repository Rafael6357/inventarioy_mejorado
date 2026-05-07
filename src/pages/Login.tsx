import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import InventarioYLogo from '../components/InventarioYLogo';
import { Loader2, MessageCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (!result.success) {
      setIsLoading(false);
      setError(result.error || 'Error al iniciar sesión');
      return;
    }

    await new Promise(r => setTimeout(r, 500));
    
    const currentUser = useAuthStore.getState().user;
    
    if (currentUser && !currentUser.isSubscriptionActive) {
      setIsLoading(false);
      setSubscriptionExpired(true);
      return;
    }

    setIsLoading(false);
    toast.success('Sesión iniciada correctamente');
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-xl p-8 shadow-[0_0_40px_-10px_rgba(255,193,7,0.15)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <InventarioYLogo size="xl" />
          </div>
          <h2 className="text-2xl font-bold text-text">Bienvenido de nuevo</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Ingresa a tu cuenta para gestionar tu inventario
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          
          {subscriptionExpired && (
            <div className="rounded-xl bg-warning/10 p-4 border border-warning/30">
              <p className="text-sm text-danger font-medium mb-3">
                Tu período de prueba ha vencido. 
                Contacta al +53 54523884 para renovar tu Plan Profesional y seguir usando la app.
              </p>
              <div className="flex flex-col gap-2">
                <a 
                  href="https://wa.me/5354523884?text=Hola,%20quiero%20renovar%20mi%20Plan%20Profesional" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contactar a +53 54523884
                </a>
                <button
                  type="button"
                  onClick={() => window.location.href = '/'}
                  className="text-sm text-text-secondary text-center hover:text-text"
                >
                  Página de inicio
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Correo Electrónico
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
                Contraseña
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

          <div className="flex justify-center">
            <Button type="submit" className="px-8" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </span>
              ) : 'Iniciar Sesión'}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-text-secondary">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
