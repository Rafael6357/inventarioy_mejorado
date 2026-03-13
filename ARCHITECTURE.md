# Arquitectura y Reglas del Sistema - InventarioY

Este documento establece las directrices arquitectónicas, de diseño y de desarrollo para asegurar que **InventarioY** se construya como un SaaS profesional, escalable y mantenible.

## 1. Stack Tecnológico y Herramientas

*   **Framework Principal:** React 18 con TypeScript.
*   **Build Tool:** Vite.
*   **Estilos:** Tailwind CSS (Recomendado sobre CSS-in-JS inline por rendimiento, consistencia y facilidad de mantenimiento en proyectos grandes). Soporte nativo para temas Dark/Light mediante clases de Tailwind (`dark:bg-gray-900`).
*   **Enrutamiento:** React Router (v6) para navegación tipo SPA (Single Page Application).
*   **Gestión de Estado:** Zustand (para estado global ligero como sesión de usuario, tema, carrito de ventas) y React Query (para caché y sincronización de datos con Supabase).
*   **Backend & Base de Datos:** Supabase (PostgreSQL, Auth, Storage).
*   **Iconografía:** Lucide React.
*   **Componentes UI:** Construidos desde cero con Tailwind CSS o utilizando una librería headless como Radix UI / shadcn/ui para accesibilidad.

## 2. Estructura de Directorios

El proyecto seguirá una arquitectura basada en características (Feature-Sliced Design simplificado) para mantener el código organizado a medida que el SaaS crezca.

```text
/src
  /assets          # Imágenes, logos, fuentes
  /components      # Componentes UI reutilizables (Botones, Modales, Tablas)
  /config          # Configuraciones globales (Supabase, Groq, Constantes)
  /features        # Módulos principales de la aplicación
    /auth          # Login, Registro, Recuperación de contraseña
    /inventory     # Stock, Alta de productos, Movimientos
    /sales         # Punto de venta, Carrito
    /hr            # Empleados, Nómina
    /recipes       # Recetas, Ingredientes
    /ai            # Asistente Groq
  /hooks           # Custom hooks globales (ej. useTheme, useAuth)
  /layouts         # Estructuras de página (MainLayout, AuthLayout)
  /lib             # Utilidades de terceros (Supabase client, Groq client)
  /pages           # Vistas principales que combinan features (Routing)
  /store           # Estado global (Zustand)
  /types           # Definiciones de TypeScript globales
  /utils           # Funciones de ayuda (formateo de moneda, fechas)
```

## 3. Reglas de Desarrollo y Buenas Prácticas

### 3.1. TypeScript Estricto
*   Evitar el uso de `any`. Definir interfaces o types para todas las entidades de la base de datos (basadas en el esquema de Supabase).
*   Usar genéricos cuando sea necesario para componentes reutilizables (ej. Tablas).

### 3.2. Componentes y React
*   **Componentes Funcionales:** Usar exclusivamente componentes funcionales y Hooks.
*   **Responsabilidad Única:** Un componente debe hacer una sola cosa. Si crece demasiado, dividirlo en subcomponentes.
*   **Memoización:** Usar `useMemo` y `useCallback` solo cuando haya problemas de rendimiento demostrables o al pasar props a componentes hijos memoizados.

### 3.3. Gestión de Datos y Supabase
*   **RLS (Row Level Security):** Es **CRÍTICO** para un SaaS. Cada tabla en Supabase debe tener RLS activado. Los usuarios solo deben poder leer/escribir datos que pertenezcan a su `tenant_id` (o ID de negocio).
*   **Consultas:** Centralizar las llamadas a Supabase en hooks personalizados (ej. `useProducts()`, `useSales()`) o en el directorio `/features/[modulo]/api`.

### 3.4. Autenticación y Autorización
*   **Supabase Auth:** Manejará el registro y login.
*   **Roles:** Implementar un sistema de roles (Admin, Cajero, etc.). Las rutas y componentes de la UI deben protegerse según el rol del usuario autenticado.
*   **Validación de Dominio:** Implementar la restricción de "Solo emails @gmail.com" en el frontend y mediante Triggers/Edge Functions en Supabase para mayor seguridad.

### 3.5. Estilos y UI/UX
*   **Variables CSS/Tailwind:** Definir la paleta de colores del PRD en `tailwind.config.js` (o `vite.config.ts` en Tailwind v4) para usar clases como `bg-primary`, `text-surface`.
*   **Feedback Visual:** Todo botón debe tener estados `hover`, `active` y `disabled`. Toda acción asíncrona debe mostrar un estado de carga (spinners, skeletons).
*   **Manejo de Errores:** Mostrar notificaciones (Toasts) amigables al usuario cuando una operación falle. No dejar errores silenciosos en consola.

## 4. Arquitectura Multi-Tenant (SaaS)

Dado que es un SaaS local para múltiples negocios:
1.  **Aislamiento de Datos:** Cada tabla (products, sales, etc.) debe tener una columna `business_id` (o `tenant_id`).
2.  **Políticas RLS:** La política de Supabase debe ser `auth.uid() = owner_id` o verificar que el usuario pertenece al `business_id`.
3.  **Suscripciones:** La tabla `subscriptions` controlará el acceso. Si el trial expira y no hay pago, el sistema debe bloquear el acceso a los módulos (excepto Configuración/Pagos) mediante un middleware en el frontend y RLS en el backend.

## 5. Integración de IA (Groq)
*   **Rotación de Keys:** Implementar un servicio en el backend (Supabase Edge Functions) o un utility robusto en el frontend que maneje el array de las 10 keys y cambie a la siguiente si una falla por límite de cuota (Rate Limit). *Nota: Por seguridad, es mejor hacer las llamadas a Groq desde una Edge Function para no exponer las API Keys en el cliente.*

## 6. Flujo de Trabajo (Git/Desarrollo)
*   **Commits Semánticos:** Usar prefijos como `feat:`, `fix:`, `refactor:`, `style:`.
*   **Revisiones:** Antes de dar por terminado un módulo, verificar:
    *   ¿Funciona en modo oscuro y claro?
    *   ¿Es responsive (móvil/tablet/desktop)?
    *   ¿Maneja correctamente los estados de error y carga?
