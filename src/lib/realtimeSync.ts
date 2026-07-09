import { supabase } from './supabase';
import { useDatabaseStore } from '../store/dbStore';
import { db } from './dexieDb';
import { logger } from './logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;
let _subscribedUserId: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleProductChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.products.find((p) => p.id === newRecord.id)) {
      useDatabaseStore.setState({ products: [newRecord, ...store.products] as any });
      db.products.put(newRecord).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    useDatabaseStore.setState({
      products: store.products.map((p) => (p.id === newRecord.id ? { ...p, ...newRecord } : p)) as any,
    });
    db.products.put(newRecord).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    useDatabaseStore.setState({ products: store.products.filter((p) => p.id !== oldRecord.id) as any });
    db.products.delete(oldRecord.id).catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleMovementChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.movements.find((m) => m.id === newRecord.id)) {
      useDatabaseStore.setState({ movements: [newRecord, ...store.movements] as any });
      db.movements.put(newRecord).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    useDatabaseStore.setState({
      movements: store.movements.map((m) => (m.id === newRecord.id ? { ...m, ...newRecord } : m)) as any,
    });
    db.movements.put(newRecord).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    useDatabaseStore.setState({ movements: store.movements.filter((m) => m.id !== oldRecord.id) as any });
    db.movements.delete(oldRecord.id).catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleSaleChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.sales.find((s) => s.id === newRecord.id)) {
      const saleWithItems = { ...newRecord, items: newRecord.sale_items || [] };
      useDatabaseStore.setState({ sales: [saleWithItems, ...store.sales] as any });
      db.sales.put(saleWithItems as any).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    const existingSale = store.sales.find((s) => s.id === newRecord.id) as any;
    const items = existingSale?.items || [];
    const saleWithItems = { ...newRecord, items };
    useDatabaseStore.setState({
      sales: store.sales.map((s) => (s.id === newRecord.id ? saleWithItems : s)) as any,
    });
    db.sales.put(saleWithItems as any).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    useDatabaseStore.setState({ sales: store.sales.filter((s) => s.id !== oldRecord.id) as any });
    db.sales.delete(oldRecord.id).catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleTransitItemChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  let newTransitItems = [...store.transitItems];

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.transitItems.find((t) => t.id === newRecord.id)) {
      newTransitItems = [newRecord, ...store.transitItems] as any;
      db.transitItems.put(newRecord).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    newTransitItems = store.transitItems.map((t) => (t.id === newRecord.id ? newRecord : t)) as any;
    db.transitItems.put(newRecord).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    newTransitItems = store.transitItems.filter((t) => t.id !== oldRecord.id);
    db.transitItems.delete(oldRecord.id).catch(() => {});
  }

  const affectedProductId = (newRecord || oldRecord)?.product_id;
  if (!affectedProductId) return;

  const productTransitTotal = newTransitItems
    .filter((t) => t.product_id === affectedProductId && t.remaining > 0)
    .reduce((sum, t) => sum + Number(t.remaining), 0);

  const newProducts = store.products.map((p) =>
    p.id === affectedProductId ? { ...p, in_transit: productTransitTotal } : p,
  );

  const pwRecord = (newRecord || oldRecord);
  const newProductWarehouse = store.productWarehouse.map((pw) => {
    if (pw.product_id === affectedProductId && pw.warehouse_id === pwRecord.warehouse_id) {
      const whTransit = newTransitItems
        .filter((t) => t.product_id === affectedProductId && t.warehouse_id === pwRecord.warehouse_id)
        .reduce((sum, t) => sum + Number(t.remaining), 0);
      return { ...pw, in_transit: whTransit };
    }
    return pw;
  });

  useDatabaseStore.setState({
    transitItems: newTransitItems as any,
    products: newProducts as any,
    productWarehouse: newProductWarehouse as any,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handlePendingAccountChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.pendingAccounts.find((a) => a.id === newRecord.id)) {
      useDatabaseStore.setState({ pendingAccounts: [newRecord, ...store.pendingAccounts] as any });
      db.pendingAccounts.put(newRecord).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    useDatabaseStore.setState({
      pendingAccounts: store.pendingAccounts
        .map((a) => (a.id === newRecord.id ? { ...a, ...newRecord } : a))
        .filter((a) => a.status === 'pending' || a.id === newRecord.id) as any,
    });
    db.pendingAccounts.put(newRecord).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    useDatabaseStore.setState({
      pendingAccounts: store.pendingAccounts.filter((a) => a.id !== oldRecord.id) as any,
    });
    db.pendingAccounts.delete(oldRecord.id).catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleRecipeChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.recipes.find((r) => r.id === newRecord.id)) {
      const recipeWithIngredients = {
        ...newRecord,
        ingredients: newRecord.recipe_ingredients || [],
      };
      useDatabaseStore.setState({ recipes: [recipeWithIngredients, ...store.recipes] as any });
      db.recipes.put(recipeWithIngredients as any).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    const existingRecipe = store.recipes.find((r) => r.id === newRecord.id) as any;
    const ingredients = existingRecipe?.ingredients || [];
    const recipeWithIngredients = { ...newRecord, ingredients };
    useDatabaseStore.setState({
      recipes: store.recipes.map((r) => (r.id === newRecord.id ? recipeWithIngredients : r)) as any,
    });
    db.recipes.put(recipeWithIngredients as any).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    useDatabaseStore.setState({ recipes: store.recipes.filter((r) => r.id !== oldRecord.id) as any });
    db.recipes.delete(oldRecord.id).catch(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleSaleItemChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;
  const saleId = (newRecord || oldRecord)?.sale_id;
  if (!saleId) return;

  const existingSale = store.sales.find((s) => s.id === saleId) as any;
  if (!existingSale) return;

  let updatedItems = [...(existingSale.items || [])];

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!updatedItems.find((i: any) => i.id === newRecord.id)) {
      updatedItems.push(newRecord);
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    updatedItems = updatedItems.map((i: any) => (i.id === newRecord.id ? newRecord : i));
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    updatedItems = updatedItems.filter((i: any) => i.id !== oldRecord.id);
  }

  useDatabaseStore.setState({
    sales: store.sales.map((s) => (s.id === saleId ? { ...s, items: updatedItems } : s)) as any,
  });
  db.sales.put({ ...existingSale, items: updatedItems } as any).catch(() => {});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleRecipeIngredientChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;
  const recipeId = (newRecord || oldRecord)?.recipe_id;
  if (!recipeId) return;

  const existingRecipe = store.recipes.find((r) => r.id === recipeId) as any;
  if (!existingRecipe) return;

  let updatedIngredients = [...(existingRecipe.ingredients || [])];

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!updatedIngredients.find((i: any) => i.id === newRecord.id)) {
      updatedIngredients.push(newRecord);
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    updatedIngredients = updatedIngredients.map((i: any) => (i.id === newRecord.id ? newRecord : i));
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    updatedIngredients = updatedIngredients.filter((i: any) => i.id !== oldRecord.id);
  }

  useDatabaseStore.setState({
    recipes: store.recipes.map((r) =>
      r.id === recipeId ? { ...r, ingredients: updatedIngredients } : r,
    ) as any,
  });
  db.recipes.put({ ...existingRecipe, ingredients: updatedIngredients } as any).catch(() => {});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleProductWarehouseChange(payload: any) {
  const store = useDatabaseStore.getState();
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord?.id) {
    if (!store.productWarehouse.find((pw) => pw.id === newRecord.id)) {
      useDatabaseStore.setState({ productWarehouse: [...store.productWarehouse, newRecord] as any });
      db.productWarehouse.put(newRecord).catch(() => {});
    }
  } else if (eventType === 'UPDATE' && newRecord?.id) {
    useDatabaseStore.setState({
      productWarehouse: store.productWarehouse.map((pw) =>
        pw.id === newRecord.id ? { ...pw, ...newRecord } : pw,
      ) as any,
    });
    db.productWarehouse.put(newRecord).catch(() => {});
  } else if (eventType === 'DELETE' && oldRecord?.id) {
    useDatabaseStore.setState({
      productWarehouse: store.productWarehouse.filter((pw) => pw.id !== oldRecord.id) as any,
    });
    db.productWarehouse.delete(oldRecord.id).catch(() => {});
  }
}

export function startRealtimeSync() {
  const userId = _subscribedUserId;
  if (!userId) {
    logger.warn('startRealtimeSync: no userId');
    return;
  }

  if (channel) {
    logger.info('Realtime channel already active');
    return;
  }

  logger.info('Iniciando Realtime para user:', userId);

  channel = supabase
    .channel(`db-changes-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` },
      handleProductChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'movements', filter: `user_id=eq.${userId}` },
      handleMovementChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${userId}` },
      handleSaleChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transit_items', filter: `user_id=eq.${userId}` },
      handleTransitItemChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pending_accounts', filter: `user_id=eq.${userId}` },
      handlePendingAccountChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recipes', filter: `user_id=eq.${userId}` },
      handleRecipeChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sale_items' },
      handleSaleItemChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recipe_ingredients' },
      handleRecipeIngredientChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_warehouse' },
      handleProductWarehouseChange,
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Realtime suscrito correctamente');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Error en canal Realtime:', err);
        channel = null;
      } else if (status === 'CLOSED') {
        logger.info('Canal Realtime cerrado');
      }
    });
}

export function stopRealtimeSync() {
  if (channel) {
    logger.info('Cerrando canal Realtime...');
    supabase.removeChannel(channel).catch(() => {});
    channel = null;
  }
}

export function setRealtimeUserId(userId: string | null) {
  if (_subscribedUserId === userId) return;

  stopRealtimeSync();
  _subscribedUserId = userId;

  if (userId && navigator.onLine) {
    startRealtimeSync();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (_subscribedUserId && !channel) {
      logger.info('Reconectando Realtime tras recuperar internet...');
      startRealtimeSync();
      return;
    }
    if (!_subscribedUserId && !channel) {
      try {
        const savedUser = localStorage.getItem('inventarioy_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          if (user.id) {
            _subscribedUserId = user.id;
            startRealtimeSync();
          }
        }
      } catch {}
    }
  });
}
