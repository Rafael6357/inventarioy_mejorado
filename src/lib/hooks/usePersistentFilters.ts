import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "../../store/authStore";

export type FilterSetter<T> = (updater: Partial<T> | ((prev: T) => Partial<T> | T)) => void;
export type FilterResetter = () => void;

function getStorageKey(viewName: string, userId: string | undefined): string {
  return `filters:${userId ?? "anon"}:${viewName}`;
}

function loadFromStorage<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...defaults, ...parsed } as T;
  } catch {
    return defaults;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or storage unavailable; silent
  }
}

export interface PersistentFiltersApi<T> {
  filters: T;
  setFilters: FilterSetter<T>;
  resetFilters: FilterResetter;
}

export function usePersistentFilters<T extends Record<string, unknown>>(
  viewName: string,
  defaults: T
): PersistentFiltersApi<T> {
  const userId = useAuthStore((s) => s.user?.id);
  const storageKey = getStorageKey(viewName, userId);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;
  const [filters, setFiltersState] = useState<T>(() => loadFromStorage(storageKey, defaults));
  const lastKeyRef = useRef(storageKey);

  useEffect(() => {
    if (lastKeyRef.current !== storageKey) {
      lastKeyRef.current = storageKey;
      setFiltersState(loadFromStorage(storageKey, defaultsRef.current));
    }
  }, [storageKey]);

  useEffect(() => {
    saveToStorage(storageKey, filters);
  }, [storageKey, filters]);

  const setFilters = useCallback<FilterSetter<T>>((updater) => {
    setFiltersState((prev) => {
      const partial = typeof updater === "function" ? (updater as (p: T) => Partial<T> | T)(prev) : updater;
      if (typeof partial === "object" && partial !== null && !Array.isArray(partial)) {
        return { ...prev, ...(partial as Partial<T>) };
      }
      return partial as unknown as T;
    });
  }, []);

  const resetFilters = useCallback<FilterResetter>(() => {
    setFiltersState(defaultsRef.current);
  }, []);

  return { filters, setFilters, resetFilters };
}
