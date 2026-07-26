# AGENTS.md — InventarioY

## Stack
React 19 + TypeScript 5.8 + Vite 6 + Tailwind v4 + Zustand 5 + Supabase + Dexie 4

## Setup / Entorno
- `npm install` → `.env` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `npm run dev` (puerto 3000, host 0.0.0.0)
- **⚠️ Mismo proyecto Supabase para desarrollo y producción. Cualquier escritura/prueba toca datos reales.**
- Migraciones SQL en `supabase/migrations/`. Edge Function en `supabase/functions/`.

## Estructura
```
src/
├── store/          # authStore + dbStore (Zustand)
├── lib/            # supabase, dexieDb, syncEngine, unitConversion, etc.
├── components/     # ui/ (Button, Input...) + shared (Modal, SyncStatus...)
├── pages/          # Landing, Login + Dashboard + dashboard/ (16 views)
├── design-system/  # ThemeProvider + tokens
├── hooks/          # useIsOnline, useOfflineDisabled
```

## dbStore (~5k líneas) — NO LEER COMPLETO
Usar grep/búsqueda por nombre de interfaz (`Product`, `Sale`, `Recipe`...) o método (`addProduct`, `addSale`...).

## Auth / Roles
- **Supabase Auth** (email/password) para sesión + **PIN-based role system** sobre ella
- Pines en tabla `access_pins` → roles: `owner`, `economist`, `admin`, `supervisor`, `clerk`
- `MODULE_ROLES` controla qué rol ve qué módulo del dashboard
- **RLS**: todas las tablas con `user_id = auth.uid()` en migraciones

## Offline-first
- Toda operación chequea `navigator.onLine`
- Offline: Zustand optimista → Dexie cache → SyncQueue
- **SyncEngine**: FIFO, batches 20, 5 reintentos (2s/4s/6s/8s/10s), abandona tras 5
- **Conflictos**: LAST-WRITE-WINS sin merge; duplicados (23505) eliminados; RLS (42501) abandono inmediato
- **Realtime guard**: `isLocallyCreating()` con ventana 30s evita doble-aplicación
- **customFetch**: offline retorna 503 en vez de error de red
- **`restoreFromCache`**: solo corre `replayPendingSyncQueue` si `navigator.onLine`

## Módulo Ventas (SalesView)
- `rawInputValues: Record<string, string>` preserva input al tipear
- Coma `,` como decimal; blur parsea + clamp + toast
- Recetas: solo enteros (`getUnitStep(u, true)=1`, `getUnitMin(u, true)=1`, initial=1)
- Cart: `displayUnit` + selector (excluye u/sac/lat); `convertUnit()` con `normalizeUnit()` previo
- `consumeFromTransit` offline: bulkPut todo a Dexie ANTES de filtrar remaining>0 a Zustand
- `unit: 'porción'` en recetas es intencional (display informativo); `normalizeUnit('porción')` → `'u'` — no se intenta conversión

## Manejo de errores
- Logger: localStorage (`logger.info/warn/error`, máx 200 entradas)
- Toasts: `sonner` para feedback de usuario
- ErrorBoundary envolviendo rutas de dashboard
- No Sentry / No error tracking externo

## Testing
- **Solo e2e con Playwright**: `tests/offline-stress.spec.ts`, `tests/cuban-cycle.spec.ts`
- **No hay unit tests.** Si se toca lógica crítica (sync, conversión de unidades, offline), considerar agregar test e2e.
- No asumir cobertura existente.

## Convenciones de código
- Componentes: PascalCase, funcionales + hooks, props interface exportada
- UI primitives: PascalCase en `components/ui/`
- Stores/utils: camelCase
- `cn()` para Tailwind merging; CVA para variantes (Button)
- Estado global (Zustand) para datos de dominio; `useState` para UI efímera
- Código (variables, funciones, tipos) en inglés; comentarios en español

## Commits
- Español, formato conventional commits: `feat:`, `fix:`, `refactor:`, `style:`

## Anti-patrones / No hacer
- No tocar RLS/permisos sin revisar migrations + modelo de roles PIN primero
- No leer `dbStore.ts` completo — usar grep siempre
- No hacer fetch directo a Supabase desde componentes — pasar por dbStore + offline flow
- No desactivar `realtimeGuard.ts` sin entender el patrón de doble-aplicación
- No asumir cobertura de tests donde no existe
- No ejecutar migraciones SQL ni deletes/cambios masivos sin confirmación explícita — no hay staging, toca datos reales

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm run build` — build producción
- `npm run lint` — `tsc --noEmit` (no hay ESLint/Prettier)
- `npx playwright test` — tests e2e
