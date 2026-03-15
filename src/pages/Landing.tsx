import { Box, ShoppingCart, ChefHat, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-text selection:bg-primary/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.5)]" />
            <span className="text-xl font-bold tracking-tight text-text text-gradient hero-glow">InventarioY</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
            <a href="#features" className="hover:text-primary transition-colors">Características</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Planes</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" className="hidden sm:inline-flex">Acceder</Button>
            </Link>
            <Link to="/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-bg to-bg"></div>
          
          <div className="container relative mx-auto px-4 text-center">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-medium text-primary shadow-[0_0_15px_rgba(255,193,7,0.2)]">
                <Sparkles className="mr-2 h-4 w-4 drop-shadow-[0_0_5px_rgba(255,193,7,0.8)]" />
                30 Días de Prueba Gratis
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Gestiona tu inventario <span className="text-gradient drop-shadow-[0_0_15px_rgba(255,193,7,0.3)] hero-glow">inteligente y fácil</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-text-secondary sm:text-xl">
                La solución integral para tu negocio con IA integrada. Controla tu stock, ventas, recetas y personal en un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                    Comenzar Gratis
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                    Ver Planes
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-surface/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Todo lo que necesitas para crecer</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">Herramientas profesionales diseñadas específicamente para PYMES, restaurantes y comercios.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Gestión de Inventario",
                  description: "Control preciso de stock, alertas de mínimo y máximo, y seguimiento de mermas.",
                  icon: Box,
                },
                {
                  title: "Control de Ventas",
                  description: "Punto de venta integrado, gestión de carritos y reportes detallados de ingresos.",
                  icon: ShoppingCart,
                },
                {
                  title: "Recetas y Cocciones",
                  description: "Calcula costos exactos por porción y descuenta ingredientes automáticamente.",
                  icon: ChefHat,
                },
                {
                  title: "Asistente IA",
                  description: "Análisis inteligente de tus datos para predecir demanda y optimizar compras.",
                  icon: Sparkles,
                },
              ].map((feature, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(255,193,7,0.3)]">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Precios simples y transparentes</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">Sin sorpresas ni costos ocultos. Un solo plan con todo incluido.</p>
            </div>

            <div className="mx-auto max-w-md">
              <div className="relative rounded-3xl border border-primary bg-surface p-8 shadow-2xl">
                <div className="absolute -top-5 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-4 py-1 text-sm font-bold text-black">
                  Plan Profesional
                </div>
                <div className="mb-8 text-center pt-4">
                  <span className="text-5xl font-extrabold">$10</span>
                  <span className="text-text-secondary">/mes</span>
                  <p className="mt-4 text-sm text-text-secondary">Incluye 30 Días de Prueba Gratis</p>
                </div>
                
                <ul className="mb-8 space-y-4">
                  {[
                    "Productos ilimitados",
                    "Ventas y facturación ilimitadas",
                    "Gestión de recetas y producción",
                    "Control de empleados y nómina",
                    "Asistente de IA integrado (Groq)",
                    "Soporte prioritario",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/register" className="block">
                  <Button className="w-full h-12 text-base">Comenzar Prueba Gratis</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-surface/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Preguntas Frecuentes</h2>
            </div>
            
            <div className="space-y-4">
              {[
                {
                  q: "¿Cómo funciona la prueba gratis?",
                  a: "Al registrarte, obtienes automáticamente 30 días de acceso completo a todas las funciones del Plan Profesional. No se requiere tarjeta de crédito."
                },
                {
                  q: "¿Puedo cancelar mi suscripción en cualquier momento?",
                  a: "Sí, puedes cancelar tu suscripción cuando lo desees sin penalizaciones ni cargos adicionales."
                },
                {
                  q: "¿Mis datos están seguros?",
                  a: "Absolutamente. Utilizamos encriptación de grado bancario y realizamos copias de seguridad diarias para garantizar la seguridad de tu información."
                },
                {
                  q: "¿Necesito instalar algún software?",
                  a: "No, InventarioY es 100% basado en la nube. Puedes acceder desde cualquier dispositivo con conexión a internet."
                },
                {
                  q: "¿Puedo tener múltiples usuarios?",
                  a: "Sí, puedes compartir tus credenciales con tu gerente o encargado. El sistema está diseñado para que el dueño y su equipo de confianza lo utilicen."
                },
                {
                  q: "¿Cómo se realiza el pago?",
                  a: "El pago se realiza de forma manual y directa con nuestro equipo local. Una vez realizado el pago, activaremos tu suscripción en el sistema."
                }
              ].map((faq, i) => (
                <details key={i} className="group rounded-xl border border-border bg-surface p-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-1.5 font-medium text-text">
                    <h3 className="text-lg">{faq.q}</h3>
                    <span className="shrink-0 rounded-full bg-bg p-1.5 text-text-secondary sm:p-3">
                      <ChevronDown className="h-5 w-5 transition duration-300 group-open:-rotate-180" />
                    </span>
                  </summary>
                  <p className="mt-4 leading-relaxed text-text-secondary">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24">
          <div className="container mx-auto px-4 max-w-xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Contáctanos</h2>
              <p className="text-text-secondary">¿Tienes alguna duda? Escríbenos y te responderemos lo antes posible.</p>
            </div>
            
            <form action="https://formspree.io/f/mqedqlev" method="POST" className="space-y-6 rounded-2xl border border-border bg-surface p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-text-secondary">Nombre</label>
                  <input type="text" id="name" name="name" required className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-text-secondary">Email</label>
                  <input type="email" id="email" name="email" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-text-secondary">Teléfono</label>
                <input type="tel" id="phone" name="phone" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium text-text-secondary">Asunto</label>
                <input type="text" id="subject" name="subject" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-text-secondary">Mensaje</label>
                <textarea id="message" name="message" rows={4} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
              </div>
              <Button type="submit" className="w-full h-12 text-base">Enviar Mensaje</Button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="container mx-auto px-4 text-center text-text-secondary">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Box className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-text">InventarioY</span>
          </div>
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <a href="#" className="hover:text-primary transition-colors">Términos y Condiciones</a>
            <a href="#" className="hover:text-primary transition-colors">Política de Privacidad</a>
            <a href="#" className="hover:text-primary transition-colors">Manual de Usuario</a>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} InventarioY. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
