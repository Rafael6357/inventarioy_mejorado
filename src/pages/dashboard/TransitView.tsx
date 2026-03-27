import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { Search, Clock, Package, TrendingDown, RefreshCw, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function TransitView() {
  const { transitItems, products, cancelTransit } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelModal, setCancelModal] = useState<{
    item: any;
    quantity: number;
    reason: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const getProduct = (id: string) => products.find(p => p.id === id);

  const handleCancel = async () => {
    if (!cancelModal || !cancelModal.reason.trim()) {
      toast.error('Ingresa un motivo para la devolución');
      return;
    }
    setIsCancelling(true);
    const result = await cancelTransit(cancelModal.item.id, cancelModal.quantity, cancelModal.reason);
    setIsCancelling(false);
    if (result.success) {
      toast.success('Producto devuelto al stock exitosamente');
      setCancelModal(null);
    } else {
      toast.error(result.error || 'Error al devolver el producto');
    }
  };

  const filteredTransit = transitItems.filter(t => {
    const product = getProduct(t.product_id);
    if (!product) return false;
    return product.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedByProduct = filteredTransit.reduce((acc, item) => {
    const product = getProduct(item.product_id);
    if (!product) return acc;
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        product,
        items: [],
        totalQuantity: 0,
        totalConsumed: 0,
        totalRemaining: 0,
        oldestDate: item.sent_date,
      };
    }
    acc[item.product_id].items.push(item);
    acc[item.product_id].totalQuantity += item.quantity;
    acc[item.product_id].totalConsumed += item.consumed;
    acc[item.product_id].totalRemaining += item.remaining;
    if (new Date(item.sent_date) < new Date(acc[item.product_id].oldestDate)) {
      acc[item.product_id].oldestDate = item.sent_date;
    }
    return acc;
  }, {} as Record<string, { product: any; items: any[]; totalQuantity: number; totalConsumed: number; totalRemaining: number; oldestDate: string }>);

  const groupedArray = Object.values(groupedByProduct).sort(
    (a, b) => new Date(b.oldestDate).getTime() - new Date(a.oldestDate).getTime()
  );

  const totalInTransit = transitItems.reduce((sum, t) => sum + t.remaining, 0);
  const totalSent = transitItems.reduce((sum, t) => sum + t.quantity, 0);
  const totalConsumed = transitItems.reduce((sum, t) => sum + t.consumed, 0);
  const pendingProducts = Object.keys(groupedByProduct).length;

  const getAntiquityColor = (sentDate: string) => {
    const days = (Date.now() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) return { bg: 'bg-success/10', text: 'text-success', label: 'Hoy' };
    if (days < 3) return { bg: 'bg-warning/10', text: 'text-warning', label: `${Math.floor(days)} dia(s)` };
    return { bg: 'bg-danger/10', text: 'text-danger', label: `${Math.floor(days)} dia(s)` };
  };

  const getProgressColor = (consumed: number, total: number) => {
    const pct = total > 0 ? consumed / total : 0;
    if (pct >= 0.9) return 'bg-success';
    if (pct >= 0.5) return 'bg-primary';
    return 'bg-warning';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Tránsito de Productos</h1>
        <p className="text-sm text-text-secondary">
          Productos enviados a producción que aún no han sido consumidos en ventas
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{totalInTransit}</p>
              <p className="text-xs text-text-secondary">En Transito</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <TrendingDown className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{totalConsumed}</p>
              <p className="text-xs text-text-secondary">Consumido</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <RefreshCw className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{totalSent}</p>
              <p className="text-xs text-text-secondary">Total Enviado</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10">
              <Clock className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">{pendingProducts}</p>
              <p className="text-xs text-text-secondary">Productos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="transit-search" className="sr-only">Buscar por producto</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              id="transit-search"
              placeholder="Buscar por producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-text-secondary">
            {groupedArray.length} producto{groupedArray.length !== 1 ? 's' : ''} en transito
          </span>
        </div>

        {groupedArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-hover">
              <Package className="h-8 w-8 text-text-secondary" />
            </div>
            <p className="text-lg font-medium text-text">No hay productos en tránsito</p>
            <p className="mt-1 text-sm text-text-secondary">
              Los productos apareceran aqui cuando realices una salida de inventario hacia produccion.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedArray.map((group) => {
              const pct = group.totalQuantity > 0 ? (group.totalConsumed / group.totalQuantity) * 100 : 0;
              const antiquity = getAntiquityColor(group.oldestDate);

              return (
                <div
                  key={group.product.id}
                  className="rounded-xl border border-border bg-bg p-4 transition-colors hover:border-primary/30"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text truncate">{group.product.name}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${antiquity.bg} ${antiquity.text}`}>
                          <Clock className="h-3 w-3" />
                          {antiquity.label}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {group.items.length} lote{group.items.length !== 1 ? 's' : ''} · Enviado: {new Date(group.oldestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">{group.totalRemaining}</p>
                      <p className="text-xs text-text-secondary">Restante</p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs text-text-secondary">
                      <span>Consumo: {group.totalConsumed} / {group.totalQuantity}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(group.totalConsumed, group.totalQuantity)}`}
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>

                  {group.items.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-text-secondary hover:text-primary">
                        Ver detalle de {group.items.length} lote{group.items.length !== 1 ? 's' : ''}
                      </summary>
                      <div className="mt-2 space-y-2 rounded-lg bg-surface p-3">
                        {group.items.map((item) => {
                          const itemPct = item.quantity > 0 ? (item.consumed / item.quantity) * 100 : 0;
                          const itemAntiquity = getAntiquityColor(item.sent_date);
                          return (
                            <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${itemAntiquity.bg} ${itemAntiquity.text}`}>
                                  <Clock className="h-2.5 w-2.5" />
                                  {new Date(item.sent_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-text-secondary truncate">{item.reason || 'En produccion'}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="w-20 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                                  <div
                                    className={`h-full rounded-full ${getProgressColor(item.consumed, item.quantity)}`}
                                    style={{ width: `${Math.max(itemPct, 5)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-text">
                                  <span className="text-success">{item.consumed}</span>
                                  <span className="text-text-secondary">/</span>
                                  <span className="text-primary">{item.quantity}</span>
                                  <span className="text-text-secondary"> = </span>
                                  <span className="text-warning">{item.remaining}</span>
                                </span>
                                {item.remaining > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCancelModal({ item, quantity: item.remaining, reason: '' });
                                    }}
                                    className="flex items-center justify-center h-7 w-7 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                                    title="Devolver cantidad al stock"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
          )}
      </div>

      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10">
                  <RotateCcw className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text">Devolver al Stock</h2>
                  <p className="text-xs text-text-secondary">
                    {getProduct(cancelModal.item.product_id)?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelModal(null)}
                className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 space-y-4">
              <div className="rounded-xl bg-bg/50 border border-border p-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-text-secondary">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Disponible para devolver: <span className="font-bold text-text">{cancelModal.item.remaining} {getProduct(cancelModal.item.product_id)?.unit}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Cantidad a devolver *</label>
                  <Input
                    type="number"
                    min="0.01"
                    max={cancelModal.item.remaining}
                    step="0.01"
                    value={cancelModal.quantity}
                    onChange={(e) => setCancelModal({ ...cancelModal, quantity: Number(e.target.value) })}
                    className="no-spin"
                  />
                  <div className="flex gap-2 mt-1">
                    {[cancelModal.item.remaining * 0.25, cancelModal.item.remaining * 0.5, cancelModal.item.remaining].map((val, i) => (
                      <button
                        key={i}
                        onClick={() => setCancelModal({ ...cancelModal, quantity: Number(val.toFixed(2)) })}
                        className="flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:border-primary hover:text-primary transition-colors"
                      >
                        {i === 2 ? '100%' : `${i === 0 ? '25' : '50'}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Motivo de la devolución *</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={2}
                  placeholder="Ej: Producto en mal estado, cancelacion de produccion..."
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCancelModal(null)}
                className="flex-1"
                disabled={isCancelling}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCancel}
                className="flex-1 gap-2"
                disabled={isCancelling || cancelModal.quantity <= 0 || cancelModal.quantity > cancelModal.item.remaining || !cancelModal.reason.trim()}
              >
                {isCancelling ? 'Devolviendo...' : <><RotateCcw className="h-4 w-4" /> Devolver</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
