import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchJson, loadCore, type Core, type RawSearch } from '../lib/data';
import { createSearch, type SearchEngine } from '../lib/search';

type CoreState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; core: Core };

const CoreContext = createContext<CoreState>({ status: 'loading' });

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoreState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadCore()
      .then((core) => !cancelled && setState({ status: 'ready', core }))
      .catch((error: Error) => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = useMemo(() => state, [state]);
  return (
    <CoreContext.Provider value={value}>
      <RetryContext.Provider value={() => setAttempt((n) => n + 1)}>{children}</RetryContext.Provider>
    </CoreContext.Provider>
  );
}

const RetryContext = createContext<() => void>(() => undefined);
export const useRetry = () => useContext(RetryContext);
export const useCoreState = () => useContext(CoreContext);

export function useCore(): Core {
  const state = useContext(CoreContext);
  if (state.status !== 'ready') throw new Error('Données non chargées');
  return state.core;
}

interface SearchState {
  engine: SearchEngine | null;
  stopwords: ReadonlySet<string>;
  loading: boolean;
  error: Error | null;
}

let rawSearch: Promise<RawSearch> | null = null;
const loadRawSearch = () => (rawSearch ??= (fetchJson('search.json') as Promise<RawSearch>).catch((error) => {
  rawSearch = null;
  throw error;
}));

const NO_STOPWORDS: ReadonlySet<string> = new Set();
let engineCache: { core: Core; engine: SearchEngine; stopwords: ReadonlySet<string> } | null = null;

/** Charge l'index de recherche à la première utilisation (≈ 1 Mo compressé), puis le garde en mémoire. */
export function useSearchEngine(): SearchState {
  const core = useCore();
  const cached = engineCache && engineCache.core === core ? engineCache : null;
  const [state, setState] = useState<SearchState>(
    cached
      ? { engine: cached.engine, stopwords: cached.stopwords, loading: false, error: null }
      : { engine: null, stopwords: NO_STOPWORDS, loading: true, error: null },
  );

  useEffect(() => {
    if (engineCache && engineCache.core === core) return;
    let cancelled = false;
    loadRawSearch()
      .then((raw) => {
        const engine = createSearch(raw, (id) => core.adjacency.get(id) ?? []);
        const stopwords = new Set(raw.stopwords);
        engineCache = { core, engine, stopwords };
        if (!cancelled) setState({ engine, stopwords, loading: false, error: null });
      })
      .catch((error: Error) => !cancelled && setState({ engine: null, stopwords: NO_STOPWORDS, loading: false, error }));
    return () => {
      cancelled = true;
    };
  }, [core]);

  return state;
}
