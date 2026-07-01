# Arquitectura y Reglas del Sistema - InventarioY

Este documento establece las directrices arquitectónicas, de diseño y de desarrollo de **InventarioY**.

## 1. Stack Tecnológico y Herramientas

*   **Framework Principal:** React 19 con TypeScript.
*   **Build Tool:** Vite 6.
*   **Estilos:** Tailwind CSS v4 con tema oscuro personalizado vía `@theme` en `index.css`.
*   **Enrutamiento:** React Router v7 para navegación tipo SPA.
*   **Gestión de Estado:** Zustand 5 (estado global en `authStore` y `dbStore`).
*   **Backend & Base de Datos:** Supabase (PostgreSQL, Auth, Edge Functions).
*   **Offline-first:** Dexie (IndexedDB) para caché local + Sync Engine para cola de sincronización.
*   **Iconografía:** Lucide React.
*   **Animaciones:** GSAP.
*   **Gráficos:** Recharts.
*   **Notificaciones:** Sonner (toasts).
*   **Componentes UI:** Construidos desde cero con Tailwind CSS + `@radix-ui/react-slot`.

## 2. Estructura de Directorios

Estructura plana (no Feature-Sliced):

```text
/src
  /components      # Componentes UI reutilizables
    /ui            # Primitivos: Button, Input, Switch, NumberInput, Label
  /lib             # Utilidades de terceros y helpers
    /hooks         # Custom hooks (useRealTimeClock, usePersistentFilters)
    /animations    # Hooks de animación GSAP (useStaggerEnter, useModalAnimation, useCountUp)
  /pages           # Vistas del router
    /dashboard     # Vistas protegidas del panel principal
  /store           # Estado global Zustand (authStore, dbStore)
```

## 3. Reglas de Desarrollo y Buenas Prácticas

### 3.1. TypeScript
*   Preferir tipos explícitos sobre `any`.
*   `tsc --noEmit` debe pasar antes de considerar un cambio completo.

### 3.2. Componentes y React
*   **Componentes Funcionales:** Exclusivamente funcionales y Hooks.
*   **Responsabilidad Única:** Un componente debe hacer una sola cosa.

### 3.3. Gestión de Datos y Supabase
*   **RLS (Row Level Security):** Es **CRÍTICO**. Cada tabla debe tener RLS activado con `auth.uid() = user_id`.
*   **SECURITY DEFINER:** Toda función con `SECURITY DEFINER` debe incluir `SET search_path TO 'public'`.

### 3.4. Autenticación y Autorización
*   **Supabase Auth:** Email/password.
*   **Roles:** `admin`, `user`. Además PIN-based: `owner`, `economist`, `admin`, `supervisor`, `clerk`.
*   **Auto-login:** Credenciales en localStorage (base64 — mejorable).
*   **Admin global:** Configurable vía `VITE_ADMIN_EMAIL` (solo para configuración inicial). El rol `admin` en la tabla `profiles` determina los permisos en runtime.

### 3.5. Estilos y UI/UX
*   **Tema:** Claro y Oscuro (toggle en sidebar).
*   **Feedback Visual:** Botones con hover/active/disabled. Spinners en operaciones async.
*   **Manejo de Errores:** Toasts con Sonner.
*   **Responsive:** Mobile-first con Tailwind (`hidden md:table-cell`, etc.).

## 4. Arquitectura Multi-Tenant (SaaS)

1.  **Aislamiento de Datos:** Cada tabla tiene columna `user_id`. RLS con `auth.uid() = user_id`.
2.  **Suscripciones:** Estado `trial` (7 días), `active`, `past_due`, `canceled`. Control vía `SubscriptionBanner` + `checkSubscriptionActive`.

## 5. Offline-first

1.  **Dexie (IndexedDB):** Cache local de productos, movimientos, etc.
2.  **Sync Engine (`syncEngine.ts`):** Cola de operaciones pendientes. Procesa al reconectar.
3.  **Supabase client con fetch custom:** Detecta `navigator.onLine`, retorna 503 si está offline.

## 6. Flujo de Trabajo (Git/Desarrollo)

*   **Commits Semánticos:** `feat:`, `fix:`, `refactor:`, `style:`.
*   **Revisiones:** Antes de dar por terminado un módulo, verificar:
    *   `tsc --noEmit` sin errores
    *   `vite build` exitoso
    *   ¿Es responsive (móvil/tablet/desktop)?
    *   ¿Maneja correctamente los estados de error y carga?
