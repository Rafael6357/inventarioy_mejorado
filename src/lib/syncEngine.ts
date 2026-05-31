import { getPendingSyncItems, removeSyncItem, updateSyncItemStatus, addToSyncQueue, getSyncQueueCount, getFailedSyncItems } from './dexieDb';
import type { SyncQueueItem } from './dexieDb';
import { useDatabaseStore } from '../store/dbStore';
import { supabase } from './supabase';

type SyncEvent = 'start' | 'progress' | 'complete' | 'error' | 'idle' | 'synced' | 'duplicate';

type SyncListener = (event: SyncEvent, data?: any) => void;

class SyncEngine {
  private processing = false;
  private listeners: Set<SyncListener> = new Set();
  private totalItems = 0;
  private processedItems = 0;

  onEvent(listener: SyncListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent, data?: any) {
    this.listeners.forEach(fn => fn(event, data));
  }

  isProcessing() {
    return this.processing;
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      console.log(`[Sync] processQueue iniciado — online: ${navigator.onLine}`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[Sync] no hay sesión activa — intentando refrescar...');
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed?.session) {
          console.error('[Sync] no se pudo refrescar la sesión:', refreshErr);
          return;
        }
        console.log('[Sync] sesión refrescada exitosamente');
      }

      const items = await getPendingSyncItems();
      if (items.length === 0) {
        this.emit('idle');
        return;
      }

      this.totalItems = items.length;
      this.processedItems = 0;
      this.emit('start', { total: this.totalItems });

      for (const item of items) {
        const success = await this.processItem(item);
        if (success) {
          await removeSyncItem(item.id!);
          this.processedItems++;
          this.emit('progress', {
            processed: this.processedItems,
            total: this.totalItems,
            current: item.operation,
          });
        } else {
          await updateSyncItemStatus(item.id!, 'failed', 'Error al sincronizar');
          this.processedItems++;
          this.emit('error', {
            processed: this.processedItems,
            total: this.totalItems,
            current: item.operation,
            error: 'Error al sincronizar',
          });
        }
      }

      const syncedCount = this.processedItems;
      const remaining = await getPendingSyncItems();
      const store = useDatabaseStore.getState();
      if (remaining.length === 0) {
        try {
          await store.fetchAll();
        } catch { }
        store.refreshSyncQueueCount();
        if (syncedCount > 0) {
          this.emit('synced', { count: syncedCount, total: this.totalItems });
        }
      } else {
        store.refreshSyncQueueCount();
        setTimeout(() => this.processQueue(), 0);
      }
    } finally {
      this.emit('complete');
      this.processing = false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<boolean> {
    const store = useDatabaseStore.getState();
    const user = (await import('../store/authStore')).useAuthStore.getState().user;
    if (!user) return false;

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await updateSyncItemStatus(item.id!, 'syncing');

        switch (item.operation) {
          case 'addMovement': {
            const { error } = await supabase.from('movements').insert(item.payload);
            if (error) throw error;

            if (item.payload.type === 'SALIDA') {
              const { error: te } = await supabase.from('transit_items').insert({
                user_id: item.payload.user_id,
                product_id: item.payload.product_id,
                quantity: Number(item.payload.quantity),
                consumed: 0,
                remaining: Number(item.payload.quantity),
                reason: item.payload.reason || 'Enviado a cocina/preparacion',
                sent_date: item.payload.date || new Date().toISOString(),
                warehouse_id: item.payload.warehouse_id || null,
              });
              if (te) throw te;
            }

            if (item.payload.warehouse_id) {
              const { data: existingPW } = await supabase
                .from('product_warehouse')
                .select('id, quantity')
                .eq('product_id', item.payload.product_id)
                .eq('warehouse_id', item.payload.warehouse_id)
                .maybeSingle();

              const qty = Number(item.payload.quantity);
              if (existingPW) {
                let newQty = Number(existingPW.quantity);
                if (item.payload.type === 'ENTRADA') newQty += qty;
                else if (['MERMA', 'TRANSFER'].includes(item.payload.type)) newQty = Math.max(0, newQty - qty);
                else if (item.payload.type === 'AJUSTE') newQty = Math.max(0, newQty + qty);
                await supabase.from('product_warehouse').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', existingPW.id);
              } else if (item.payload.type === 'ENTRADA') {
                await supabase.from('product_warehouse').insert({ product_id: item.payload.product_id, warehouse_id: item.payload.warehouse_id, quantity: qty, in_transit: 0 });
              }
            } else {
              const { data: product } = await supabase.from('products')
                .select('quantity, in_transit')
                .eq('id', item.payload.product_id)
                .single();
              if (product) {
                const qty = Number(item.payload.quantity);
                let newQuantity = Number(product.quantity);
                let newInTransit = Number(product.in_transit || 0);
                if (item.payload.type === 'ENTRADA') newQuantity += qty;
                else if (item.payload.type === 'SALIDA') newInTransit += qty;
                else if (item.payload.type === 'MERMA') newQuantity = Math.max(0, newQuantity - qty);
                else if (item.payload.type === 'AJUSTE') newQuantity = Math.max(0, newQuantity + qty);
                else if (item.payload.type === 'TRANSFER') newQuantity = Math.max(0, newQuantity - qty);

                const updates: any = { quantity: Math.max(0, newQuantity), updated_at: new Date().toISOString() };
                if (item.payload.type === 'SALIDA') updates.in_transit = newInTransit;
                const { error: pe } = await supabase.from('products').update(updates).eq('id', item.payload.product_id);
                if (pe) throw pe;
              }
            }
            await store.logAction('movements', item.payload.type, { product_id: item.payload.product_id, quantity: item.payload.quantity }).catch(() => {});
            break;
          }
          case 'updateProduct': {
            const { id, updates } = item.payload;
            const { error } = await supabase.from('products').update(updates).eq('id', id);
            if (error) throw error;
            await store.logAction('inventory', 'MODIFICAR', { id, ...updates }).catch(() => {});
            break;
          }
          case 'addProduct': {
            const { error } = await supabase.from('products').insert(item.payload.product);
            if (error) throw error;
            if (item.payload.movement) {
              const { error: mvErr } = await supabase.from('movements').insert(item.payload.movement);
              if (mvErr) throw mvErr;
            }
            if (item.payload.productWarehouse?.length) {
              for (const pw of item.payload.productWarehouse) {
                const { error: pwErr } = await supabase.from('product_warehouse').upsert(
                  { product_id: pw.product_id, warehouse_id: pw.warehouse_id, quantity: pw.quantity, in_transit: 0 },
                  { onConflict: 'product_id,warehouse_id' }
                );
                if (pwErr) throw pwErr;
              }
            }
            await store.logAction('inventory', 'CREAR', { name: item.payload.product.name }).catch(() => {});
            break;
          }
          case 'addRecipe': {
            const { recipe, ingredients } = item.payload;
            const { data: newRecipe, error: re } = await supabase.from('recipes').insert(recipe).select().single();
            if (re) throw re;
            if (ingredients?.length) {
              const ingredientsWithRealId = ingredients.map((ing: any) => ({
                ...ing,
                recipe_id: newRecipe.id,
              }));
              const { error: ie } = await supabase.from('recipe_ingredients').insert(ingredientsWithRealId);
              if (ie) throw ie;
            }
            await store.logAction('recipes', 'CREAR', { name: item.payload.recipe.name }).catch(() => {});
            break;
          }
          case 'addSale': {
            const { sale: saleData, sale_items: saleItems } = item.payload;
            const { id: _tempId, ...saleInsert } = saleData;
            const { data: newSale, error: se } = await supabase.from('sales').insert(saleInsert).select().single();
            if (se) throw se;
            if (saleItems?.length) {
              const itemsWithRealId = saleItems.map((si: any) => ({ ...si, sale_id: newSale.id }));
              const { error: sie } = await supabase.from('sale_items').insert(itemsWithRealId);
              if (sie) throw sie;
            }
            const consumptionItems = item.payload.itemsToConsume || [];
            for (const ci of consumptionItems) {
              const { data: transitRows } = await supabase
                .from('transit_items')
                .select('id, remaining, consumed')
                .eq('product_id', ci.productId)
                .gt('remaining', 0)
                .order('sent_date', { ascending: true });
              if (!transitRows) continue;
              let remainingQty = ci.qtyNeeded;
              for (const row of transitRows) {
                if (remainingQty <= 0) break;
                const toConsume = Math.min(row.remaining, remainingQty);
                const nr = row.remaining - toConsume;
                const nc = (row.consumed || 0) + toConsume;
                remainingQty -= toConsume;
                const { error: te } = await supabase.from('transit_items').update({ remaining: nr, consumed: nc }).eq('id', row.id);
                if (te) throw te;
              }
              const { data: prod } = await supabase.from('products').select('quantity').eq('id', ci.productId).single();
              if (prod) {
                await supabase.from('products').update({ quantity: Math.max(0, Number(prod.quantity) - ci.qtyNeeded) }).eq('id', ci.productId);
              }
              await supabase.from('movements').insert({
                user_id: saleInsert.user_id, product_id: ci.productId, type: 'SALIDA', quantity: ci.qtyNeeded, date: new Date().toISOString(),
                reason: `Venta #${newSale.id.slice(0, 8)}`, status: 'NORMAL',
              }).maybeSingle();
            }
            await store.logAction('sales', 'CREAR', { sale_id: (item.payload.sale && item.payload.sale.id) || (newSale && newSale.id) }).catch(() => {});
            break;
          }
          case 'cancelTransit': {
            const { transitItemId, quantity, reason, userId, productId } = item.payload;
            const { data: ti } = await supabase.from('transit_items').select('remaining').eq('id', transitItemId).single();
            const newRemaining = ti ? Math.max(0, ti.remaining - quantity) : 0;
            const { error: ue } = await supabase.from('transit_items').update({ remaining: newRemaining }).eq('id', transitItemId);
            if (ue) throw ue;
            const { data: prod } = await supabase.from('products').select('in_transit').eq('id', productId).single();
            const newInTransit = prod ? Math.max(0, Number(prod.in_transit || 0) - quantity) : 0;
            const { error: pe } = await supabase.from('products').update({ in_transit: newInTransit }).eq('id', productId);
            if (pe) throw pe;
            await supabase.from('movements').insert({
              user_id: userId, product_id: productId, type: 'ENTRADA', quantity, date: new Date().toISOString(), reason: `Devolución de tránsito: ${reason}`, status: 'NORMAL',
            }).maybeSingle();
            await store.logAction('transit', 'CANCELAR_TRANSITO', { transitItemId: item.payload.transitItemId, productId: item.payload.productId, quantity: item.payload.quantity }).catch(() => {});
            break;
          }
          case 'registerWasteFromTransit': {
            const { transitItemId, quantity, reason, userId, productId } = item.payload;
            const { data: ti } = await supabase.from('transit_items').select('remaining').eq('id', transitItemId).single();
            const newRemaining = ti ? Math.max(0, ti.remaining - quantity) : 0;
            const { error: ue } = await supabase.from('transit_items').update({ remaining: newRemaining }).eq('id', transitItemId);
            if (ue) throw ue;
            const { data: prod } = await supabase.from('products').select('in_transit, quantity').eq('id', productId).single();
            const newInTransit = prod ? Math.max(0, Number(prod.in_transit || 0) - quantity) : 0;
            const newQuantity = prod ? Math.max(0, Number(prod.quantity || 0) - quantity) : 0;
            const { error: pe } = await supabase.from('products').update({ in_transit: newInTransit, quantity: newQuantity }).eq('id', productId);
            if (pe) throw pe;
            await supabase.from('movements').insert({
              user_id: userId, product_id: productId, type: 'MERMA', quantity, date: new Date().toISOString(), reason: `Merma en tránsito: ${reason}`, status: 'NORMAL',
            }).maybeSingle();
            await store.logAction('transit', 'MERMA_TRANSITO', { transitItemId: item.payload.transitItemId, productId: item.payload.productId, quantity: item.payload.quantity }).catch(() => {});
            break;
          }
          case 'registerManualConsumption': {
            const { transitItemId, quantity, note, userId, productId } = item.payload;
            const { data: ti } = await supabase.from('transit_items').select('remaining, consumed').eq('id', transitItemId).single();
            const newRemaining = ti ? Math.max(0, ti.remaining - quantity) : 0;
            const newConsumed = ti ? (ti.consumed || 0) + quantity : quantity;
            const { error: ue } = await supabase.from('transit_items').update({ remaining: newRemaining, consumed: newConsumed }).eq('id', transitItemId);
            if (ue) throw ue;
            const { data: prod } = await supabase.from('products').select('in_transit, quantity').eq('id', productId).single();
            const newInTransit = prod ? Math.max(0, Number(prod.in_transit || 0) - quantity) : 0;
            const newQty = prod ? Math.max(0, Number(prod.quantity || 0) - quantity) : 0;
            const { error: pe } = await supabase.from('products').update({ in_transit: newInTransit, quantity: newQty }).eq('id', productId);
            if (pe) throw pe;
            const isGastoVariable = false;
            await supabase.from('movements').insert({
              user_id: userId, product_id: productId, type: 'SALIDA', quantity, date: new Date().toISOString(), reason: note ? `Consumo manual desde tránsito: ${note}` : 'Consumo manual desde tránsito', is_consumo_directo: !isGastoVariable, status: 'NORMAL',
            }).maybeSingle();
            await store.logAction('transit', 'CONSUMO_MANUAL', { transitItemId: item.payload.transitItemId, productId: item.payload.productId, quantity: item.payload.quantity }).catch(() => {});
            break;
          }
          case 'createPendingAccount': {
            const { error } = await supabase.from('pending_accounts').insert(item.payload);
            if (error) throw error;
            await store.logAction('accounts', 'CREAR', { customer: item.payload.customer_name || item.payload.client_name || '' }).catch(() => {});
            break;
          }
          case 'createDailyClosing': {
            const { error } = await supabase.from('daily_closings').insert(item.payload);
            if (error) throw error;
            await store.logAction('closing', 'CREAR', { date: item.payload.closing_date || item.payload.date }).catch(() => {});
            break;
          }
          case 'deleteProduct': {
            const { error } = await supabase.from('products')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('id', item.payload.id);
            if (error) throw error;
            await store.logAction('inventory', 'ELIMINAR', { id: item.payload.id }).catch(() => {});
            break;
          }
          case 'updateRecipe': {
            const { id, updates } = item.payload;
            const { error: re } = await supabase.from('recipes')
              .update({ name: updates.name, selling_price: updates.selling_price })
              .eq('id', id);
            if (re) throw re;
            if (updates.ingredients !== undefined) {
              await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
              if (updates.ingredients.length > 0) {
                const ingredients = updates.ingredients.map((ing: any) => ({
                  recipe_id: id, product_id: ing.product_id, quantity: ing.quantity, unit: ing.unit,
                }));
                const { error: ie } = await supabase.from('recipe_ingredients').insert(ingredients);
                if (ie) throw ie;
              }
            }
            await store.logAction('recipes', 'ACTUALIZAR', { id, name: item.payload.updates.name }).catch(() => {});
            break;
          }
          case 'deleteRecipe': {
            await supabase.from('recipe_ingredients').delete().eq('recipe_id', item.payload.id);
            const { error } = await supabase.from('recipes').delete().eq('id', item.payload.id);
            if (error) throw error;
            await store.logAction('recipes', 'ELIMINAR', { id: item.payload.id }).catch(() => {});
            break;
          }
          case 'deletePendingAccount': {
            for (const tr of (item.payload.transitRestores || [])) {
              const { data: ti } = await supabase.from('transit_items').select('remaining').eq('id', tr.transitItemId).single();
              const newRemaining = ti ? ti.remaining + tr.quantity : tr.quantity;
              await supabase.from('transit_items').update({ remaining: newRemaining }).eq('id', tr.transitItemId);
            }
            const { error } = await supabase.from('pending_accounts')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', item.payload.accountId);
            if (error) throw error;
            await store.logAction('accounts', 'ELIMINAR', { accountId: item.payload.accountId }).catch(() => {});
            break;
          }
          case 'markPendingAccountPaid': {
            const { error } = await supabase.from('pending_accounts')
              .update({ status: 'paid', updated_at: new Date().toISOString() })
              .eq('id', item.payload.accountId);
            if (error) throw error;
            await store.logAction('accounts', 'MARCAR_PAGADO', { accountId: item.payload.accountId }).catch(() => {});
            break;
          }
          case 'addItemsToPendingAccount': {
            const { accountId, items, isAccountHouse, saleType } = item.payload;
            const { data: account } = await supabase.from('pending_accounts').select('items').eq('id', accountId).single();
            const existingItems = (account?.items as any[]) || [];
            const newItems = items.map((i: any) => ({ ...i, added_at: new Date().toISOString() }));
            const allItems = [...existingItems, ...newItems];
            const newTotal = isAccountHouse ? 0 : allItems.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
            const { error } = await supabase.from('pending_accounts')
              .update({ items: allItems, total_amount: newTotal, is_account_house: isAccountHouse, sale_type: saleType, updated_at: new Date().toISOString() })
              .eq('id', accountId);
            if (error) throw error;
            await store.logAction('accounts', 'AGREGAR_ITEMS', { accountId, count: items.length }).catch(() => {});
            break;
          }
          case 'updatePendingAccountItems': {
            const { accountId, items } = item.payload;
            const newTotal = items.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
            const { error } = await supabase.from('pending_accounts')
              .update({ items, total_amount: newTotal, updated_at: new Date().toISOString() })
              .eq('id', accountId);
            if (error) throw error;
            await store.logAction('accounts', 'ACTUALIZAR_ITEMS', { accountId, count: items.length }).catch(() => {});
            break;
          }
          case 'togglePendingAccountType': {
            const { accountId, is_account_house } = item.payload;
            const { data: account } = await supabase.from('pending_accounts').select('items').eq('id', accountId).single();
            const accountItems = (account?.items as any[]) || [];
            const newTotal = is_account_house ? 0 : accountItems.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
            const { error } = await supabase.from('pending_accounts')
              .update({ is_account_house, total_amount: newTotal, updated_at: new Date().toISOString() })
              .eq('id', accountId);
            if (error) throw error;
            await store.logAction('accounts', 'TOGGLE_TIPO', { accountId, is_account_house }).catch(() => {});
            break;
          }
          case 'addWarehouse': {
            const { id, name, is_main, userId, created_at } = item.payload;
            if (is_main) {
              await supabase.from('warehouses').update({ is_main: false }).eq('user_id', userId).neq('is_main', true);
            }
            const { data: warehouse, error: we } = await supabase.from('warehouses')
              .insert({ id, user_id: userId, name, is_main, created_at }).select().single();
            if (we) throw we;
            const { data: products } = await supabase.from('products').select('id, quantity').eq('user_id', userId).eq('is_active', true);
            if (products) {
              for (const p of products) {
                await supabase.from('product_warehouse').insert({
                  product_id: p.id, warehouse_id: warehouse.id, quantity: is_main ? Number(p.quantity) : 0, in_transit: 0,
                });
              }
            }
            await store.logAction('warehouse', 'CREAR', { name: item.payload.name }).catch(() => {});
            break;
          }
          case 'updateWarehouse': {
            const { error } = await supabase.from('warehouses').update({ name: item.payload.name }).eq('id', item.payload.id);
            if (error) throw error;
            await store.logAction('warehouse', 'ACTUALIZAR', { id: item.payload.id, name: item.payload.name }).catch(() => {});
            break;
          }
          case 'deleteWarehouse': {
            await supabase.from('movements').update({ warehouse_id: null }).eq('warehouse_id', item.payload.id);
            for (const stock of (item.payload.stockToMigrate || [])) {
              const { data: existingPw } = await supabase.from('product_warehouse')
                .select('id, quantity')
                .eq('product_id', stock.product_id)
                .eq('warehouse_id', stock.mainWarehouseId)
                .maybeSingle();
              if (existingPw) {
                await supabase.from('product_warehouse')
                  .update({ quantity: Number(existingPw.quantity) + stock.quantity })
                  .eq('id', existingPw.id);
              } else {
                await supabase.from('product_warehouse')
                  .insert({ product_id: stock.product_id, warehouse_id: stock.mainWarehouseId, quantity: stock.quantity, in_transit: 0 });
              }
            }
            await supabase.from('product_warehouse').delete().eq('warehouse_id', item.payload.id);
            const { error } = await supabase.from('warehouses').delete().eq('id', item.payload.id);
            if (error) throw error;
            await store.logAction('warehouse', 'ELIMINAR', { id: item.payload.id, name: item.payload.name }).catch(() => {});
            break;
          }
          default:
            console.warn(`Sync: operacion desconocida ${item.operation}`);
            return false;
        }
        return true;
      } catch (err: any) {
        if (err?.code === '42501') {
          console.error(`Sync: error no retryable (${err.code}) en ${item.operation}`, err);
          return false;
        }
        if (err?.code === '23505') {
          console.warn(`Sync: duplicado ignorado (${err.code}) en ${item.operation}`, err);
          await removeSyncItem(item.id!);
          this.emit('duplicate', { operation: item.operation, payload: item.payload });
          return true;
        }
        const isOffline = !navigator.onLine
          || err?.message?.includes('Failed to fetch')
          || err?.message?.includes('NetworkError')
          || err?.message?.includes('timeout');

        if (isOffline && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (attempt >= maxRetries) {
          console.error(`Sync falló (${item.id}):`, err);
          return false;
        }
      }
    }
    return false;
  }

  async enqueueAndProcess(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'status' | 'retries'>) {
    await addToSyncQueue(item);
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processPending() {
    const count = await getSyncQueueCount();
    if (count > 0 && navigator.onLine) {
      this.processQueue();
    }
  }

  async compensateFailedSync() {
    const failedItems = await getFailedSyncItems();
    const dbStore = useDatabaseStore.getState();
    const results: { id: number; operation: string; recovered: boolean; error?: string }[] = [];

    for (const item of failedItems) {
      try {
        if (item.operation === 'addSale') {
          const { sale } = item.payload;
          if (sale?.id) {
            const { data: existing } = await supabase.from('sales').select('id').eq('id', sale.id).maybeSingle();
            if (!existing) {
              const success = await this.processItem(item);
              results.push({ id: item.id!, operation: item.operation, recovered: success });
            } else {
              await removeSyncItem(item.id!);
              results.push({ id: item.id!, operation: item.operation, recovered: true });
            }
          }
        } else {
          const success = await this.processItem(item);
          results.push({ id: item.id!, operation: item.operation, recovered: success });
        }
      } catch (err: any) {
        results.push({ id: item.id!, operation: item.operation, recovered: false, error: err.message });
      }
    }

    const recovered = results.filter(r => r.recovered).length;
    const failed = results.filter(r => !r.recovered).length;
    await dbStore.logAction('sync', 'COMPENSAR', { total: results.length, recovered, failed }).catch(() => {});
    return { total: results.length, recovered, failed, details: results };
  }
}

export const syncEngine = new SyncEngine();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncEngine.processQueue();
  });
  setInterval(() => syncEngine.processQueue(), 30000);
}
