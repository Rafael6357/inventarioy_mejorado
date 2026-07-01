import { useState, useEffect, useMemo } from 'react';
import { X, Package, ArrowRightLeft, ShoppingCart, AlertCircle, Clock, Edit3, Trash2, DollarSign, ChefHat, XCircle, RefreshCw } from 'lucide-react';
import { getPendingSyncItems, removeSyncItem, getCachedProducts, type SyncQueueItem } from '../lib/dexieDb';
import { syncEngine } from '../lib/syncEngine';
import { useDatabaseStore } from '../store/dbStore';
import { useAuthStore } from '../store/authStore';
import { useModalAnimation } from '../lib/animations/useModalAnimation';

import { OPERATION_LABELS } from '../lib/constants';

const operationMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  addProduct: { label: 'Agregar producto', icon: <Package className="h-4 w-4" /> },
  updateProduct: { label: 'Actualizar producto', icon: <Edit3 className="h-4 w-4" /> },
  deleteProduct: { label: 'Eliminar producto', icon: <Trash2 className="h-4 w-4" /> },
  addMovement: { label: 'Registrar movimiento', icon: <ArrowRightLeft className="h-4 w-4" /> },
  addSale: { label: 'Registrar venta', icon: <ShoppingCart className="h-4 w-4" /> },
  cancelTransit: { label: 'Cancelar tránsito', icon: <XCircle className="h-4 w-4" /> },
  registerWasteFromTransit: { label: 'Registrar merma', icon: <AlertCircle className="h-4 w-4" /> },
  registerManualConsumption: { label: 'Registrar consumo', icon: <Clock className="h-4 w-4" /> },
  createPendingAccount: { label: 'Crear cuenta pendiente', icon: <DollarSign className="h-4 w-4" /> },
  chargePendingAccount: { label: 'Cobrar cuenta pendiente', icon: <DollarSign className="h-4 w-4" /> },
  createDailyClosing: { label: 'Crear cierre de caja', icon: <DollarSign className="h-4 w-4" /> },
  addRecipe: { label: 'Agregar receta', icon: <ChefHat className="h-4 w-4" /> },
  updateRecipe: { label: 'Actualizar receta', icon: <ChefHat className="h-4 w-4" /> },
  deleteRecipe: { label: 'Eliminar receta', icon: <ChefHat className="h-4 w-4" /> },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

interface EnrichedItem {
  item: SyncQueueItem;
  productName: string | null;
  detail: string;
  detailColor: string;
}

function enrichItem(item: SyncQueueItem, productMap: Map<string, string>): EnrichedItem {
  const p = item.payload;
  let productName: string | null = null;
  let detail = '';
  let detailColor = 'text-text-secondary';

  switch (item.operation) {
    case 'addMovement': {
      const pid = p.product_id;
      productName = productMap.get(pid) || pid?.slice(0, 8) || '—';
      const mType = p.type || '';
      detail = `Movimiento ${mType} · ${p.quantity ?? '?'} ${p.unit ?? ''}`;
      detailColor = mType === 'ENTRADA' ? 'text-success' : mType === 'SALIDA' ? 'text-primary' : 'text-warning';
      break;
    }
    case 'addProduct': {
      productName = p.product?.name || 'Producto nuevo';
      detail = `Cantidad inicial: ${p.product?.quantity ?? 0}`;
      break;
    }
    case 'updateProduct': {
      const updates = p.updates || {};
      productName = productMap.get(p.id) || p.id?.slice(0, 8) || '—';
      const changed = Object.keys(updates).filter(k => k !== 'updated_at').join(', ');
      detail = `Actualizar: ${changed || 'varios campos'}`;
      break;
    }
    case 'addSale': {
      const sale = p.sale || {};
      productName = 'Venta';
      detail = `$${Number(sale.total_amount || 0).toFixed(2)} · ${(p.sale_items || []).length} item${p.sale_items?.length !== 1 ? 's' : ''}`;
      break;
    }
    case 'addRecipe': {
      const recipe = p.recipe || {};
      productName = recipe.name || 'Receta nueva';
      detail = `Precio venta: $${Number(recipe.selling_price || 0).toFixed(2)} · ${(p.ingredients || []).length} ingrediente${p.ingredients?.length !== 1 ? 's' : ''}`;
      break;
    }
    case 'cancelTransit': {
      productName = productMap.get(p.productId) || p.productId?.slice(0, 8) || '—';
      detail = `Devolver ${p.quantity} unidades · ${p.reason || ''}`;
      break;
    }
    case 'registerWasteFromTransit': {
      productName = productMap.get(p.productId) || p.productId?.slice(0, 8) || '—';
      detail = `Merma ${p.quantity} unidades · ${p.reason || ''}`;
      detailColor = 'text-danger';
      break;
    }
    case 'registerManualConsumption': {
      productName = productMap.get(p.productId) || p.productId?.slice(0, 8) || '—';
      detail = `Consumir ${p.quantity} unidades${p.note ? ` · ${p.note}` : ''}`;
      break;
    }
    default: {
      productName = null;
      detail = item.table;
      break;
    }
  }

  return { item, productName, detail, detailColor };
}

export default function SyncQueueModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const refreshSyncQueueCount = useDatabaseStore((s) => s.refreshSyncQueueCount);
  const user = useAuthStore((s) => s.user);
  const { backdropRef, cardRef } = useModalAnimation(true);

  const loadItems = async () => {
    setLoading(true);
    const pending = await getPendingSyncItems();
    setItems(pending.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')));
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const unsub = syncEngine.onEvent((event) => {
      if (event === 'complete' || event === 'error' || event === 'idle') {
        setSyncing(false);
        loadItems();
        refreshSyncQueueCount();
      }
      if (event === 'start') setSyncing(true);
    });
    return () => { unsub(); };
  }, [refreshSyncQueueCount]);

  const [productMap, setProductMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    getCachedProducts(user.id).then((prods) => {
      setProductMap(new Map(prods.map(p => [p.id, p.name])));
    });
  }, [user, items]);

  const enrichedItems = useMemo(() => items.map((it) => enrichItem(it, productMap)), [items, productMap]);

  const handleSyncNow = async () => {
    setSyncing(true);
    await syncEngine.processQueue();
  };

  const handleCancel = async (id: number) => {
    setCancelling(id);
    await removeSyncItem(id);
    await loadItems();
    await refreshSyncQueueCount();
    setCancelling(null);
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop">
      <div ref={cardRef} className="w-full max-w-lg mx-4 max-h-[80vh] rounded-xl bg-surface border border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text">Cambios pendientes</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {syncing && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                <span className="text-sm font-medium text-primary">Sincronizando...</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 text-text-secondary animate-spin" />
            </div>
          ) : enrichedItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
                <Package className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-text">No hay cambios pendientes</p>
              <p className="text-xs text-text-secondary mt-1">Todo está sincronizado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {enrichedItems.map((ei) => {
                const meta = operationMeta[ei.item.operation];
                const isFailed = ei.item.status === 'failed';
                return (
                  <div key={ei.item.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg/50 group">
                    <div className={`p-1.5 rounded-md mt-0.5 ${
                      isFailed ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                    }`}>
                      {meta?.icon || <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text truncate">
                          {ei.productName || meta?.label || ei.item.operation}
                        </p>
                        {ei.productName && (
                          <span className="text-[10px] text-text-secondary font-mono shrink-0">
                            {meta?.label}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${ei.detailColor} truncate mt-0.5`}>{ei.detail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-text-secondary">{formatDate(ei.item.created_at)}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          isFailed ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                        }`}>
                          {isFailed ? 'Error' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => ei.item.id != null && handleCancel(ei.item.id)}
                      disabled={cancelling === ei.item.id}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger/10 text-text-secondary hover:text-danger transition-all shrink-0 disabled:opacity-50"
                      title="Cancelar esta acción"
                    >
                      {cancelling === ei.item.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-bg/30 rounded-b-xl">
          <span className="text-xs text-text-secondary">
            {enrichedItems.length} item{enrichedItems.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-border text-sm font-medium text-text hover:bg-surface-hover transition-colors"
            >
              Cerrar
            </button>
            {enrichedItems.length > 0 && navigator.onLine && (
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-4 py-1.5 rounded-lg bg-primary text-bg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sinc. ahora'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
