import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import InventarioYLogo from '../components/InventarioYLogo';

export default function Terms() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/register"
            className="p-2 -ml-2 rounded-lg hover:bg-bg transition-colors text-text-secondary hover:text-text"
            aria-label="Volver al registro"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <InventarioYLogo className="h-7" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-8">
          <Scale className="w-7 h-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Términos y Condiciones</h1>
        </div>
        <p className="text-text-secondary text-sm mb-8">
          Última actualización: Julio 2026
        </p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al registrarse y utilizar InventarioY, usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la aplicación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">2. Descripción del Servicio</h2>
            <p>
              InventarioY es una aplicación de gestión empresarial que permite administrar inventarios, registrar ventas, gestionar recetas, controlar cuentas por cobrar y generar reportes. El servicio se ofrece exclusivamente a través de la aplicación web.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">3. Registro de Cuenta</h2>
            <p>
              Para utilizar InventarioY, debe crear una cuenta proporcionando información veraz y completa, incluyendo nombre, correo electrónico, número de teléfono y nombre del negocio. Usted es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">4. Período de Prueba Gratis</h2>
            <p>
              Al registrarse, se le otorgan 7 (siete) días de prueba gratuita con acceso completo a todas las funcionalidades de la aplicación. Al finalizar el período de prueba, deberá contratar el Plan Profesional para continuar utilizando el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">5. Plan Profesional y Pagos</h2>
            <p>
              El Plan Profesional tiene un costo mensual y se renueva automáticamente cada mes. Los pagos se coordinan directamente a través de los canales de contacto indicados en la aplicación. InventarioY se reserva el derecho de modificar los precios con previo aviso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">6. Uso Permitido</h2>
            <p>
              Usted se compromete a utilizar InventarioY únicamente para fines lícitos y de acuerdo con estos términos. Está prohibido: usar la aplicación para actividades ilegales, intentar acceder sin autorización a cuentas ajenas, realizar ingeniería inversa sobre el software, o cualquier uso que pueda dañar, sobrecargar o deteriorar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">7. Disponibilidad del Servicio</h2>
            <p>
              InventarioY se esfuerza por mantener el servicio disponible de forma continua. Sin embargo, no garantiza disponibilidad ininterrumpida y no se hace responsable por interrupciones causadas por mantenimiento, fallos técnicos, problemas de conectividad a internet o eventos fuera de su control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">8. Limitación de Responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley aplicable, InventarioY no será responsable por daños directos, indirectos, incidentales o consecuentes que resulten del uso o la imposibilidad de usar el servicio, incluyendo pérdida de datos, pérdida de ingresos o interrupción del negocio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">9. Privacidad de los Datos</h2>
            <p>
              El manejo de sus datos personales se rige por nuestra{' '}
              <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>, la cual forma parte integral de estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">10. Cancelación</h2>
            <p>
              Usted puede cancelar su suscripción en cualquier momento contactando a nuestro equipo de soporte. La cancelación será efectiva al finalizar el período de facturación actual. No se realizan reembolsos por períodos parciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">11. Modificaciones de los Términos</h2>
            <p>
              InventarioY se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor al ser publicadas en la aplicación. El uso continuado del servicio después de dichas modificaciones constituye la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">12. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos términos, puede contactarnos a través de:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>WhatsApp:{' '}
                <a href="https://wa.me/5354523884" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  +53 54523884
                </a>
              </li>
              <li>Correo electrónico:{' '}
                <a href="mailto:nikko6357@gmail.com" className="text-primary hover:underline">
                  nikko6357@gmail.com
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al registro
          </Link>
        </div>
      </main>
    </div>
  );
}
