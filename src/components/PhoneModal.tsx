import { useState } from 'react';
import { Phone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PhoneModal({ isOpen, onClose }: PhoneModalProps) {
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { fetchUser } = useAuthStore();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!phone.trim()) {
      toast.error('Por favor ingresa un número de teléfono');
      return;
    }

    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Error de autenticación');
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone.trim() })
      .eq('id', user.id);

    if (error) {
      toast.error('Error al guardar el teléfono');
      console.error('Error saving phone:', error);
    } else {
      toast.success('Teléfono guardado correctamente');
      localStorage.setItem('phone_modal_seen', 'true');
      await fetchUser();
      onClose();
    }
    
    setIsSaving(false);
  };

  const handleClose = () => {
    localStorage.setItem('phone_modal_seen', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">Teléfono de Contacto</h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-text-secondary hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Para mejorar la comunicación y recibir notificaciones importantes sobre tu negocio, 
            por favor ingresa tu número de teléfono.
          </p>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text mb-2">
              Número de Teléfono
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+53 5XXXXXXXX"
              className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          <p className="text-xs text-text-secondary/70">
            ⚠️ Este dato es importante para el soporte técnico y notificaciones del sistema.
          </p>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 text-sm font-medium text-text-secondary bg-bg border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            Más tarde
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 text-sm font-medium text-bg bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Guardar Teléfono'}
          </button>
        </div>
      </div>
    </div>
  );
}