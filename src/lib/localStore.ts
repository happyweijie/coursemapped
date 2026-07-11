import { useSyncExternalStore } from 'react';

export interface LocalStore<T> {
  get(): T[];
  set(next: T[]): void;
  /** React hook returning the current list, re-rendering on changes. */
  use(): T[];
}

/**
 * A localStorage-backed list store shared by all components (no login):
 * module-level cache, change listeners for `useSyncExternalStore`, and
 * cross-tab sync via the `storage` event. Invalid persisted entries are
 * dropped through `validate`.
 */
export function createLocalStore<T>(
  storageKey: string,
  validate: (v: unknown) => v is T,
): LocalStore<T> {
  function load(): T[] {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(validate) : [];
    } catch {
      return [];
    }
  }

  let cache: T[] = load();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  window.addEventListener('storage', (e) => {
    if (e.key === storageKey) {
      cache = load();
      notify();
    }
  });

  return {
    get: () => cache,
    set(next: T[]) {
      cache = next;
      localStorage.setItem(storageKey, JSON.stringify(next));
      notify();
    },
    use: () =>
      useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => cache,
      ),
  };
}
