import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDatabaseStore } from '../../store/dbStore';
import { Settings, Save, Building2, User, Shield, Printer, MessageSquare, DollarSign, QrCode, Copy, ExternalLink, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Switch } from '../../components/ui/switch';
import AccessPinsConfig from '../../components/AccessPinsConfig';
import QRCode from 'react-qr-code';

export default function SettingsView() {
  const { user, fetchUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    businessName: user?.businessName || '',
    generateTicket: user?.generateTicket ?? false,
    ticketMessage: user?.ticketMessage || '¡Gracias por su visita!',
    phone: user?.phone || '',
    address: user?.address || '',
    businessHours: user?.businessHours || '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setFormData({
        name: user.name || '',
        businessName: user.businessName || '',
        generateTicket: user.generateTicket ?? false,
        ticketMessage: user.ticketMessage || '¡Gracias por su visita!',
        phone: user.phone || '',
        address: user.address || '',
        businessHours: user.businessHours || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('Guardado ya en proceso, ignorando...');
      return;
    }
    
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
      formData.ticketMessage !== user.ticketMessage ||
      formData.phone !== (user.phone || '') ||
      formData.address !== (user.address || '') ||
      formData.businessHours !== (user.businessHours || '');

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
    setIsSubmitting(true);
    
    console.log('Intentando guardar perfil con datos:', {
      userId: user.id,
      phone: formData.phone,
      address: formData.address,
      businessHours: formData.businessHours
    });
    
    try {
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
          phone: formData.phone,
          address: formData.address,
          business_hours: formData.businessHours,
        })
        .eq('id', user.id);

      console.log('Resultado de guardado:', { error });

      if (error) {
        let errorMessage = 'Error al guardar la configuración';
        if (error.message.includes('row-level security')) {
          errorMessage = 'No tienes permisos para modificar estos datos';
        } else if (error.message.includes('duplicate')) {
          errorMessage = 'Ya existe un registro con estos datos';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet';
        }
        console.error('Error guardado:', errorMessage, error);
        toast.error(errorMessage);
        setIsSaving(false);
        setIsSubmitting(false);
      } else {
        try {
          await fetchUser();
        } catch (fetchError) {
          console.warn('No se pudo recargar el usuario:', fetchError);
        }
        
        try {
          await useDatabaseStore.getState().logAction('settings', 'CONFIG', {
            changes: Object.keys(formData).filter(k => formData[k as keyof typeof formData] !== (user as any)?.[k]).join(', ')
          });
        } catch (logError) {
          console.warn('No se pudo registrar la acción:', logError);
        }
        
        toast.success('Configuración guardada exitosamente');
        setIsSaving(false);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Excepción en guardado:', err);
      toast.error('Error inesperado al guardar');
      setIsSaving(false);
      setIsSubmitting(false);
    }
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
                {user?.subscription.status === 'trialing' ? 'Prueba Gratuita' : 'Plan Profesional'}
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

              <div className="space-y-2 pt-4">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Teléfono del Negocio
                </Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="+53 12345678"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2 pt-4">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Dirección del Negocio
                </Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Calle 123, Ciudad"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2 pt-4">
                <Label htmlFor="businessHours" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Horario de Atención
                </Label>
                <Input 
                  id="businessHours" 
                  value={formData.businessHours}
                  onChange={e => setFormData({...formData, businessHours: e.target.value})}
                  placeholder="Lun-Vie: 9am-6pm"
                  maxLength={100}
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

                <div className="pt-6 border-t border-border mt-4">
                  <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Menú Público Digital
                  </h3>
                  
                  <div className="bg-bg/50 rounded-lg p-4 space-y-4">
                    <p className="text-sm text-text-secondary">
                      Imprime este código QR y ponlo en tu negocio. Los clientes lo escanean y ven tu menú digital:
                    </p>
                    
                    {user?.id && (
                      <div className="flex flex-col items-center">
                        <div id="qr-code" className="bg-white p-4 rounded-lg">
                          <QRCode
                            value={`${window.location.origin}/menu?b=${user.id}`}
                            size={180}
                            level="H"
                          />
                        </div>
                        <p className="text-xs text-text-secondary mt-2 text-center">
                          Escanea para ver el menú
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={user?.id ? `${window.location.origin}/menu?b=${user.id}` : ''}
                        className="font-mono text-sm bg-bg text-text border-border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (user?.id) {
                            navigator.clipboard.writeText(`${window.location.origin}/menu?b=${user.id}`);
                            toast.success('Enlace copiado al portapapeles');
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const svg = document.querySelector('#qr-code svg') as SVGElement;
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                          const url = URL.createObjectURL(svgBlob);
                          
                          img.onload = () => {
                            canvas.width = 300;
                            canvas.height = 300;
                            ctx?.drawImage(img, 0, 0, 300, 300);
                            const pngUrl = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.href = pngUrl;
                            downloadLink.download = `menu-qr-${user?.name || 'negocio'}.png`;
                            downloadLink.click();
                            URL.revokeObjectURL(url);
                            toast.success('Código QR descargado');
                          };
                          img.src = url;
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar QR
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/menu?b=${user?.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Menú
                      </Button>
                    </div>
                    
                    <p className="text-xs text-text-secondary">
                      Los clientes podrán ver tus productos, precios y estado de disponibilidad sin necesidad de iniciar sesión.
                    </p>
                  </div>
                </div>
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

              <div className="pt-6 border-t border-border mt-4">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Actualizaciones
                </h3>
                
                <ActualizacionesSection />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="gap-2" disabled={isSaving || isSubmitting}>
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

function ActualizacionesSection() {
  const { 
    updateInfo, 
    isChecking, 
    error, 
    settings, 
    checkForUpdates,
    downloadAndInstall,
    toggleAutoUpdate,
    toggleEnabled 
  } = useAutoUpdater();

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (!isTauri) {
    return (
      <div className="bg-bg/50 rounded-lg p-4">
        <p className="text-sm text-text-secondary">
          Las actualizaciones automáticas están disponibles solo en la aplicación de escritorio.
        </p>
      </div>
    );
  }

  const hasUpdate = updateInfo?.available;

  return (
    <div className="bg-bg/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">Aplicación de escritorio</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUpdate ? (
            <span className="flex items-center gap-1 text-sm text-warning font-medium">
              <AlertCircle className="h-4 w-4" />
              Nueva versión disponible
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-success font-medium">
              <CheckCircle className="h-4 w-4" />
              Estás actualizado
            </span>
          )}
        </div>
      </div>

      {hasUpdate && updateInfo?.version && (
        <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
          <p className="text-sm text-text">
            <span className="font-medium">Nueva versión:</span> {updateInfo.version}
          </p>
          {updateInfo.body && (
            <p className="text-xs text-text-secondary mt-1">{updateInfo.body}</p>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger/10 rounded-lg border border-danger/30">
          <p className="text-sm text-danger">{error.message}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={checkForUpdates}
          disabled={isChecking}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Verificando...' : 'Verificar Actualizaciones'}
        </Button>

        {hasUpdate && (
          <Button
            size="sm"
            onClick={downloadAndInstall}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar e Instalar
          </Button>
        )}
      </div>

      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Auto-actualizar</Label>
            <p className="text-sm text-text-secondary">
              Descargar e instalar actualizaciones automáticamente
            </p>
          </div>
          <Switch
            checked={settings.autoUpdate}
            onCheckedChange={toggleAutoUpdate}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Verificar al iniciar</Label>
            <p className="text-sm text-text-secondary">
              Buscar actualizaciones al abrir la aplicación
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={toggleEnabled}
          />
        </div>
      </div>
    </div>
  );
}
