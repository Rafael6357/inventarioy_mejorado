// Previene duplicados en Zustand cuando un Realtime event
// de Supabase compite con una mutación local del mismo dispositivo
const _locallyCreating = new Set<string>();

export function trackLocalCreation(id: string) {
  _locallyCreating.add(id);
  setTimeout(() => _locallyCreating.delete(id), 30000);
}

export function untrackLocalCreation(id: string) {
  _locallyCreating.delete(id);
}

export function isLocallyCreating(id: string): boolean {
  return _locallyCreating.has(id);
}
