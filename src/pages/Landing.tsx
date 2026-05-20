import { Package, ShoppingCart, ChefHat, Sparkles, ChevronDown, CheckCircle2, Loader2, Users, Instagram, Facebook, Phone, MapPin, DollarSign, Headphones, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import InventarioYLogo from '../components/InventarioYLogo';

export default function Landing() {
  // Animaciones de scroll con Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const fadeElements = document.querySelectorAll('.fade-up');
    fadeElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <InventarioYLogo size="lg" />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
            <a href="#features" className="hover:text-primary transition-colors">Características</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Plan</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" className="hidden sm:inline-flex">Acceder</Button>
            </Link>
            <Link to="/register">
              <Button>Registrarse</Button>
            </Link>
            <Link to="/acceso">
              <Button 
                variant="outline" 
                className="text-sm border-primary/50 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary shadow-[0_0_10px_rgba(255,193,7,0.2)] hover:shadow-[0_0_20px_rgba(255,193,7,0.4)] transition-all duration-300"
              >
                <Users className="h-4 w-4 mr-1" />
                Acceso de Empleados
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}></div>
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
                La solución integral para restaurantes, cafeterías y comercios en Cuba. Controla tu stock, ventas, recetas y personal en un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                    Comenzar Gratis
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                    Ver Plan
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Por qué elegirnos */}
        <section className="py-16 border-y border-border/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 fade-up">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">¿Por qué elegir InventarioY?</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">Diseñado específicamente para las necesidades de negocios cubanos</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center fade-up" style={{ transitionDelay: '0ms' }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Hecho en Cuba</h3>
                <p className="text-text-secondary text-sm">Desarrollado específicamente para negocios cubanos, entiende la realidad local</p>
              </div>
              <div className="text-center fade-up" style={{ transitionDelay: '100ms' }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Precio Accesible</h3>
                <p className="text-text-secondary text-sm">Pensado para su negocio en Cuba: comience con 30 días sin pagar. Sí desea continuar luego de este tiempo, abone 5,000 CUP por mes. Ni un centavo más.</p>
              </div>
              <div className="text-center fade-up" style={{ transitionDelay: '200ms' }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Headphones className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Soporte Cercano</h3>
                <p className="text-text-secondary text-sm">Atención personalizada directamente por nosotros. Le acompañamos en todo el proceso</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-12 bg-surface/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3 fade-up">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <svg className="h-5 w-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text">Datos seguros</p>
                  <p className="text-xs text-text-secondary">Encriptación SSL</p>
                </div>
              </div>
              <div className="flex items-center gap-3 fade-up" style={{ transitionDelay: '100ms' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text">Privacidad garantizada</p>
                  <p className="text-xs text-text-secondary">Tus datos son tuyos</p>
                </div>
              </div>
              <div className="flex items-center gap-3 fade-up" style={{ transitionDelay: '200ms' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text">100% en la nube</p>
                  <p className="text-xs text-text-secondary">Accede desde cualquier lugar</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 bg-surface/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 fade-up">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Todo lo que necesitas para crecer</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">Herramientas profesionales diseñadas específicamente para PYMES, restaurantes y comercios.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Gestión de Inventario",
                  description: "Control preciso de stock, alertas de mínimo y máximo, y seguimiento de mermas.",
                  icon: Package,
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
              ].map((feature, index) => (
                <div key={feature.title} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(255,193,7,0.3)] fade-up" style={{ transitionDelay: `${index * 100}ms` }}>
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

        {/* Cómo funciona */}
        <section className="py-20 border-y border-border/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 fade-up">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Así de fácil es empezar</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">En solo 3 pasos puede tener su negocio controlado</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center fade-up" style={{ transitionDelay: '0ms' }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-black">1</div>
                <h3 className="text-lg font-semibold mb-2">Regístrese</h3>
                <p className="text-text-secondary text-sm">Cree su cuenta en segundos. Sin necesidad de tarjeta de crédito.</p>
              </div>
              <div className="text-center fade-up" style={{ transitionDelay: '100ms' }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-black">2</div>
                <h3 className="text-lg font-semibold mb-2">Pruebe gratis</h3>
                <p className="text-text-secondary text-sm">Use todos los beneficios durante 30 días sin pagar nada.</p>
              </div>
              <div className="text-center fade-up" style={{ transitionDelay: '200ms' }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-black">3</div>
                <h3 className="text-lg font-semibold mb-2">Suscríbase</h3>
                <p className="text-text-secondary text-sm">Si le gusta, aboná 5,000 CUP/mes. Sin contratos ni compromisos.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 fade-up">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Precio simple y transparente</h2>
              <p className="text-text-secondary max-w-2xl mx-auto">Sin sorpresas ni costos ocultos. Un solo plan con todo incluido.</p>
            </div>

            <div className="mx-auto max-w-md">
              <div className="relative rounded-3xl border border-primary bg-surface p-8 shadow-2xl fade-up">
                <div className="absolute -top-5 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-4 py-1 text-sm font-bold text-black">
                  Plan Profesional
                </div>
                <div className="mb-8 text-center pt-4">
                  <span className="text-5xl font-extrabold">5000 CUP</span>
                  <span className="text-text-secondary">/mes</span>
                  <p className="mt-4 text-sm text-text-secondary">30 Días de Prueba Gratis. Sin costos ocultos.</p>
                </div>
                
                <ul className="mb-8 grid grid-cols-2 gap-3">
                  {[
                    "Productos ilimitados",
                    "Control de inventario con alertas de stock",
                    "Registro de movimientos (entradas, salidas, mermas)",
                    "Ajuste de inventario con auditoría completa",
                    "Módulo de Tránsito para control de ingredientes",
                    "Cierres de caja diarios",
                    "Gestión de pagos y gastos",
                    "Punto de venta integrado",
                    "Recetas y control de producción",
                    "Control de empleados y nómina",
                    "Biblioteca de documentos para empleados (PNO, Reglamento)",
                    "Gráficos y estadísticas en tiempo real",
                    "Análisis con IA de tu negocio",
                    "Exportación de datos a Excel",
                    "Acceso desde cualquier dispositivo con internet",
                    "Soporte prioritario",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-text-secondary">{item}</span>
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

        <section id="faq" className="py-24 bg-surface/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-16 fade-up">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Preguntas Frecuentes</h2>
            </div>
            
            <div className="space-y-4 fade-up" style={{ transitionDelay: '100ms' }}>
              {[
                {
                  q: "¿Cómo funciona la prueba gratis?",
                  a: "Al registrarte, obtienes automáticamente 30 días de acceso completo a todas las funciones del Plan Profesional."
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
              ].map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-border bg-surface p-6 [&_summary::-webkit-details-marker]:hidden">
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

        <section id="contact" className="py-24">
          <div className="container mx-auto px-4 max-w-xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Contáctanos</h2>
              <p className="text-text-secondary">¿Tienes alguna duda? Escríbenos y te responderemos lo antes posible.</p>
            </div>
            
            <div className="flex justify-center">
              <a 
                href="https://wa.me/5354523884?text=Hola,%20tengo%20una%20consulta%20sobre%20InventarioY"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 h-14 px-8 text-lg font-medium bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors shadow-lg shadow-green-500/20"
              >
                <MessageCircle className="h-6 w-6" />
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-12">
        <div className="container mx-auto px-4 text-center text-text-secondary">
          <div className="flex items-center justify-center gap-2 mb-6">
            <InventarioYLogo size="lg" />
          </div>
          
          {/* Redes Sociales */}
          <div className="flex justify-center gap-6 mb-8">
            <a 
              href="https://instagram.com/rafael.espinosar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Instagram className="h-5 w-5" />
              <span>Instagram</span>
            </a>
            <a 
              href="https://facebook.com/Rafael Nicolas Espinosa Rodriguez" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Facebook className="h-5 w-5" />
              <span>Facebook</span>
            </a>
            <a 
              href="https://wa.me/5354523884" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Phone className="h-5 w-5" />
              <span>WhatsApp</span>
            </a>
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
