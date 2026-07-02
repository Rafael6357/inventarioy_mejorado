import { useEffect, useState } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionBanner() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (user?.isSubscriptionActive === false) {
      setCountdown(10);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user?.isSubscriptionActive]);

  const handleLogout = async () => {
    await logout();
  };

  if (user?.isSubscriptionActive === false) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-danger text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              Su período de prueba o suscripción ha vencido. Por favor contacte con +53 54523884 para coordinar el pago mensual y pueda usted seguir usando la app. Perderá acceso en {countdown} segundos.
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return null;
}
