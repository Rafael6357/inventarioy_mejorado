import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import * as sqlite from '../lib/sqliteLocal';
import { syncNow } from '../lib/syncEngine';
import { Button } from './ui/button';

interface SyncQueueItem {
  id: number;
  table_name: string;
  operation: string;
  data: string;
  created_at: string;
  retry_count: number;
  failed: number;
  error_message: string | null;
}

export default function SyncQueuePanel() {
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    const all = await sqlite.getAllPendingItems();
    const failed = await sqlite.getFailedSyncItems();
    setPendingItems(all.filter(i => !i.failed));
    setFailedItems(failed);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRetry = async (id: number) => {
    await sqlite.retryFailedItem(id);
    await loadItems();
    await syncNow();
  };

  const handleRetryAll = async () => {
    setSyncing(true);
    await sqlite.retryAllFailedItems();
    await syncNow();
    await loadItems();
    setSyncing(false);
  };

  const handleDelete = async (id: number) => {
    const db = await sqlite.getDB();
    if (db) {
      await db.execute('DELETE FROM sync_queue WHERE id = $1', [id]);
      await loadItems();
    }
  };

  const handleClearAll = async () => {
    const db = await sqlite.getDB();
    if (db) {
      await db.execute('DELETE FROM sync_queue WHERE synced = 0');
      await loadItems();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      products: 'Productos',
      categories: 'Categorías',
      movements: 'Movimientos',
      sales: 'Ventas',
      recipes: 'Recetas',
      employees: 'Empleados',
      departments: 'Departamentos',
      daily_closings: 'Cierres',
      transit_items: 'Tránsito'
    };
    return labels[table] || table;
  };

  const getOperationLabel = (op: string) => {
    const labels: Record<string, string> = {
      INSERT: 'Crear',
      UPDATE: 'Actualizar',
      DELETE: 'Eliminar'
    };
    return labels[op] || op;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalItems = pendingItems.length + failedItems.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cola de Sincronización</h3>
          <p className="text-sm text-muted-foreground">
            {totalItems} operación{totalItems !== 1 ? 'es' : ''} pendiente{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {failedItems.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryAll}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reintentar todo
            </Button>
          )}
          {totalItems > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {failedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-orange-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Errores ({failedItems.length})
          </h4>
          <div className="border border-orange-200 rounded-lg divide-y divide-orange-100">
            {failedItems.map((item) => (
              <div key={item.id} className="p-3 bg-orange-50/50 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {getTableLabel(item.table_name)}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                      {getOperationLabel(item.operation)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {item.error_message || 'Error desconocido'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRetry(item.id)}
                    title="Reintentar"
                  >
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4" />
            Pendientes ({pendingItems.length})
          </h4>
          <div className="border rounded-lg divide-y">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {getTableLabel(item.table_name)}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      {getOperationLabel(item.operation)}
                    </span>
                    {item.retry_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Intento {item.retry_count}/3
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalItems === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">Todo sincronizado</p>
          <p className="text-sm">No hay operaciones pendientes</p>
        </div>
      )}
    </div>
  );
}