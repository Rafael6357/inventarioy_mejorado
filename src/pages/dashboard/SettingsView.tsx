import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDatabaseStore } from '../../store/dbStore';
import { Settings, Save, Building2, User, Shield, Printer, MessageSquare, DollarSign, QrCode, Copy, ExternalLink, Download, Sparkles, RotateCcw, Lock, ShoppingCart, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { validateNumber, getNumberFromString } from '../../lib/utils';
import { Switch } from '../../components/ui/switch';
import AccessPinsConfig from '../../components/AccessPinsConfig';
import SyncQueuePanel from '../../components/SyncQueuePanel';
import QRCode from 'react-qr-code';

export default function SettingsView() {
  const { user, fetchUser } = useAuthStore();
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, productWarehouse } = useDatabaseStore();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    businessName: user?.businessName || '',
    generateTicket: user?.generateTicket ?? false,
    ticketMessage: user?.ticketMessage || '¡Gracias por su visita!',
    phone: user?.phone || '',
    address: user?.address || '',
    businessHours: user?.businessHours || '',
    businessCode: user?.businessCode || '',
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
  
  // Modal para almacenes
  const [warehouseModal, setWarehouseModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    warehouseId?: string;
    currentName: string;
  }>({ isOpen: false, mode: 'add', currentName: '' });
  
  // Modal de confirmación para eliminar
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    warehouseId?: string;
    warehouseName?: string;
  }>({ isOpen: false });

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
        businessCode: user.businessCode || '',
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
      formData.businessHours !== (user.businessHours || '') ||
      formData.businessCode !== (user.businessCode || '');

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

    if (currencySettings.usdEnabled) {
      const usdValidation = validateNumber(String(currencySettings.usdRate), { required: true, min: 1, fieldName: 'Tasa USD' });
      if (!usdValidation.isValid) {
        toast.error(usdValidation.error);
        setIsSaving(false);
        setIsSubmitting(false);
        return;
      }
    }
    
    if (currencySettings.eurEnabled) {
      const eurValidation = validateNumber(String(currencySettings.eurRate), { required: true, min: 1, fieldName: 'Tasa EUR' });
      if (!eurValidation.isValid) {
        toast.error(eurValidation.error);
        setIsSaving(false);
        setIsSubmitting(false);
        return;
      }
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
      // Verificar si la columna business_code existe
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('business_code')
      .eq('id', user.id)
      .single();

    const businessCodeSupported = !testError || !testError.message?.includes('business_code');

    const updateData: any = {
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
    };

    if (businessCodeSupported) {
      updateData.business_code = formData.businessCode.toLowerCase().trim();
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text">Configuración</h1>
          <p className="text-sm text-text-secondary">
            Administra tu cuenta, preferencias y sistema
          </p>
        </div>

        {/* ============================================
            SECCIÓN 1: CUENTA Y PERFIL
            Grid de 2 columnas
            ============================================ */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* 1.1 Estado de la Cuenta */}
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Estado de la Cuenta
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-text-secondary">Rol</span>
                <span className="font-medium text-text capitalize">{user?.role}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-text-secondary">Plan</span>
                <div className="inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {user?.subscription?.status === 'trialing' ? 'Prueba Gratuita' : 'Plan Profesional'}
                </div>
              </div>
              {user?.subscription?.status === 'trialing' && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-text-secondary">Fin de prueba</span>
                  <span className="font-medium text-text">
                    {new Date(user?.subscription?.trialEndsAt || Date.now()).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 1.2 Perfil del Usuario */}
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Perfil del Usuario
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Nombre</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                    maxLength={100}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="h-9 bg-bg/50 text-text-secondary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="businessName" className="text-xs">Negocio</Label>
                <Input 
                  id="businessName" 
                  value={formData.businessName}
                  onChange={e => setFormData(prev => ({...prev, businessName: e.target.value}))}
                  maxLength={100}
                  className="h-9"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">Teléfono</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                    placeholder="+53..."
                    maxLength={20}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="businessHours" className="text-xs">Horario</Label>
                  <Input 
                    id="businessHours" 
                    value={formData.businessHours}
                    onChange={e => setFormData(prev => ({...prev, businessHours: e.target.value}))}
                    placeholder="Lun-Vie: 9am-6pm"
                    maxLength={100}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs">Dirección</Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={e => setFormData(prev => ({...prev, address: e.target.value}))}
                  placeholder="Calle 123, Ciudad"
                  maxLength={200}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="businessCode" className="text-xs">Código de Acceso</Label>
                <Input 
                  id="businessCode" 
                  value={formData.businessCode}
                  onChange={e => setFormData(prev => ({...prev, businessCode: e.target.value.toLowerCase().trim()}))}
                  placeholder="micafe"
                  maxLength={30}
                  className="h-9"
                />
                <p className="text-xs text-text-secondary">Para empleados con PIN</p>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" className="gap-2" disabled={isSaving || isSubmitting}>
                  <Save className="h-3 w-3" />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* ============================================
            SECCIÓN 2: VENTAS Y PUNTO DE VENTA
            Card completo con sub-secciones
            ============================================ */}
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <h2 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Ventas y Punto de Venta
          </h2>
          
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 2.1 Ticket */}
            <div className="space-y-4">
              <h3 className="font-medium text-text flex items-center gap-2">
                <Printer className="h-4 w-4 text-text-secondary" />
                Ticket
              </h3>
              <div className="flex items-center justify-between p-3 bg-bg/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm">Generar ticket</Label>
                  <p className="text-xs text-text-secondary">Después de cada venta</p>
                </div>
                <Switch
                  checked={formData.generateTicket}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, generateTicket: checked}))}
                />
              </div>
              {formData.generateTicket && (
                <div className="space-y-1">
                  <Label className="text-xs">Mensaje del ticket</Label>
                  <Input 
                    value={formData.ticketMessage}
                    onChange={e => setFormData(prev => ({...prev, ticketMessage: e.target.value}))}
                    maxLength={100}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {/* 2.2 Monedas */}
            <div className="space-y-4">
              <h3 className="font-medium text-text flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-text-secondary" />
                Monedas
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-bg/50 rounded-lg">
                  <Label className="text-sm">USD</Label>
                  <Switch
                    checked={currencySettings.usdEnabled}
                    onCheckedChange={(checked) => setCurrencySettings(prev => ({...prev, usdEnabled: checked}))}
                  />
                </div>
                {currencySettings.usdEnabled && (
                  <Input 
                    type="number"
                    min="1"
                    value={currencySettings.usdRate}
                    onChange={e => setCurrencySettings(prev => ({...prev, usdRate: Number(e.target.value)}))}
                    className="h-8 text-sm"
                    placeholder="Tasa USD→CUP"
                  />
                )}
                <div className="flex items-center justify-between p-2 bg-bg/50 rounded-lg">
                  <Label className="text-sm">EUR</Label>
                  <Switch
                    checked={currencySettings.eurEnabled}
                    onCheckedChange={(checked) => setCurrencySettings(prev => ({...prev, eurEnabled: checked}))}
                  />
                </div>
                {currencySettings.eurEnabled && (
                  <Input 
                    type="number"
                    min="1"
                    value={currencySettings.eurRate}
                    onChange={e => setCurrencySettings(prev => ({...prev, eurRate: Number(e.target.value)}))}
                    className="h-8 text-sm"
                    placeholder="Tasa EUR→CUP"
                  />
                )}
                <div className="flex items-center justify-between p-2 bg-bg/50 rounded-lg">
                  <Label className="text-sm">CUP Transferencia</Label>
                  <Switch
                    checked={currencySettings.cupTransferEnabled}
                    onCheckedChange={(checked) => setCurrencySettings(prev => ({...prev, cupTransferEnabled: checked}))}
                  />
                </div>
              </div>
            </div>

            {/* 2.3 Menú Digital */}
            <div className="space-y-4">
              <h3 className="font-medium text-text flex items-center gap-2">
                <QrCode className="h-4 w-4 text-text-secondary" />
                Menú Digital
              </h3>
              <div className="bg-bg/50 rounded-lg p-3 space-y-3">
                {user?.id && (
                  <>
                    <div className="flex justify-center">
                      <div id="qr-code" className="bg-white p-2 rounded-lg">
                        <QRCode
                          value={`${window.location.origin}/menu?b=${user.id}`}
                          size={120}
                          level="H"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/menu?b=${user.id}`}
                        className="h-7 text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          if (user?.id) {
                            navigator.clipboard.writeText(`${window.location.origin}/menu?b=${user.id}`);
                            toast.success('Copiado');
                          }
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7"
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
                            canvas.width = 200;
                            canvas.height = 200;
                            ctx?.drawImage(img, 0, 0, 200, 200);
                            const link = document.createElement('a');
                            link.href = canvas.toDataURL('image/png');
                            link.download = 'menu-qr.png';
                            link.click();
                            toast.success('QR descargado');
                          };
                          img.src = url;
                        }
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Descargar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            SECCIÓN 3: ALMACENES
            Card completo
            ============================================ */}
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Almacenes
          </h2>
          <div className="space-y-3">
            {warehouses.length === 0 && (
              <p className="text-sm text-text-secondary">No hay almacenes configurados</p>
            )}
            {warehouses.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-bg/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-text-secondary" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{w.name}</span>
                    <span className="text-xs text-text-secondary">
                      ({productWarehouse.filter(pw => pw.warehouse_id === w.id).length})
                    </span>
                    {w.is_main && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Principal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setWarehouseModal({ isOpen: true, mode: 'edit', warehouseId: w.id, currentName: w.name });
                    }}
                  >
                    Editar
                  </Button>
                  {!w.is_main && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger"
                      onClick={() => {
                        setDeleteModal({ isOpen: true, warehouseId: w.id, warehouseName: w.name });
                      }}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {warehouses.length < 3 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  setWarehouseModal({ isOpen: true, mode: 'add', currentName: '' });
                }}
              >
                + Agregar almacén
              </Button>
            )}
            {warehouses.length >= 3 && (
              <p className="text-xs text-text-secondary text-center">Máximo 3 almacenes permitidos</p>
            )}
          </div>
        </div>

        {/* ============================================
            SECCIÓN 4: CONTROL DE ACCESO
            Card completo
            ============================================ */}
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Control de Acceso
          </h2>
          <AccessPinsConfig />
        </div>

        {/* ============================================
            SECCIÓN 5: SISTEMA
            Card completo
            ============================================ */}
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Sistema
          </h2>
          <div className="flex items-center justify-between p-4 bg-bg/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Tour de Bienvenida</Label>
              <p className="text-xs text-text-secondary">Reinicia el onboarding para ver el tour nuevamente</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('onboarding_completed');
                toast.success('Onboarding reiniciado. Recarga la página.');
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reiniciar
            </Button>
          </div>
        </div>

        {/* ============================================
            SECCIÓN 6: SINCRONIZACIÓN
            ============================================ */}
        <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
          <SyncQueuePanel />
        </div>
        </div>

        {/* Modal para almacenes */}
        {warehouseModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl border border-border">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {warehouseModal.mode === 'add' ? 'Nuevo Almacén' : 'Editar Almacén'}
                </h3>
                <button onClick={() => setWarehouseModal({ isOpen: false, mode: 'add', currentName: '' })} className="text-text-secondary hover:text-text">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="warehouseName">Nombre</Label>
                  <Input
                    id="warehouseName"
                    value={warehouseModal.currentName}
                    onChange={(e) => setWarehouseModal({ ...warehouseModal, currentName: e.target.value })}
                    placeholder="Nombre del almacén"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setWarehouseModal({ isOpen: false, mode: 'add', currentName: '' })}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1 gap-2"
                    onClick={async () => {
                      if (!warehouseModal.currentName.trim()) {
                        toast.error('El nombre no puede estar vacío');
                        return;
                      }
                      
                      if (warehouseModal.mode === 'add') {
                        await addWarehouse(warehouseModal.currentName.trim(), false);
                        toast.success('Almacén creado');
                      } else if (warehouseModal.mode === 'edit' && warehouseModal.warehouseId) {
                        await updateWarehouse(warehouseModal.warehouseId, warehouseModal.currentName.trim());
                        toast.success('Almacén actualizado');
                      }
                      
                      setWarehouseModal({ isOpen: false, mode: 'add', currentName: '' });
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {warehouseModal.mode === 'add' ? 'Crear' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
)}

        {/* Modal de confirmación para eliminar */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl border border-border">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                  <X className="h-5 w-5 text-danger" />
                  Eliminar Almacén
                </h3>
                <button onClick={() => setDeleteModal({ isOpen: false })} className="text-text-secondary hover:text-text">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-text">
                  ¿Estás seguro de que deseas eliminar el almacén <strong className="text-text">"{deleteModal.warehouseName}"</strong>?
                </p>
<p className="text-xs text-text-secondary">
                  El stock de este almacén será migrado al almacén principal.
                </p>

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setDeleteModal({ isOpen: false })}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1 gap-2 bg-danger hover:bg-danger/90"
                    onClick={async () => {
                      if (deleteModal.warehouseId) {
                        await deleteWarehouse(deleteModal.warehouseId);
                      }
                      setDeleteModal({ isOpen: false });
                    }}
                  >
                    <X className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
