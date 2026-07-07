import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import InventarioYLogo from '../components/InventarioYLogo';

export default function Privacy() {
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
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Política de Privacidad</h1>
        </div>
        <p className="text-text-secondary text-sm mb-8">
          Última actualización: Julio 2026
        </p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text mb-3">1. Introducción</h2>
            <p>
              En InventarioY valoramos su privacidad. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal cuando utiliza nuestra aplicación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">2. Datos que Recopilamos</h2>
            <p>Al registrarse y utilizar InventarioY, recopilamos los siguientes datos:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong className="text-text">Datos de cuenta:</strong> nombre, correo electrónico, número de teléfono y nombre del negocio.</li>
              <li><strong className="text-text">Datos operativos:</strong> productos, inventario, ventas, recetas, movimientos de almacén, cuentas por cobrar y registros de actividad generados por el uso de la aplicación.</li>
              <li><strong className="text-text">Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo y páginas visitadas dentro de la aplicación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">3. Finalidad del Tratamiento</h2>
            <p>Utilizamos sus datos exclusivamente para los siguientes fines:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Proveer y mantener el servicio de gestión empresarial.</li>
              <li>Gestionar su cuenta y autenticación.</li>
              <li>Procesar y almacenar la información de su negocio (inventario, ventas, recetas).</li>
              <li>Mejorar la experiencia de usuario y el funcionamiento de la aplicación.</li>
              <li>Brindar soporte técnico y atención al cliente.</li>
              <li>Enviar comunicaciones relacionadas con el servicio (cambios en los términos, vencimiento de suscripción, etc.).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">4. Almacenamiento de los Datos</h2>
            <p>
              Sus datos se almacenan de forma segura en servidores gestionados a través de Supabase, un proveedor de infraestructura en la nube que utiliza cifrado en tránsito y en reposo. Adicionalmente, ciertos datos operativos pueden almacenarse temporalmente en el almacenamiento local de su navegador para permitir el funcionamiento sin conexión a internet.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">5. No Compartimos sus Datos</h2>
            <p>
              InventarioY no vende, alquila ni comparte sus datos personales con terceros para fines comerciales o publicitarios. Sus datos solo son accesibles por usted y, cuando usted lo autorice explícitamente, por los empleados que usted registre en la aplicación para gestionar su negocio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">6. Seguridad de los Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos contra acceso no autorizado, alteración, divulgación o destrucción. Esto incluye cifrado de contraseñas mediante hashing, autenticación por token JWT y comunicación a través de HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">7. Conservación de los Datos</h2>
            <p>
              Conservamos sus datos mientras su cuenta esté activa. Al cancelar su suscripción, sus datos operativos se conservan por un período de 90 días para permitir la reactivación de la cuenta, después del cual serán eliminados de forma permanente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">8. Sus Derechos</h2>
            <p>
              Usted tiene derecho a:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Acceder a sus datos personales almacenados en la aplicación.</li>
              <li>Solicitar la corrección de datos inexactos.</li>
              <li>Solicitar la exportación de sus datos en un formato legible.</li>
              <li>Solicitar la eliminación de su cuenta y todos los datos asociados.</li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, contáctenos a través de los canales indicados en la sección de contacto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">9. Cookies y Almacenamiento Local</h2>
            <p>
              InventarioY utiliza únicamente cookies técnicas esenciales para el funcionamiento de la aplicación, como el almacenamiento del token de sesión (JWT) en el almacenamiento local de su navegador. No utilizamos cookies de seguimiento, publicitarias ni de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">10. Menores de Edad</h2>
            <p>
              InventarioY no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si tiene conocimiento de que un menor ha proporcionado datos personales, contáctenos para proceder a su eliminación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">11. Cambios en esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos cualquier cambio significativo a través de la aplicación o por correo electrónico. La fecha de última actualización se indica al inicio de este documento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text mb-3">12. Contacto</h2>
            <p>
              Si tiene preguntas sobre esta Política de Privacidad o desea ejercer sus derechos, contáctenos:
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
