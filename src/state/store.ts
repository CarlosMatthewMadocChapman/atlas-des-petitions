import { useCallback, useSyncExternalStore } from 'react';

/** Petite liste d'identifiants persistée localement (aucun compte, aucun serveur). */
export interface IdListStore {
  get(): string[];
  subscribe(listener: () => void): () => void;
  set(ids: string[]): void;
}

export function createIdListStore(key: string, kind: 'local' | 'session', max = Infinity): IdListStore {
  const listeners = new Set<() => void>();
  let cache: string[] | null = null;

  const storage = (): Storage | null => {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };
  const read = (): string[] => {
    try {
      const parsed = JSON.parse(storage()?.getItem(key) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, max) : [];
    } catch {
      return [];
    }
  };
  const emit = () => listeners.forEach((l) => l());

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === key) {
        cache = null;
        emit();
      }
    });
  }

  return {
    get() {
      if (cache === null) cache = read();
      return cache;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(ids) {
      cache = ids.slice(0, max);
      try {
        storage()?.setItem(key, JSON.stringify(cache));
      } catch {
        /* stockage indisponible : la liste reste valable pour la session */
      }
      emit();
    },
  };
}

export const favoritesStore = createIdListStore('atlas-petitions:favoris', 'local');
export const compareStore = createIdListStore('atlas-petitions:comparaison', 'session', 4);

export function useIdList(store: IdListStore) {
  const ids = useSyncExternalStore(store.subscribe, store.get, () => []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => store.set(store.get().includes(id) ? store.get().filter((x) => x !== id) : [...store.get(), id]),
    [store],
  );
  const set = useCallback((next: string[]) => store.set(next), [store]);
  const clear = useCallback(() => store.set([]), [store]);
  return { ids, has, toggle, set, clear };
}

export const useFavorites = () => useIdList(favoritesStore);
export const useCompare = () => useIdList(compareStore);
