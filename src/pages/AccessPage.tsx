import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Store, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import InventarioYLogo from '../components/InventarioYLogo';

interface AccessPin {
  id: string;
  user_id: string;
  pin_hash: string;
  role: string;
  is_active: boolean;
}

export default function AccessPage() {
  const { businessCode } = useParams<{ businessCode: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState(businessCode || '');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessPins, setAccessPins] = useState<AccessPin[]>([]);
  const [foundBusiness, setFoundBusiness] = useState<string | null>(null);

  // Buscar el negocio cuando se ingresa el código
  useEffect(() => {
    if (code.length >= 3) {
      searchBusiness();
    } else {
      setAccessPins([]);
      setFoundBusiness(null);
    }
  }, [code]);

  const searchBusiness = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, business_code, name')
        .eq('business_code', code.toLowerCase().trim())
        .limit(1);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        setFoundBusiness(profiles[0].name);
        
        // Cargar los PINs de ese negocio
        const { data: pins, error: pinsError } = await supabase
          .from('access_pins')
          .select('*')
          .eq('user_id', profiles[0].id)
          .eq('is_active', true);

        if (pinsError) throw pinsError;
        setAccessPins(pins || []);
      } else {
        setFoundBusiness(null);
        setAccessPins([]);
      }
    } catch (err) {
      console.error('Error searching business:', err);
      setAccessPins([]);
      setFoundBusiness(null);
    }
  };

  const handleAccess = async () => {
    if (!code.trim() || pin.length !== 4) {
      toast.error('Ingresa el código del negocio y un PIN de 4 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      // Primero verificar que el negocio existe
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, business_code')
        .eq('business_code', code.toLowerCase().trim())
        .single();

      if (profileError || !profile) {
        toast.error('Código de negocio no encontrado. Verifica que el código sea correcto.');
        setIsLoading(false);
        return;
      }

      // Cargar los PINs de ese negocio
      const { data: pins, error: pinsError } = await supabase
        .from('access_pins')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true);

      if (pinsError) {
        console.error('Error loading pins:', pinsError);
        toast.error('Error al cargar los PINs. Intente de nuevo.');
        setIsLoading(false);
        return;
      }

      if (!pins || pins.length === 0) {
        toast.error('Este negocio no tiene PINs de acceso configurados. Contacta al administrador.');
        setIsLoading(false);
        return;
      }

      // Hashear el PIN para compararlo
      const pinHash = await hashPin(pin);
      
      // Buscar coincidencia
      const matchingPin = pins.find(p => p.pin_hash === pinHash);

      if (matchingPin) {
        // Guardar información de acceso temporal
        localStorage.setItem('temp_access', JSON.stringify({
          businessCode: code.toLowerCase().trim(),
          role: matchingPin.role,
          pinName: matchingPin.pin_name || '',
          accessTime: Date.now()
        }));
        
        localStorage.setItem('temp_user_id', profile.id);
        
        toast.success('¡Acceso exitoso!');
        navigate('/dashboard');
      } else {
        toast.error('PIN incorrecto. Verifique su PIN e intente de nuevo.');
        setPin('');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      toast.error('Error al verificar el PIN. Intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'inventarioy_pin_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <InventarioYLogo size="xl" variant="image" />
        </div>

        <div className="bg-surface rounded-2xl border border-border/50 p-6 shadow-2xl">
          <h1 className="text-2xl font-bold text-text text-center mb-2">
            Acceso por PIN
          </h1>
          <p className="text-text-secondary text-center mb-6">
            Ingrese el código de su negocio y su PIN para acceder
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">
                Código del Negocio
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase().trim())}
                  placeholder="Ej: micafe, mitienda123"
                  className="pl-10"
                />
              </div>
              {foundBusiness && (
                <p className="text-sm text-success">
                  ✓ Negocio encontrado: {foundBusiness}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text">
                PIN de Acceso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="PIN de 4 dígitos"
                  maxLength={4}
                  className="pl-10 pr-10 text-center text-base tracking-widest placeholder:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                >
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {accessPins.length > 0 && (
              <p className="text-xs text-text-secondary text-center">
                {accessPins.length} PIN(es) disponible(s) para este negocio
              </p>
            )}

            <Button
              onClick={handleAccess}
              disabled={isLoading || !code.trim() || pin.length !== 4}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'ENTRAR'
              )}
            </Button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-text-secondary">
            ¿Eres el dueño del negocio?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline"
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}