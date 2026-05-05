import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDatabaseStore } from '../../store/dbStore';
import { Settings, Save, Building2, User, Shield, Printer, MessageSquare, DollarSign } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Switch } from '../../components/ui/switch';
import AccessPinsConfig from '../../components/AccessPinsConfig';

export default function SettingsView() {
  const { user, fetchUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    businessName: user?.businessName || '',
    generateTicket: user?.generateTicket ?? false,
    ticketMessage: user?.ticketMessage || '¡Gracias por su visita!',
  });
  const [currencySettings, setCurrencySettings] = useState({
    usdEnabled: user?.usdEnabled ?? false,
    usdRate: user?.usdRate ?? 320,
    eurEnabled: user?.eurEnabled ?? false,
    eurRate: user?.eurRate ?? 350,
    cupEnabled: true,
    cupTransferEnabled: user?.cupTransferEnabled ?? false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setCurrencySettings({
        usdEnabled: user.usdEnabled ?? false,
        usdRate: user.usdRate ?? 320,
        eurEnabled: user.eurEnabled ?? false,
        eurRate: user.eurRate ?? 350,
        cupEnabled: true,
        cupTransferEnabled: user.cupTransferEnabled ?? false,
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    if (formData.businessName && formData.businessName.trim().length > 100) {
      toast.error('El nombre del negocio es demasiado largo (máx. 100 caracteres)');
      return;
    }

    const hasFormChanges = formData.name !== user.name || 
      formData.businessName !== user.businessName ||
      formData.generateTicket !== user.generateTicket ||
      formData.ticketMessage !== user.ticketMessage;

    const hasCurrencyChanges = 
      currencySettings.usdEnabled !== (user.usdEnabled ?? false) ||
      currencySettings.usdRate !== (user.usdRate ?? 320) ||
      currencySettings.eurEnabled !== (user.eurEnabled ?? false) ||
      currencySettings.eurRate !== (user.eurRate ?? 350) ||
      currencySettings.cupTransferEnabled !== (user.cupTransferEnabled ?? false);

    if (!hasFormChanges && !hasCurrencyChanges) {
      toast.info('No hay cambios que guardar');
      return;
    }
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        business_name: formData.businessName,
        generate_ticket: formData.generateTicket,
        ticket_message: formData.ticketMessage,
        usd_enabled: currencySettings.usdEnabled,
        usd_rate: currencySettings.usdRate,
        eur_enabled: currencySettings.eurEnabled,
        eur_rate: currencySettings.eurRate,
        cup_transfer_enabled: currencySettings.cupTransferEnabled,
      })
      .eq('id', user.id);

    if (error) {
      let errorMessage = 'Error al guardar la configuración';
      if (error.message.includes('row-level security')) {
        errorMessage = 'No tienes permisos para modificar estos datos';
      } else if (error.message.includes('duplicate')) {
        errorMessage = 'Ya existe un registro con estos datos';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet';
      }
      toast.error(errorMessage);
    } else {
      await fetchUser();
      await useDatabaseStore.getState().logAction('settings', 'CONFIG', {
        changes: Object.keys(formData).filter(k => formData[k as keyof typeof formData] !== (user as any)?.[k]).join(', ')
      });
      toast.success('Configuración guardada exitosamente');
    }
    
    setIsSaving(false);
  };

  return (
    <>
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold text-text">Configuración</h1>
          <p className="text-sm text-text-secondary">
            Administra tu perfil, preferencias y suscripción
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        {/* Estado de la Cuenta - Fila 1 columna 1 */}
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

        {/* Perfil del Usuario - Fila 1 columna 2 */}
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-8 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <h2 className="text-xl font-semibold text-text mb-6 flex items-center gap-2">
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
                    maxLength={100}
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
                  maxLength={100}
                  required
                />
              </div>

              <div className="pt-6 border-t border-border mt-4">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Configuración de Ticket
                </h3>
                
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Generar ticket al vender</Label>
                    <p className="text-sm text-text-secondary">
                      Mostrará un ticket después de cada venta
                    </p>
                  </div>
                  <Switch
                    checked={formData.generateTicket}
                    onCheckedChange={(checked) => setFormData({...formData, generateTicket: checked})}
                  />
                </div>

                {formData.generateTicket && (
                  <div className="space-y-2 pt-4">
                    <Label htmlFor="ticketMessage" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Mensaje del ticket
                    </Label>
                    <Input 
                      id="ticketMessage" 
                      value={formData.ticketMessage}
                      onChange={e => setFormData({...formData, ticketMessage: e.target.value})}
                      maxLength={100}
                      placeholder="¡Gracias por su visita!"
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border mt-4">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Monedas Aceptadas
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Aceptar USD</Label>
                      <p className="text-sm text-text-secondary">
                        Permitir pagos en dólares estadounidenses
                      </p>
                    </div>
                    <Switch
                      checked={currencySettings.usdEnabled}
                      onCheckedChange={(checked) => setCurrencySettings({...currencySettings, usdEnabled: checked})}
                    />
                  </div>
                  
                  {currencySettings.usdEnabled && (
                    <div className="pl-4 py-2">
                      <Label className="text-sm">Tasa de cambio USD a CUP</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={currencySettings.usdRate}
                        onChange={e => setCurrencySettings({...currencySettings, usdRate: Number(e.target.value)})}
                        className="w-32 mt-1"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Aceptar EUR</Label>
                      <p className="text-sm text-text-secondary">
                        Permitir pagos en euros
                      </p>
                    </div>
                    <Switch
                      checked={currencySettings.eurEnabled}
                      onCheckedChange={(checked) => setCurrencySettings({...currencySettings, eurEnabled: checked})}
                    />
                  </div>
                  
                  {currencySettings.eurEnabled && (
                    <div className="pl-4 py-2">
                      <Label className="text-sm">Tasa de cambio EUR a CUP</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={currencySettings.eurRate}
                        onChange={e => setCurrencySettings({...currencySettings, eurRate: Number(e.target.value)})}
                        className="w-32 mt-1"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Aceptar CUP Transferencia</Label>
                      <p className="text-sm text-text-secondary">
                        Permitir pagos por transferencia
                      </p>
                    </div>
                    <Switch
                      checked={currencySettings.cupTransferEnabled}
                      onCheckedChange={(checked) => setCurrencySettings({...currencySettings, cupTransferEnabled: checked})}
                    />
                  </div>
                </div>
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

        {/* Control de Acceso - Ancho completo */}
        <div className="md:col-span-2 rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-8 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <AccessPinsConfig />
        </div>
      </div>
    </>
  );
}
