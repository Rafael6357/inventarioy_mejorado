import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import InventarioYLogo from '../components/InventarioYLogo';
import { countries, defaultCountry } from '../lib/countries';
import type { Country } from '../lib/countries';

export default function Register() {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountries(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score, label: 'Débil', color: 'bg-danger', width: '20%' };
    if (score <= 2) return { score, label: 'Débil', color: 'bg-danger', width: '40%' };
    if (score <= 3) return { score, label: 'Media', color: 'bg-warning', width: '60%' };
    if (score === 4) return { score, label: 'Fuerte', color: 'bg-success', width: '80%' };
    return { score, label: 'Muy fuerte', color: 'bg-success', width: '100%' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      setIsLoading(false);
      return;
    }

    const fullPhone = `${selectedCountry.dial} ${phoneNumber}`;
    const result = await register(email, password, name, businessName, fullPhone);
    setIsLoading(false);

    if (result.success) {
      toast.success('Revise su correo electrónico para confirmar su cuenta antes de iniciar sesión');
      navigate('/login');
    } else {
      setError(result.error || 'Error al registrar');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-xl p-8 shadow-[0_0_40px_-10px_rgba(255,193,7,0.15)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <InventarioYLogo size="lg" variant="image" />
          </div>
          <h2 className="text-2xl font-bold text-text text-gradient hero-glow">Cree su cuenta</h2>
          <div className="mt-2 inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-[0_0_15px_rgba(255,193,7,0.2)]">
            <Sparkles className="mr-2 h-3 w-3 drop-shadow-[0_0_5px_rgba(255,193,7,0.8)]" />
            Empieza con 7 días gratis
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
                Su Nombre
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
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">
                Teléfono (WhatsApp) *
              </label>
              <div className="flex gap-2">
                <div className="relative" ref={countryRef}>
                  <button
                    type="button"
                    onClick={() => setShowCountries(!showCountries)}
                    className="flex h-10 items-center gap-1 rounded-xl border border-border bg-bg px-3 text-sm text-text hover:border-primary/50 transition-colors whitespace-nowrap"
                  >
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span className="text-text-secondary">{selectedCountry.dial}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-text-secondary transition-transform duration-200 ${showCountries ? 'rotate-180' : ''}`} />
                  </button>
                  {showCountries && (
                    <div className="absolute top-full mt-1 right-0 z-50 max-h-60 sm:w-64 w-56 overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
                      {countries.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowCountries(false);
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-surface-hover ${selectedCountry.code === country.code ? 'bg-primary/10' : ''}`}
                        >
                          <span className="text-base leading-none">{country.flag}</span>
                          <span className="text-text-secondary text-xs">{country.dial}</span>
                          <span className="flex-1 text-text">{country.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative flex-1">
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                    placeholder="12345678"
                  />
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-1">Le contactaremos por WhatsApp para explicarle para su negocio especificamente como podria sacarle el maximo beneficio</p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Contraseña (mín. 6 caracteres)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 pr-10 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                  </div>
                  <p className={`text-xs ${passwordStrength.score <= 2 ? 'text-danger' : passwordStrength.score <= 3 ? 'text-warning' : 'text-success'}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 pr-10 text-sm text-text ring-offset-bg placeholder:text-text-secondary transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:shadow-[0_0_15px_-3px_rgba(255,193,7,0.3)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-border bg-bg text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-xs text-text-secondary group-hover:text-text transition-colors">
              Acepto los{' '}
              <a href="/terms" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                Términos y Condiciones
              </a>{' '}
              y la{' '}
              <a href="/privacy" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                Política de Privacidad
              </a>
            </span>
          </label>

          <div className="flex justify-center">
            <Button type="submit" className="px-8" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </span>
              ) : 'Registrarse y Comenzar'}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-text-secondary">
          ¿Ya tiene una cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
