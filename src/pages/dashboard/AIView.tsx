import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Sparkles, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

export default function AIView() {
  const { user } = useAuthStore();
  const { products, sales, movements, employees } = useDatabaseStore();
  
  const activeProducts = products.filter(p => p.is_active !== false);

  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    // Initialize chat
    try {
      // @ts-ignore - process.env is injected by the environment
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        setMessages([{
          role: 'model',
          text: '⚠️ La API Key de Gemini no está configurada en el entorno.'
        }]);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Eres un asistente de IA experto en gestión de inventarios y negocios para la aplicación "InventarioY".
El usuario actual es ${user?.name} y su negocio es "${user?.businessName}".
Aquí tienes un resumen de sus datos actuales en tiempo real:
- Total de productos en inventario: ${activeProducts.length}
- Productos con stock bajo (crítico): ${activeProducts.filter(p => p.quantity <= p.stock_min).map(p => p.name).join(', ') || 'Ninguno'}
- Valor total del inventario: $${activeProducts.reduce((sum, p) => sum + (p.quantity * p.cost), 0).toFixed(2)}
- Total de ventas registradas: ${sales.length}
- Ingresos totales históricos: $${sales.reduce((sum, s) => sum + s.total_amount, 0).toFixed(2)}
- Empleados registrados: ${employees.length}

Tu objetivo es ayudar al usuario a analizar estos datos, darle consejos de negocio, sugerirle cuándo reabastecer, y responder cualquier duda sobre su inventario.
Responde de manera concisa, profesional, amigable y formatea tus respuestas usando Markdown (negritas, listas, etc.).`;

      chatRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
        }
      });
      
      setMessages([{
        role: 'model',
        text: `¡Hola, ${user?.name}! Soy tu asistente de inventario con IA. He analizado los datos de **${user?.businessName}** y estoy listo para ayudarte. ¿Qué te gustaría saber sobre tu negocio hoy?`
      }]);
    } catch (error) {
      console.error("Error initializing AI:", error);
      setMessages([{
        role: 'model',
        text: 'Error al inicializar el asistente. Por favor verifica la conexión.'
      }]);
    }
  }, [user, activeProducts, sales, employees]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatRef.current || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userText });
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, ocurrió un error al procesar tu solicitud con la IA.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.5)]" />
          <span className="text-gradient">Asistente IA</span>
        </h1>
        <p className="text-sm text-text-secondary">
          Consulta datos de tu inventario, pide análisis y consejos de negocio
        </p>
      </div>

      <div className="flex-1 rounded-xl border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_rgba(205,164,52,0.15)]">
        {/* Chat Messages Area */}
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

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-bg/50">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre tu stock, ventas o pide un consejo..."
              className="flex-1 bg-surface"
              disabled={isLoading || !chatRef.current}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim() || !chatRef.current}
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
