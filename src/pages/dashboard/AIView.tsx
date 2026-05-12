import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Sparkles, Send, Bot, User as UserIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import Markdown from 'react-markdown';
import { sendToGroq, Message, getAvailableKeysCount, rotateKey } from '../../lib/groq';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

function parseSaleItems(items: any): any[] {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch {
      return [];
    }
  }
  return [];
}

export default function AIView() {
  const { user } = useAuthStore();
  const { products, sales, movements, employees, recipes } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  const businessData = useMemo(() => {
    const totalInventoryValue = activeProducts.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.cost)), 0);
    const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const lowStockProducts = activeProducts.filter(p => Number(p.quantity) <= Number(p.rop));
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringProducts = activeProducts.filter(p => {
      if (!p.expiration_date) return false;
      return new Date(p.expiration_date) <= thirtyDaysFromNow;
    });

    const categoryBreakdown = activeProducts.reduce((acc, p) => {
      const cat = p.category || 'Sin categoría';
      if (!acc[cat]) acc[cat] = { count: 0, value: 0 };
      acc[cat].count++;
      acc[cat].value += Number(p.quantity) * Number(p.cost);
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const lowStock = activeProducts.filter(p => Number(p.quantity) <= Number(p.rop));

    const inputs = movements.filter(m => m.type === 'ENTRADA').length;
    const outputs = movements.filter(m => m.type === 'SALIDA').length;
    const waste = movements.filter(m => m.type === 'MERMA').length;

    const salesSorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentSales = salesSorted.slice(0, 10).map(s => ({
      date: new Date(s.date).toLocaleDateString('es-ES'),
      amount: Number(s.total_amount).toFixed(2),
      type: s.sale_type,
    }));

    const productsList = activeProducts.map(p => ({
      name: p.name,
      category: p.category,
      stock: p.quantity,
      unit: p.unit,
      cost: Number(p.cost).toFixed(2),
      price: Number(p.price).toFixed(2),
      expiration: p.expiration_date ? new Date(p.expiration_date).toLocaleDateString('es-ES') : 'Sin fecha',
    }));

    const productsByValue = [...activeProducts].sort((a, b) => (Number(b.quantity) * Number(b.cost)) - (Number(a.quantity) * Number(a.cost))).slice(0, 20);

    const recipesList = recipes.map(r => {
      const cost = r.ingredients.reduce((sum, ing) => {
        const prod = products.find(p => p.id === ing.product_id);
        return sum + ((prod?.cost || 0) * ing.quantity);
      }, 0);
      const margin = r.selling_price > 0 ? (((r.selling_price - cost) / r.selling_price) * 100).toFixed(0) : '0';
      return `${r.name}: venta $${Number(r.selling_price).toFixed(2)}, costo $${cost.toFixed(2)}, margen ${margin}%`;
    });

    const employeesList = employees.map(e => `${e.name} (${e.role || 'Sin rol'})`);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toLocaleDateString('es-ES');

    const weeklySalesData = sales.filter(s => new Date(s.date) >= weekAgo);
    const monthlySalesData = sales.filter(s => new Date(s.date) >= monthStart);

    const weeklyRevenue = weeklySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const monthlyRevenue = monthlySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);

    const totalCOGS = sales.reduce((sum, s) => {
      const items = parseSaleItems(s.items);
      return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);
    const overallMargin = totalSalesRevenue > 0
      ? ((totalSalesRevenue - totalCOGS) / totalSalesRevenue) * 100
      : 0;

    const weeklyCOGS = weeklySalesData.reduce((sum, s) => {
      const items = parseSaleItems(s.items);
      return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);
    const monthlyCOGS = monthlySalesData.reduce((sum, s) => {
      const items = parseSaleItems(s.items);
      return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);

    const weeklyMargin = weeklyRevenue > 0 ? ((weeklyRevenue - weeklyCOGS) / weeklyRevenue) * 100 : 0;
    const monthlyMargin = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyCOGS) / monthlyRevenue) * 100 : 0;

    return {
      totalInventoryValue,
      totalSalesRevenue,
      totalCOGS,
      overallMargin,
      lowStockProducts,
      lowStock,
      expiringProducts,
      categoryBreakdown,
      inputs,
      outputs,
      waste,
      recentSales,
      productsList,
      productsByValue,
      recipesList,
      employeesList,
      weeklySalesData,
      monthlySalesData,
      weeklyRevenue,
      monthlyRevenue,
      weeklyCOGS,
      monthlyCOGS,
      weeklyMargin,
      monthlyMargin,
      todayStr,
    };
  }, [activeProducts, sales, movements, employees, recipes, products]);

  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableKeys, setAvailableKeys] = useState(0);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [conversationStartDate, setConversationStartDate] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const warningShownRef = useRef(false);

  const buildSystemPrompt = (): Message => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('es-ES');

    const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalCOGS = sales.reduce((sum, s) => {
      return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);
    const overallMargin = totalSalesRevenue > 0 ? ((totalSalesRevenue - totalCOGS) / totalSalesRevenue) * 100 : 0;

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weeklySalesData = sales.filter(s => new Date(s.date) >= weekAgo);
    const monthlySalesData = sales.filter(s => new Date(s.date) >= monthStart);

    const weeklyRevenue = weeklySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const monthlyRevenue = monthlySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);

    const weeklyCOGS = weeklySalesData.reduce((sum, s) => {
      return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);
    const monthlyCOGS = monthlySalesData.reduce((sum, s) => {
      return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);

    const weeklyMargin = weeklyRevenue > 0 ? ((weeklyRevenue - weeklyCOGS) / weeklyRevenue) * 100 : 0;
    const monthlyMargin = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyCOGS) / monthlyRevenue) * 100 : 0;

    const lowStock = activeProducts.filter(p => Number(p.quantity) <= Number(p.rop));

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringProducts = activeProducts.filter(p => {
      if (!p.expiration_date) return false;
      return new Date(p.expiration_date) <= thirtyDaysFromNow;
    });

    const categoryBreakdown = activeProducts.reduce((acc, p) => {
      const cat = p.category || 'Sin categoria';
      if (!acc[cat]) acc[cat] = { count: 0, value: 0 };
      acc[cat].count++;
      acc[cat].value += Number(p.quantity) * Number(p.cost);
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const productsByValue = [...activeProducts].sort((a, b) => (Number(b.quantity) * Number(b.cost)) - (Number(a.quantity) * Number(a.cost))).slice(0, 20);

    const salesSorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentSales = salesSorted.slice(0, 10).map(s => ({
      date: new Date(s.date).toLocaleDateString('es-ES'),
      amount: Number(s.total_amount).toFixed(2),
      type: s.sale_type,
    }));

    const inputs = movements.filter(m => m.type === 'ENTRADA').length;
    const outputs = movements.filter(m => m.type === 'SALIDA').length;
    const waste = movements.filter(m => m.type === 'MERMA').length;

    const employeesList = employees.map(e => e.name + ' (' + (e.role || 'Sin rol') + ')');

    const recipesList = recipes.map(r => {
      const cost = r.ingredients.reduce((sum, ing) => {
        const prod = products.find(p => p.id === ing.product_id);
        return sum + ((prod?.cost || 0) * ing.quantity);
      }, 0);
      const margin = r.selling_price > 0 ? (((r.selling_price - cost) / r.selling_price) * 100).toFixed(0) : '0';
      return r.name + ': venta $' + Number(r.selling_price).toFixed(2) + ', costo $' + cost.toFixed(2) + ', margen ' + margin + '%';
    });

    const totalInventoryValue = activeProducts.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.cost)), 0);

    return {
      role: 'system',
      content: 'Eres un asistente de IA de InventarioY. Tu UNICO trabajo es responder preguntas sobre LOS DATOS REALES del negocio del usuario.\n\n' +
        'REGLAS ABSOLUTAS:\n' +
        '1. SOLO usa los datos que estan listados en este prompt. Nunca inventes o suplas informacion que no este aqui.\n' +
        '2. Cuando respondas, SIEMPRE cita datos especificos del negocio (nombres exactos, numeros reales, fechas concretas).\n' +
        '3. Si no tienes la informacion, di exactamente: "No tengo esa informacion disponible. Te recomiendo consultar el modulo correspondiente de InventarioY."\n' +
        '4. Si el usuario pregunta por un producto que NO esta en la lista, responde: "No encuentro ese producto en tu inventario actual."\n' +
        '5. No hagas calculos complejos sin datos suficientes.\n' +
        '6. Si no estas seguro, dilo.\n\n' +
        'DATOS DEL NEGOCIO (' + todayStr + '):\n\n' +
        'GENERALES:\n' +
        '- Producto dueño: ' + (user?.name || 'Usuario') + '\n' +
        '- Nombre del negocio: ' + (user?.businessName || 'Mi Negocio') + '\n' +
        '- Total de productos: ' + activeProducts.length + '\n' +
        '- Valor total del inventario: $' + totalInventoryValue.toFixed(2) + '\n' +
        '- Total de ventas registradas: ' + sales.length + '\n' +
        '- Ingresos totales: $' + totalSalesRevenue.toFixed(2) + '\n' +
        '- Costo total de ventas: $' + totalCOGS.toFixed(2) + '\n' +
        '- Margen de ganancia historico: ' + overallMargin.toFixed(1) + '%\n' +
        '- Movimientos: ' + movements.length + ' (Entradas: ' + inputs + ', Salidas: ' + outputs + ', Merma: ' + waste + ')\n' +
        '- Empleados (' + employees.length + '): ' + (employeesList.length > 0 ? employeesList.join(', ') : 'Ninguno') + '\n' +
        '- Recetas (' + recipes.length + '): ' + (recipesList.length > 0 ? recipesList.join(' | ') : 'Ninguna') + '\n\n' +
        'VENTAS POR PERIODO:\n' +
        '- Esta semana: ' + weeklySalesData.length + ' ventas, ingreso $' + weeklyRevenue.toFixed(2) + ', margen ' + weeklyMargin.toFixed(1) + '%\n' +
        '- Este mes: ' + monthlySalesData.length + ' ventas, ingreso $' + monthlyRevenue.toFixed(2) + ', margen ' + monthlyMargin.toFixed(1) + '%\n\n' +
        'TODOS LOS PRODUCTOS (' + activeProducts.length + '):\n' +
        (activeProducts.length > 0 ? activeProducts.map(p => '- ' + p.name + ' | Categoria: ' + (p.category || 'Sin categoria') + ' | Stock: ' + p.quantity + ' ' + p.unit + ' | Costo: $' + Number(p.cost).toFixed(2) + ' | Precio: $' + Number(p.price).toFixed(2) + ' | Vence: ' + (p.expiration_date ? new Date(p.expiration_date).toLocaleDateString('es-ES') : 'Sin fecha')).join('\n') : '- No hay productos registrados') + '\n\n' +
        'PRODUCTOS CON STOCK BAJO (' + lowStock.length + '):\n' +
        (lowStock.length > 0 ? lowStock.map(p => '- ' + p.name + ': ' + p.quantity + ' ' + p.unit + ' (ROP: ' + p.rop + ')').join('\n') : '- Ninguno') + '\n\n' +
        'PRODUCTOS PROXIMOS A VENCER (30 dias):\n' +
        (expiringProducts.length > 0 ? expiringProducts.map(p => '- ' + p.name + ': vence ' + new Date(p.expiration_date).toLocaleDateString('es-ES')).join('\n') : '- Ninguno') + '\n\n' +
        'TOP 20 PRODUCTOS POR VALOR:\n' +
        (productsByValue.length > 0 ? productsByValue.map((p, i) => (i + 1) + '. ' + p.name + ': $' + (Number(p.quantity) * Number(p.cost)).toFixed(2)).join('\n') : '- Sin productos') + '\n\n' +
        'DESGLOSE POR CATEGORIA:\n' +
        (Object.keys(categoryBreakdown).length > 0 ? Object.entries(categoryBreakdown).map(([cat, data]) => '- ' + cat + ': ' + data.count + ' productos, valor $' + data.value.toFixed(2)).join('\n') : '- Sin categorias registradas') + '\n\n' +
        'ULTIMAS 10 VENTAS:\n' +
        (recentSales.length > 0 ? recentSales.map(s => '- ' + s.date + ': $' + s.amount + ' (' + s.type + ')').join('\n') : '- No hay ventas registradas') + '\n\n' +
        'Responde de manera concisa, profesional y amigable.'
    };
  };

  const buildGreeting = (): { role: 'user'|'assistant', text: string } => {
    const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalCOGS = sales.reduce((sum, s) => {
      const items = typeof s.items === 'string' ? JSON.parse(s.items || '[]') : (s.items || []);
      return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity * item.unit_cost), 0);
    }, 0);
    const overallMargin = totalSalesRevenue > 0 ? ((totalSalesRevenue - totalCOGS) / totalSalesRevenue) * 100 : 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weeklySalesData = sales.filter(s => new Date(s.date) >= weekAgo);
    const monthlySalesData = sales.filter(s => new Date(s.date) >= monthStart);
    const weeklyRevenue = weeklySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const monthlyRevenue = monthlySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);

    const lowStock = activeProducts.filter(p => Number(p.quantity) <= Number(p.rop));

    return {
      role: 'assistant',
      text: 'Hola ' + (user?.name || 'Usuario') + '! Soy tu asistente de IA de InventarioY y tengo los datos de tu negocio: ' + (user?.businessName || 'Mi Negocio') + '.\n\n' +
        'DATOS ACTUALES:\n' +
        '- Productos: ' + activeProducts.length + '\n' +
        '- Valor inventario: $' + activeProducts.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.cost)), 0).toFixed(2) + '\n' +
        '- Ventas: ' + sales.length + ' (ingresos: $' + totalSalesRevenue.toFixed(2) + ', margen: ' + overallMargin.toFixed(1) + '%)\n' +
        '- Esta semana: ' + weeklySalesData.length + ' ventas ($' + weeklyRevenue.toFixed(2) + ')\n' +
        '- Este mes: ' + monthlySalesData.length + ' ventas ($' + monthlyRevenue.toFixed(2) + ')\n' +
        '- Empleados: ' + employees.length + ' | Recetas: ' + recipes.length + '\n' +
        (lowStock.length > 0 ? '- ALERTA stock bajo: ' + lowStock.map(p => p.name).join(', ') : '- Sin alertas de stock') + '\n\n' +
        'Puedes preguntarme sobre tus productos, ventas, empleados, recetas o cualquier dato de tu negocio. Si no tengo la info, te lo dire.'
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadConversation = async () => {
    if (!user) return;

    // Verificar conexión antes de llamar a Supabase
    if (!navigator.onLine) {
      console.log('[AIView] Offline detected, initializing without loaded conversation');
      initializeNewConversation();
      return;
    }

    try {
      const { data: persistedMessages } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (persistedMessages && persistedMessages.length > 0) {
        const loadedMessages = persistedMessages.map((m: PersistedMessage) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          text: m.content,
          created_at: m.created_at,
        }));

        setMessages(loadedMessages);
        setIsInitialized(true);
        setConversationStartDate(new Date(persistedMessages[0].created_at));

        const oldestDate = new Date(persistedMessages[0].created_at);
        const daysSinceCreation = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceCreation >= 90 && !warningShownRef.current) {
          setShowDeleteWarning(true);
          warningShownRef.current = true;
        }
      } else {
        initializeNewConversation();
      }
    } catch (err) {
      console.warn('[AIView] Error loading conversation (offline?):', err);
      initializeNewConversation();
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;

    // No intentar guardar si está offline
    if (!navigator.onLine) {
      console.log('[AIView] Offline: skipping saveMessage');
      return;
    }

    try {
      const newMessage = {
        user_id: user.id,
        role,
        content,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert(newMessage)
        .select()
        .single();

      if (!error && data) {
        setConversationStartDate(new Date(data.created_at));
      }
    } catch (err) {
      console.warn('[AIView] Error saving message (offline?):', err);
    }
  };

  const clearConversation = async () => {
    if (!user) return;

    // Intentar borrar en Supabase si está online
    if (navigator.onLine) {
      try {
        await supabase
          .from('ai_conversations')
          .delete()
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('[AIView] Error clearing conversation:', err);
      }
    }

    setMessages([]);
    setIsInitialized(false);
    setShowDeleteWarning(false);
    warningShownRef.current = false;
    setConversationStartDate(null);
    
    initializeNewConversation();
    toast.success('Conversación borrada. Puedes comenzar una nueva.');
  };

  const initializeNewConversation = async () => {
    try {
      const keysCount = getAvailableKeysCount();
      setAvailableKeys(keysCount);
      
      if (keysCount === 0) {
        setMessages([{
          role: 'assistant',
          text: 'No hay claves de API de Groq configuradas en el entorno.'
        }]);
        return;
      }

      const greeting = buildGreeting();
      setMessages([greeting]);
      // saveMessage ya tiene protección offline
      await saveMessage('assistant', greeting.text);
      setIsInitialized(true);
    } catch (err) {
      console.error('[AIView] Error initializing conversation:', err);
      setMessages([{
        role: 'assistant',
        text: 'Error al inicializar. Por favor, recarga la página.'
      }]);
    }
  };

  useEffect(() => {
    if (user) {
      try {
        loadConversation();
      } catch (err) {
        console.error('[AIView] Error in useEffect loadConversation:', err);
        initializeNewConversation();
      }
    }
  }, [user?.id]);

  useEffect(() => {
    const keysCount = getAvailableKeysCount();
    setAvailableKeys(keysCount);
  }, []);

  useEffect(() => {
    if (user && !isInitialized && products.length > 0) {
      initializeNewConversation();
    }
  }, [user?.id, products.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const userMessage = { role: 'user' as const, text: userText };
    setMessages(prev => [...prev, userMessage]);
    await saveMessage('user', userText);
    
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const MAX_CHAT_MESSAGES = 20;
      const recentMessages = messages.slice(-MAX_CHAT_MESSAGES);
      const chatHistory: Message[] = recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
      const fullHistory: Message[] = [systemPrompt, ...chatHistory, { role: 'user', content: userText }];

      const response = await sendToGroq(fullHistory);
      
      const assistantMessage = { role: 'assistant' as const, text: response };
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage('assistant', response);
    } catch (error) {
      console.error("Error sending message:", error);
      
      rotateKey();
      const remainingKeys = getAvailableKeysCount();
      setAvailableKeys(remainingKeys);
      
      let errorMessage = 'Lo siento, ocurrio un error al procesar tu solicitud con la IA.';
      
      if (remainingKeys === 0) {
        errorMessage = 'Todas las claves de API han sido bloqueadas por limite de uso. Por favor, espera o contacta al administrador.';
      } else if (error instanceof Error) {
        errorMessage = 'Lo siento, ocurrio un error: ' + error.message + '. Se cambiara a la siguiente clave disponible.';
      }
      
      const errorMsg = { role: 'assistant' as const, text: errorMessage };
      setMessages(prev => [...prev, errorMsg]);
      await saveMessage('assistant', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysUntilDeletion = () => {
    if (!conversationStartDate) return 0;
    const deletionDate = new Date(conversationStartDate);
    deletionDate.setDate(deletionDate.getDate() + 90);
    const daysLeft = Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.5)]" />
            <span className="text-gradient">Asistente IA</span>
          </h1>
          <p className="text-sm text-text-secondary">
            Consulta datos de tu inventario, pide análisis y consejos de negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showDeleteWarning && (
            <button
              onClick={clearConversation}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs hover:bg-warning/20 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Tu chat se borrará en {getDaysUntilDeletion()} días
            </button>
          )}
          <div className="text-xs text-text-secondary">
            Claves disponibles: <span className="text-primary font-medium">{availableKeys}/10</span>
          </div>
        </div>
      </div>

      {showDeleteWarning && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-warning">Tu conversación se eliminará automáticamente</h3>
              <p className="text-sm text-text-secondary mt-1">
                Tu historial de chat tiene más de 87 días y se borrará automáticamente en <strong>{getDaysUntilDeletion()} días</strong> para liberar espacio. 
                Si deseas conservar esta conversación, haz clic en "Borrar y comenzar nueva" para iniciar una nueva sesión.
              </p>
              <div className="flex gap-3 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={clearConversation}
                  className="border-warning/50 text-warning hover:bg-warning/10"
                >
                  Borrar y comenzar nueva
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowDeleteWarning(false)}
                >
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={`${msg.role}-${idx}-${msg.text.slice(0,20)}`} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
              }`}>
                {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-bg border border-border text-text rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                ) : (
                  <div className="markdown-body text-sm prose prose-invert max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 flex-row">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-bg border border-border text-text rounded-tl-none flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-text-secondary">Analizando datos...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border bg-bg/50">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre tu stock, ventas o pide un consejo..."
              className="flex-1 bg-surface"
              disabled={isLoading || availableKeys === 0}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim() || availableKeys === 0}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-text-secondary">
              Los chats se guardan por 90 días y se borran automáticamente
            </p>
            <button
              onClick={clearConversation}
              className="text-xs text-text-secondary hover:text-danger transition-colors"
            >
              Nueva conversación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
