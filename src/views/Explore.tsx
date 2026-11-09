import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { ShareButton } from '../components/Actions';
import { FilterPanel } from '../components/FilterPanel';
import { Pagination } from '../components/Pagination';
import { PetitionList, PetitionRow } from '../components/PetitionRow';
import { SearchBox } from '../components/SearchBox';
import { EmptyState, Loading } from '../components/States';
import { download, toCsv, toJson } from '../lib/exporter';
import { EMPTY_FILTERS, paginate, parseFilters, runQuery, serializeFilters, type FilterState, type SortKey } from '../lib/filters';
import { plural } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { useCore, useSearchEngine } from '../state/DataContext';

const SORT_LABEL: Record<SortKey, string> = {
  pertinence: 'Pertinence',
  recent: 'Plus récentes',
  ancien: 'Plus anciennes',
  soutiens: 'Plus de soutiens',
  'soutiens-asc': 'Moins de soutiens',
  hasard: 'Au hasard',
};

export function useFilterState() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseFilters(params), [params]);
  const update = useCallback(
    (patch: Partial<FilterState>, replace = true) => {
      const next = { ...parseFilters(params), ...patch };
      if (patch.q !== undefined && patch.q !== parseFilters(params).q) {
        next.page = 1;
        if (!patch.sort) next.sort = patch.q ? 'pertinence' : next.sort === 'pertinence' ? 'recent' : next.sort;
      }
      setParams(serializeFilters(next), { replace });
    },
    [params, setParams],
  );
  return { state, update, params };
}

export function Explore() {
  const core = useCore();
  const { state, update, params } = useFilterState();
  const search = useSearchEngine();
  useDocumentTitle(state.q ? `Recherche : ${state.q}` : 'Explorer');

  const waiting = Boolean(state.q) && search.loading;
  const hits = useMemo(() => (state.q && search.engine ? search.engine.search(state.q) : null), [state.q, search.engine]);
  const result = useMemo(
    () => (waiting ? null : runQuery(core.petitions, core.byId, state, hits)),
    [core, state, hits, waiting],
  );
  const terms = useMemo(() => (state.q && search.engine ? search.engine.queryStems(state.q) : []), [state.q, search.engine]);
  const expansion = useMemo(() => (state.q && search.engine ? search.engine.expansion(state.q).slice(0, 8) : []), [state.q, search.engine]);

  const paged = result ? paginate(result.items, state.page) : null;
  const sorts = (state.q ? (['pertinence', 'recent', 'ancien', 'soutiens', 'soutiens-asc', 'hasard'] as SortKey[]) : (['recent', 'ancien', 'soutiens', 'soutiens-asc', 'hasard'] as SortKey[]));
  const directCount = result ? [...result.hits.values()].filter((h) => h.kind === 'directe').length : 0;
  const viaCount = result ? result.items.filter((p) => result.hits.get(p.id)?.kind === 'voisine').length : 0;

  const sharePath = `/recherche${params.toString() ? `?${params.toString()}` : ''}`;

  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">Explorer le catalogue</p>
        <h1>{state.q ? <>Résultats pour « {state.q} »</> : 'Toutes les pétitions'}</h1>
        <SearchBox value={state.q} onSubmit={(q) => update({ q }, false)} onLive={(q) => update({ q })} large />
      </header>

      <div className="explore">
        <FilterPanel core={core} state={state} onChange={(patch) => update(patch)} />

        <section className="explore__results" aria-labelledby="resultats">
          <div className="toolbar">
            <h2 id="resultats" className="toolbar__count" aria-live="polite">
              {waiting ? 'Préparation de la recherche…' : result ? plural(result.items.length, 'pétition', 'pétitions') : ''}
            </h2>
            <div className="toolbar__tools">
              <label className="select-inline">
                <span className="field-label">Trier par</span>
                <select value={state.sort} onChange={(e) => update({ sort: e.target.value as SortKey, page: 1 })}>
                  {sorts.map((s) => (
                    <option key={s} value={s}>{SORT_LABEL[s]}</option>
                  ))}
                </select>
              </label>
              {state.sort === 'hasard' && (
                <button type="button" className="btn btn--ghost" onClick={() => update({ seed: Math.floor(Math.random() * 99999) + 1, page: 1 })}>
                  Nouveau tirage
                </button>
              )}
              <ShareButton path={sharePath} title="Recherche dans l'Atlas des pétitions" label="Partager cette recherche" />
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!result || result.items.length === 0}
                onClick={() => result && download('atlas-petitions.csv', toCsv(result.items, core.meta), 'text/csv')}
              >
                <Download size={16} aria-hidden="true" /> CSV
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!result || result.items.length === 0}
                onClick={() => result && download('atlas-petitions.json', toJson(result.items, core.meta, state), 'application/json')}
              >
                <Download size={16} aria-hidden="true" /> JSON
              </button>
            </div>
          </div>

          {state.q && expansion.length > 0 && !waiting && (
            <p className="note">
              La recherche élargit « {state.q} » à des termes voisins : <em>{expansion.join(', ')}</em>. Les résultats les plus directs passent en premier.
            </p>
          )}
          {state.q && viaCount > 0 && (
            <p className="note">
              {plural(directCount, 'résultat contient', 'résultats contiennent')} vos termes ; {plural(viaCount, 'autre pétition est', 'autres pétitions sont')} ajoutée{viaCount > 1 ? 's' : ''} parce
              qu'elle{viaCount > 1 ? 's sont' : ' est'} rapprochée{viaCount > 1 ? 's' : ''} d'un résultat, même si les mots diffèrent.
            </p>
          )}
          {search.error && state.q && (
            <p className="note note--warn" role="alert">L'index de recherche n'a pas pu être chargé ({search.error.message}).</p>
          )}

          {waiting && <Loading label="Chargement de l'index de recherche…" />}

          {paged && result && (
            <>
              {result.items.length === 0 ? (
                <EmptyState
                  title="Aucune pétition ne correspond"
                  action={
                    <button type="button" className="btn btn--primary" onClick={() => update({ ...EMPTY_FILTERS, sort: 'recent' }, false)}>
                      Réinitialiser la recherche
                    </button>
                  }
                >
                  <p>Essayez d'autres mots, un terme plus général, ou retirez un filtre. L'accent et les petites fautes de frappe sont tolérés.</p>
                </EmptyState>
              ) : (
                <PetitionList label="Résultats">
                  {paged.slice.map((p) => (
                    <PetitionRow
                      key={p.id}
                      petition={p}
                      hit={result.hits.get(p.id)}
                      terms={terms}
                      onTheme={(id) => update({ themes: state.themes.includes(id) ? state.themes : [...state.themes, id], page: 1 })}
                    />
                  ))}
                </PetitionList>
              )}
              <Pagination page={paged.page} pages={paged.pages} onPage={(page) => { update({ page }, false); window.scrollTo({ top: 0 }); }} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
