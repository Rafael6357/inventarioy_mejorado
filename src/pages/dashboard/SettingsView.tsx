import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Settings, Save, Building2, User, Shield } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function SettingsView() {
  const { user, fetchUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    businessName: user?.businessName || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        business_name: formData.businessName,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      await fetchUser();
      toast.success('Configuración guardada exitosamente');
    }
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Configuración</h1>
        <p className="text-sm text-text-secondary">
          Administra tu perfil, preferencias y suscripción
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
            <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary drop-shadow-[0_0_5px_rgba(205,164,52,0.8)]" />
              Estado de la Cuenta
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-text-secondary">Rol</p>
                <p className="font-medium text-text capitalize">{user?.role}</p>
              </div>
              <div>
                <p className="text-text-secondary">Plan Actual</p>
                <div className="mt-1 inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary shadow-[0_0_10px_rgba(205,164,52,0.2)]">
                  {user?.subscription.status === 'trialing' ? 'Prueba Gratuita' : 'Plan Pro'}
                </div>
              </div>
              {user?.subscription.status === 'trialing' && (
                <div>
                  <p className="text-text-secondary">Fin de prueba</p>
                  <p className="font-medium text-text">
                    {new Date(user.subscription.trialEndsAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:col-span-2">
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
            <h2 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-primary drop-shadow-[0_0_5px_rgba(205,164,52,0.8)]" />
              Perfil del Usuario
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-bg/50 text-text-secondary cursor-not-allowed"
                  />
                  <p className="text-xs text-text-secondary">El correo no se puede cambiar</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="businessName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nombre del Negocio
                </Label>
                <Input 
                  id="businessName" 
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="gap-2" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
