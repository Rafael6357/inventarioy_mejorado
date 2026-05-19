import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Package, 
  LayoutDashboard, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  X,
  Check
} from 'lucide-react';
import { useDatabaseStore } from '../store/dbStore';
import { UNIT_LABELS } from '../lib/unitConversion';
import { toast } from 'sonner';
import { validateNumber, getNumberFromString } from '../lib/utils';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'onboarding_completed';

export default function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { addProduct } = useDatabaseStore();

  const [productData, setProductData] = useState({
    name: '',
    category: '',
    unit: 'u',
    quantity: 0,
    price: 0,
    cost: 0,
    description: '',
    is_individual: false,
    expiration_date: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkipAndGoToSettings = () => {
    navigate('/dashboard/settings');
    handleComplete();
  };

  const handleCreateProduct = async () => {
    if (!productData.name.trim()) return;
    
    const costValidation = validateNumber(String(productData.cost), { required: true, min: 0.01, fieldName: 'Costo unitario' });
    if (!costValidation.isValid) {
      toast.error(costValidation.error);
      return;
    }
    
    if (productData.is_individual) {
      const priceValidation = validateNumber(String(productData.price), { required: true, min: 0.01, fieldName: 'Precio de venta' });
      if (!priceValidation.isValid) {
        toast.error(priceValidation.error);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      await addProduct({
        name: productData.name,
        category: productData.category,
        unit: productData.unit,
        quantity: productData.quantity,
        price: productData.price,
        cost: productData.cost,
        description: productData.description,
        is_individual: productData.is_individual,
        expiration_date: productData.expiration_date || null,
        is_active: true
      });
      handleNext();
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Error al crear el producto. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, icon: Sparkles, title: 'Bienvenido a InventarioY', description: 'Tu nuevo sistema de gestión de inventario' },
    { number: 2, icon: Package, title: 'Crea tu Primer Producto', description: 'Añade los primeros artículos a tu inventario' },
    { number: 3, icon: LayoutDashboard, title: 'Explora el Dashboard', description: 'Conoce todas las funciones disponibles' },
    { number: 4, icon: Settings, title: 'Configura tu Negocio', description: 'Personaliza la información de tu empresa' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-surface rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 text-text-secondary hover:text-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  step >= s.number 
                    ? 'bg-primary border-primary text-surface' 
                    : 'bg-transparent border-border/50 text-text-secondary'
                }`}>
                  {step > s.number ? <Check className="h-4 w-4" /> : <span className="text-sm">{s.number}</span>}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 transition-all ${
                    step > s.number ? 'bg-primary' : 'bg-border/50'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const currentStep = steps[step - 1];
              const IconComponent = currentStep.icon;
              return (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-text">{currentStep.title}</h2>
                    <p className="text-sm text-text-secondary">{currentStep.description}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <Package className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-medium text-text">Gestión de Inventario</h3>
                  <p className="text-xs text-text-secondary mt-1">Controla tu stock en tiempo real</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <LayoutDashboard className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-medium text-text">Análisis Completo</h3>
                  <p className="text-xs text-text-secondary mt-1">Reportes y gráficos avanzados</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Sparkles className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium text-text">Asistente IA</h3>
                <p className="text-xs text-text-secondary mt-1">Obtén recomendaciones inteligentes para tu negocio</p>
              </div>
              <p className="text-sm text-text-secondary">
                Vamos a guiarte para que aproveches al máximo todas las funcionalidades.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text flex items-center gap-1">
                  Nombre del producto
                  <span title="Nombre único para identificar el producto" className="cursor-help text-primary">ⓘ</span>
                </label>
                <input
                  type="text"
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  placeholder="Ej: Arroz blanco"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text flex items-center gap-1">
                    Categoría
                    <span title="Grupo al que pertenece el producto (facilita búsquedas)" className="cursor-help text-primary">ⓘ</span>
                  </label>
                  <select
                    value={productData.category}
                    onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Bebidas y Refrescos">Bebidas y Refrescos</option>
                    <option value="Lácteos y Quesos">Lácteos y Quesos</option>
                    <option value="Carnes y Embutidos">Carnes y Embutidos</option>
                    <option value="Pescados y Mariscos">Pescados y Mariscos</option>
                    <option value="Frutas y Verduras">Frutas y Verduras</option>
                    <option value="Panadería y Dulces">Panadería y Dulces</option>
                    <option value="Enlatados y Conservas">Enlatados y Conservas</option>
                    <option value="Galletas y Snacks">Galletas y Snacks</option>
                    <option value="Granos y Cereales">Granos y Cereales</option>
                    <option value="Condimentos y Salsas">Condimentos y Salsas</option>
                    <option value="Limpieza y Hogar">Limpieza y Hogar</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text flex items-center gap-1">
                    Unidad
                    <span title="Unidad de medida: kg, L, unidades, etc." className="cursor-help text-primary">ⓘ</span>
                  </label>
                  <select
                    id="product-unit"
                    value={productData.unit}
                    onChange={(e) => setProductData({ ...productData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  >
                    {Object.entries(UNIT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text flex items-center gap-1">
                    Cantidad inicial
                    <span title="Cantidad actual en tu inventario" className="cursor-help text-primary">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    value={productData.quantity}
                    onChange={(e) => setProductData({ ...productData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text flex items-center gap-1">
                    Costo unitario ($)
                    <span title="Precio de compra por cada unidad" className="cursor-help text-primary">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    value={productData.cost}
                    onChange={(e) => setProductData({ ...productData, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text flex items-center gap-1">
                    Precio unitario ($)
                    <span title="Precio de venta al cliente por cada unidad" className="cursor-help text-primary">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    value={productData.price}
                    onChange={(e) => setProductData({ ...productData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard/inventory')}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-primary" />
                    <div className="text-left">
                      <h3 className="font-medium text-text">Inventario</h3>
                      <p className="text-xs text-text-secondary">Gestiona todos tus productos</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary" />
                </button>
                <button
                  onClick={() => navigate('/dashboard/sales')}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                    <div className="text-left">
                      <h3 className="font-medium text-text">Ventas</h3>
                      <p className="text-xs text-text-secondary">Registra y controla ventas</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary" />
                </button>
                <button
                  onClick={() => navigate('/dashboard/analysis')}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <div className="text-left">
                      <h3 className="font-medium text-text">Análisis e IA</h3>
                      <p className="text-xs text-text-secondary">Reportes y recomendaciones</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <Settings className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="font-medium text-text mb-2">Personaliza tu experiencia</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Configura la información de tu negocio, añade empleados, define roles y más.
                </p>
                <button
                  onClick={handleSkipAndGoToSettings}
                  className="px-6 py-2.5 bg-primary text-surface font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Ir a Configuración
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/50 flex justify-between">
          {step > 1 && step < 4 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 text-text-secondary hover:text-text transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-4 py-2.5 text-text-secondary hover:text-text transition-colors"
            >
              Omitir
            </button>
          )}

          {step === 2 ? (
            <button
              onClick={handleCreateProduct}
              disabled={!productData.name.trim() || isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-surface font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando...' : 'Crear Producto'}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : step < 4 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-surface font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              {step === 3 ? 'Explorar' : 'Siguiente'}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY);
}