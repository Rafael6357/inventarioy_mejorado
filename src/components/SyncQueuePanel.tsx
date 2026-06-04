import { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock,
  Package, ArrowRightLeft, ShoppingCart, Plus, Edit3, Trash2,
  DollarSign, ChefHat, XCircle
} from 'lucide-react';
import { getPendingSyncItems, getSyncQueueCount, type SyncQueueItem } from '../lib/dexieDb';
import { syncEngine } from '../lib/syncEngine';
import { useDatabaseStore } from '../store/dbStore';

const operationLabels: Record<string, string> = {
  addProduct: 'Agregar producto',
  updateProduct: 'Actualizar producto',
  deleteProduct: 'Eliminar producto',
  addMovement: 'Registrar movimiento',
  addSale: 'Registrar venta',
  cancelTransit: 'Cancelar tránsito',
  registerWasteFromTransit: 'Registrar merma',
  registerManualConsumption: 'Registrar consumo',
  createPendingAccount: 'Crear cuenta pendiente',
  chargePendingAccount: 'Cobrar cuenta pendiente',
  deletePendingAccount: 'Eliminar cuenta pendiente',
  addItemsToPendingAccount: 'Agregar items a cuenta',
  updatePendingAccountItems: 'Actualizar items de cuenta',
  togglePendingAccountType: 'Cambiar tipo de cuenta',
  createDailyClosing: 'Crear cierre de caja',
  addRecipe: 'Agregar receta',
  updateRecipe: 'Actualizar receta',
  deleteRecipe: 'Eliminar receta',
};

const operationIcons: Record<string, React.ReactNode> = {
  addProduct: <Package className="h-4 w-4" />,
  updateProduct: <Edit3 className="h-4 w-4" />,
  deleteProduct: <Trash2 className="h-4 w-4" />,
  addMovement: <ArrowRightLeft className="h-4 w-4" />,
  addSale: <ShoppingCart className="h-4 w-4" />,
  cancelTransit: <XCircle className="h-4 w-4" />,
  registerWasteFromTransit: <AlertCircle className="h-4 w-4" />,
  registerManualConsumption: <Clock className="h-4 w-4" />,
  createPendingAccount: <DollarSign className="h-4 w-4" />,
  chargePendingAccount: <DollarSign className="h-4 w-4" />,
  createDailyClosing: <DollarSign className="h-4 w-4" />,
  addRecipe: <ChefHat className="h-4 w-4" />,
  updateRecipe: <ChefHat className="h-4 w-4" />,
  deleteRecipe: <ChefHat className="h-4 w-4" />,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function SyncQueuePanel() {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncQueueCount = useDatabaseStore((s) => s.syncQueueCount);
  const syncStatus = useDatabaseStore((s) => s.syncStatus);
  const refreshSyncQueueCount = useDatabaseStore((s) => s.refreshSyncQueueCount);

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
      if (event === 'start') {
        setSyncing(true);
      }
    });
    return () => { unsub(); };
  }, [refreshSyncQueueCount]);

  useEffect(() => {
    if (syncStatus === 'syncing') setSyncing(true);
    if (syncStatus === 'idle' || syncStatus === 'complete' || syncStatus === 'error') {
      setSyncing(false);
    }
  }, [syncStatus]);

  const handleSyncNow = async () => {
    setSyncing(true);
    await syncEngine.processQueue();
  };

  const count = items.length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {navigator.onLine ? (
            <div className="p-2 rounded-lg bg-success/10">
              <Wifi className="h-5 w-5 text-success" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-danger/10">
              <WifiOff className="h-5 w-5 text-danger" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-text">Sincronización</h2>
            <p className="text-sm text-text-secondary">
              {navigator.onLine
                ? `Conectado${count > 0 ? ` · ${count} pendiente${count !== 1 ? 's' : ''}` : ''}`
                : 'Sin conexión'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing || count === 0 || !navigator.onLine}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            syncing || count === 0 || !navigator.onLine
              ? 'bg-surface-hover text-text-secondary cursor-not-allowed'
              : 'bg-primary text-bg hover:bg-primary-hover shadow-lg shadow-primary/20'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </div>

      {syncing && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Sincronizando cambios pendientes...</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden mt-2">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {count === 0 && !loading ? (
        <div className="rounded-lg border border-border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <p className="text-base font-medium text-text">Todo sincronizado</p>
          <p className="text-sm text-text-secondary mt-1">No hay cambios pendientes de sincronización.</p>
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-border p-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 text-text-secondary animate-spin" />
          <p className="text-sm text-text-secondary">Cargando cola de sincronización...</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover/50 transition-colors">
                <div className={`p-1.5 rounded-md ${
                  item.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                }`}>
                  {operationIcons[item.operation] || <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {operationLabels[item.operation] || item.operation}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-text-secondary">{formatDate(item.created_at)}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.status === 'failed'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {item.status === 'failed' ? 'Error' : 'Pendiente'}
                    </span>
                    {item.retries > 0 && (
                      <span className="text-[10px] text-text-secondary">({item.retries} intento{item.retries !== 1 ? 's' : ''})</span>
                    )}
                  </div>
                  {item.error && (
                    <p className="text-[11px] text-danger mt-0.5 truncate">{item.error}</p>
                  )}
                </div>
                <span className="text-[11px] text-text-secondary font-mono bg-surface-hover px-1.5 py-0.5 rounded">
                  {item.table}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
