import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Sparkles, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import Markdown from 'react-markdown';
import { sendToGroq, Message, getAvailableKeysCount, rotateKey } from '../../lib/groq';

export default function AIView() {
  const { user } = useAuthStore();
  const { products, sales, movements, employees } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [availableKeys, setAvailableKeys] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const keysCount = getAvailableKeysCount();
    setAvailableKeys(keysCount);
    
    if (keysCount === 0) {
      setMessages([{
        role: 'assistant',
        text: '⚠️ No hay claves de API de Groq configuradas en el entorno.'
      }]);
      return;
    }

    const systemInstruction: Message = {
      role: 'system',
      content: `Eres un asistente de IA experto en gestión de inventarios y negocios para la aplicación "InventarioY".
El usuario actual es ${user?.name || 'Usuario'} y su negocio es "${user?.businessName || 'Mi Negocio'}".
Aquí tienes un resumen de sus datos actuales en tiempo real:
- Total de productos en inventario: ${activeProducts.length}
- Productos con stock bajo (crítico): ${activeProducts.filter(p => Number(p.quantity) <= Number(p.stock_min)).map(p => p.name).join(', ') || 'Ninguno'}
- Valor total del inventario: $${activeProducts.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.cost)), 0).toFixed(2)}
- Total de ventas registradas: ${sales.length}
- Ingresos totales históricos: $${sales.reduce((sum, s) => sum + Number(s.total_amount), 0).toFixed(2)}
- Empleados registrados: ${employees.length}

Tu objetivo es ayudar al usuario a analizar estos datos, darle consejos de negocio, sugerirle cuándo reabastecer, y responder cualquier duda sobre su inventario.
Responde de manera concisa, profesional, amigable y formatea tus respuestas usando Markdown (negritas, listas, etc.).`
    };

    setConversationHistory([systemInstruction]);

    setMessages([{
      role: 'assistant',
      text: `¡Hola, ${user?.name || 'Usuario'}! Soy tu asistente de inventario con IA. He analizado los datos de **${user?.businessName || 'tu negocio'}** y estoy listo para ayudarte. ¿Qué te gustaría saber sobre tu negocio hoy?`
    }]);
  }, [user?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    const newHistory: Message[] = [...conversationHistory, { role: 'user', content: userText }];

    try {
      const response = await sendToGroq(newHistory);
      
      setConversationHistory([...newHistory, { role: 'assistant', content: response }]);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      rotateKey();
      const remainingKeys = getAvailableKeysCount();
      setAvailableKeys(remainingKeys);
      
      let errorMessage = 'Lo siento, ocurrió un error al procesar tu solicitud con la IA.';
      
      if (remainingKeys === 0) {
        errorMessage = '⚠️ Todas las claves de API han sido bloqueadas por límite de uso. Por favor, espera o contacta al administrador.';
      } else if (error instanceof Error) {
        errorMessage = `Lo siento, ocurrió un error: ${error.message}. Se cambiará a la siguiente clave disponible.`;
      }
      
      setMessages(prev => [...prev, { role: 'assistant', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
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
        <div className="text-xs text-text-secondary">
          Claves disponibles: <span className="text-primary font-medium">{availableKeys}/10</span>
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
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
        </div>
      </div>
    </div>
  );
}
