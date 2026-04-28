import React, { useState, useEffect } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Search, X, DollarSign } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import TicketView from './TicketView';

export default function SalesView() {
  const { user } = useAuthStore();
  const { products, recipes, employees, sales, dailyClosings, addSale, createDailyClosing, getDailyClosings } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  const today = new Date().toISOString().split('T')[0];
  const [closingDate, setClosingDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [saleType, setSaleType] = useState<'SALON' | 'DOMICILIO'>('SALON');
  const [employeeId, setEmployeeId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastEmployeeId') || '';
    }
    return '';
  });
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastEmployeeId', id);
    }
  };

  const [closingNotes, setClosingNotes] = useState('');
  const [closingAmount, setClosingAmount] = useState(0);
  const [closingSales, setClosingSales] = useState<any[]>([]);
  const [closingLoading, setClosingLoading] = useState(false);

  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.date).toISOString().split('T')[0];
    return saleDate === closingDate;
  });

  const todayTotal = todaySales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const todayDiscounts = todaySales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
  const todayRefunds = 0;

  const isClosed = dailyClosings.some(c => {
    const d = new Date(c.closing_date).toISOString().split('T')[0];
    return d === closingDate;
  });

  const openClosingModal = () => {
    const items = todaySales.map(s => ({
      id: s.id,
      total: Number(s.total_amount) || 0,
      discount: Number(s.discount) || 0,
      saleType: s.sale_type,
      date: s.created_at
    }));
    setClosingSales(items);
    setClosingAmount(todayTotal - todayDiscounts);
    setClosingNotes('');
    setShowClosingModal(true);
  };

  const confirmClosing = async () => {
    if (!user) return;
    
    if (todaySales.length === 0) {
      toast.error('No hay ventas en la fecha seleccionada');
      return;
    }
    
    setClosingLoading(true);
    try {
      const selectedEmployee = employees.find(e => e.id === employeeId);
      const result = await createDailyClosing({
        user_id: user.id,
        closing_date: closingDate,
        total_sales: todayTotal,
        total_discounts: todayDiscounts,
        total_refunds: todayRefunds,
        closing_amount: closingAmount,
        notes: closingNotes,
        created_by: employeeId || user.id,
        created_by_name: selectedEmployee ? selectedEmployee.name : user.name
      });
      if (result.success) {
        toast.success(`Cierre de caja del ${closingDate} registrado`);
        setShowClosingModal(false);
        getDailyClosings();
      } else {
        toast.error(result.error || 'Error al registrar cierre');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setClosingLoading(false);
    }
  };
  
  const [cart, setCart] = useState<{
    product_id: string;
    name: string;
    quantity: number;
    price: number;
    cost: number;
    unit: string;
    is_recipe?: boolean;
    recipe_snapshot?: {
      name: string;
      ingredients: {
        product_id: string;
        quantity: number;
        cost: number;
      }[];
    };
  }[]>([]);

  // Combine products and recipes for the catalog
  const catalogItems = [
    ...activeProducts.filter(p => p.is_individual).map(p => ({ ...p, is_recipe: false })),
    ...recipes.map(r => {
      // Calculate cost of recipe
      const cost = r.ingredients.reduce((sum, ing) => {
        const product = products.find(p => p.id === ing.product_id);
        return sum + ((product?.cost || 0) * ing.quantity);
      }, 0);
      return {
        id: r.id,
        name: r.name,
        category: 'Recetas',
        price: r.selling_price,
        cost,
        unit: 'porción',
        quantity: 999, // Recipes don't have direct stock, it depends on ingredients
        is_recipe: true,
        recipe_snapshot: {
          name: r.name,
          ingredients: r.ingredients.map(ing => {
            const product = products.find(p => p.id === ing.product_id);
            return {
              product_id: ing.product_id,
              quantity: ing.quantity,
              cost: product?.cost || 0
            };
          })
        }
      };
    })
  ];

  const filteredProducts = catalogItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (item: any) => {
    setCart(current => {
      const existing = current.find(c => c.product_id === item.id);
      if (existing) {
        return current.map(c => 
          c.product_id === item.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...current, {
        product_id: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
        cost: item.cost,
        unit: item.unit,
        is_recipe: item.is_recipe,
        recipe_snapshot: item.recipe_snapshot
      }];
    });
  };

  const updateQuantity = (product_id: string, delta: number) => {
    setCart(current => current.map(item => {
      if (item.product_id === product_id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (product_id: string) => {
    setCart(current => current.filter(item => item.product_id !== product_id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - Math.min(discount, subtotal));

  const handleCheckout = () => {
    if (!user) return;
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    setShowPreview(true);
  };

  const confirmSale = async () => {
    if (!user) return;

    try {
      const result = await addSale({
        employee_id: employeeId || user.id,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.cost,
          selling_price: item.price,
          subtotal: item.price * item.quantity,
          is_recipe: item.is_recipe,
          recipe_snapshot: item.recipe_snapshot
        })),
        total_amount: total,
        date: closingDate,
        sale_type: saleType,
        notes,
        discount
      });

      if (!result.success) {
        setShowPreview(false);
        toast.error(result.error || 'No se pudo completar la venta');
        return;
      }

      setCart([]);
      setDiscount(0);
      setNotes('');
      setShowPreview(false);
      
      const successMessage = navigator.onLine ? 'Venta registrada exitosamente' : 'Venta guardada offline. Se sincronizará cuando haya conexión.';
      toast.success(successMessage);

      if (user?.generateTicket) {
        const selectedEmployee = employees.find(e => e.id === employeeId);
        const empName = selectedEmployee ? selectedEmployee.name : (user.name || 'Dueño');
        
        setTicketData({
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity
          })),
          total: total,
          employeeName: empName,
          businessName: user.businessName || 'Mi Negocio',
          ticketMessage: user.ticketMessage || '¡Gracias por su visita!',
          date: new Date()
        });
        setShowTicket(true);
      }
    } catch (err) {
      setShowPreview(false);
      toast.error((err as Error).message || 'Error al registrar la venta');
    }
  };

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const sellerName = selectedEmployee ? selectedEmployee.name : '(Yo)';

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 lg:flex-row">
      {/* Panel Izquierdo - Catálogo de Productos */}
      <div className="flex flex-1 flex-col rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(255,193,7,0.15)]">
        <div className="border-b border-border/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text">Punto de Venta</h2>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={closingDate}
                onChange={e => setClosingDate(e.target.value)}
                className="w-auto h-8 text-sm font-mono"
              />
              {isClosed && (
                <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success font-medium">Cerrado</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-text-secondary">Ventas del día</p>
              <p className="font-mono font-bold text-primary">${todayTotal.toFixed(2)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openClosingModal}
              disabled={todaySales.length === 0 || isClosed}
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {isClosed ? 'Día Cerrado' : todaySales.length === 0 ? 'Sin ventas' : 'Cierre de Caja'}
            </Button>
          </div>
        </div>
        <div className="relative flex items-center px-4 pt-3">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder="Buscar producto para vender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-shrink-0 h-px bg-border/50 mx-4 mt-3" />
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-bg/50 p-4 text-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_15px_-3px_rgba(205,164,52,0.2)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                <div className="mb-2 rounded-full bg-surface-hover p-3 text-text-secondary transition-colors group-hover:text-primary group-hover:bg-primary/20">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-text line-clamp-2 text-sm">{product.name}</h3>
                <p className="mt-1 font-mono text-sm font-bold text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.3)]">
                  ${product.price.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {product.is_recipe ? 'Receta' : `En Tránsito: ${(product as any).in_transit || 0} ${product.unit}`}
                </p>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-text-secondary">
                No se encontraron productos.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Derecho - Carrito y Cobro */}
      <div className="flex w-full flex-col rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm lg:w-[400px] transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="border-b border-border/50 p-4">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(205,164,52,0.5)]" />
            Carrito Actual
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 animate-scrollbar-pulse">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-text-secondary">
              <ShoppingCart className="mb-4 h-12 w-12 opacity-20" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-bg p-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text truncate text-sm">{item.name}</h4>
                    <p className="font-mono text-xs text-primary">${item.price.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="rounded-xl bg-surface-hover p-1 text-text hover:bg-border transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="rounded-md bg-surface-hover p-1 text-text hover:bg-border transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="text-right font-mono font-medium text-sm w-16">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-text-secondary hover:text-danger transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-bg/50 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="saleType" className="text-xs font-medium text-text-secondary block mb-1">Tipo de Venta</label>
              <select 
                id="saleType"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={saleType}
                onChange={e => setSaleType(e.target.value as any)}
              >
                <option value="SALON">En Salón</option>
                <option value="DOMICILIO">A Domicilio</option>
              </select>
            </div>
            <div>
              <label htmlFor="seller" className="text-xs font-medium text-text-secondary block mb-1">Vendedor</label>
              <select
                id="seller" 
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={employeeId}
                onChange={e => handleEmployeeChange(e.target.value)}
              >
                <option value="">{user ? `Dueño: ${user.name}` : '(Yo)'}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Descuento ($)</span>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              className="w-24 h-8 text-right font-mono" 
              value={discount || ''} 
              onChange={e => setDiscount(Math.min(Number(e.target.value), subtotal))}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-lg font-bold text-text">Total</span>
            <span className="text-2xl font-mono font-bold text-primary">${total.toFixed(2)}</span>
          </div>

          <Button 
            className="w-full h-12 text-base gap-2" 
            onClick={handleCheckout}
            disabled={cart.length === 0 || isClosed}
          >
            <CreditCard className="h-5 w-5" />
            {isClosed ? 'Día Cerrado' : 'Cobrar Venta'}
          </Button>
        </div>
      </div>

      {/* Checkout Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text">Resumen de Venta</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 max-h-[40vh] overflow-y-auto pr-2 space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm border-b border-border/50 pb-2">
                  <div className="flex gap-2 text-text">
                    <span className="font-mono text-primary">{item.quantity}x</span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-mono text-text-secondary">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl bg-bg/50 p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal:</span>
                <span className="font-mono text-text">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-danger">
                  <span>Descuento:</span>
                  <span className="font-mono">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                <span className="text-text-secondary">Costo Total:</span>
                <span className="font-mono text-text-secondary">
                  ${cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-success">Ganancia:</span>
                <span className="font-mono text-success">
                  ${(total - cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Margen:</span>
                <span className="font-mono text-text-secondary">
                  {total > 0 ? (((total - cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0)) / total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border/50 pt-2">
                <span className="text-text">Total a Cobrar:</span>
                <span className="font-mono text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-6 text-sm text-text-secondary bg-surface-hover p-3 rounded-lg">
              <p><span className="font-medium text-text">Vendedor:</span> {sellerName}</p>
              <p><span className="font-medium text-text">Tipo:</span> {saleType === 'SALON' ? 'En Salón' : 'A Domicilio'}</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={confirmSale}
              >
                <CreditCard className="h-4 w-4" />
                Confirmar Venta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cierre de Caja Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text">Cierre de Caja</h2>
                <p className="text-sm text-text-secondary">{closingDate}</p>
              </div>
              <button
                onClick={() => setShowClosingModal(false)}
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl bg-bg/50 p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Ventas registradas:</span>
                <span className="font-mono text-text">{closingSales.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Ventas:</span>
                <span className="font-mono text-text">${todayTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-danger">
                <span>Descuentos:</span>
                <span className="font-mono">-${todayDiscounts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Devoluciones:</span>
                <span className="font-mono">$${todayRefunds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border/50 pt-2">
                <span className="text-text">Total en Caja:</span>
                <span className="font-mono text-primary">${closingAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-text-secondary block mb-1">Notas (opcional)</label>
              <textarea
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none resize-none"
                rows={2}
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="Observaciones del cierre..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowClosingModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={confirmClosing}
                disabled={closingLoading}
              >
                <DollarSign className="h-4 w-4" />
                {closingLoading ? 'Registrando...' : 'Confirmar Cierre'}
              </Button>
            </div>
          </div>
</div>
        )}
      
      {showTicket && ticketData && (
        <TicketView
          ticketData={ticketData}
          onClose={() => setShowTicket(false)}
        />
      )}
    </div>
  );
}
