import { fold } from './text';
import type { Petition, Status } from './types';
import { shortCommission } from './format';
import type { SearchHit } from './search';

export type SortKey = 'pertinence' | 'recent' | 'ancien' | 'soutiens' | 'soutiens-asc' | 'hasard';

export interface FilterState {
  q: string;
  themes: string[];
  statuses: Status[];
  commissions: string[];
  since: string;
  until: string;
  minVotes: number | null;
  maxVotes: number | null;
  dossier: string;
  sort: SortKey;
  seed: number;
  page: number;
}

export const EMPTY_FILTERS: FilterState = {
  q: '', themes: [], statuses: [], commissions: [], since: '', until: '', minVotes: null, maxVotes: null,
  dossier: '', sort: 'recent', seed: 1, page: 1,
};

export const PAGE_SIZE = 20;
const SORTS: SortKey[] = ['pertinence', 'recent', 'ancien', 'soutiens', 'soutiens-asc', 'hasard'];
const STATUSES: Status[] = ['ouverte', 'archivee', 'classee', 'expiree'];

export function commissionSlug(name: string | null): string {
  return fold(shortCommission(name)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);
const int = (value: string | null): number | null => {
  if (value === null || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseFilters(params: URLSearchParams): FilterState {
  const q = (params.get('q') ?? '').trim();
  const requested = params.get('tri') as SortKey | null;
  const sort = requested && SORTS.includes(requested) ? requested : q ? 'pertinence' : 'recent';
  return {
    q,
    themes: list(params.get('theme')),
    statuses: list(params.get('statut')).filter((s): s is Status => STATUSES.includes(s as Status)),
    commissions: list(params.get('commission')),
    since: params.get('depuis') ?? '',
    until: params.get('jusqua') ?? '',
    minVotes: int(params.get('min')),
    maxVotes: int(params.get('max')),
    dossier: params.get('dossier') ?? '',
    sort,
    seed: int(params.get('graine')) ?? 1,
    page: Math.max(1, int(params.get('page')) ?? 1),
  };
}

export function serializeFilters(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null) => {
    if (value !== null && value !== '' && value !== undefined) params.set(key, String(value));
  };
  set('q', state.q);
  if (state.themes.length) set('theme', state.themes.join(','));
  if (state.statuses.length) set('statut', state.statuses.join(','));
  if (state.commissions.length) set('commission', state.commissions.join(','));
  set('depuis', state.since);
  set('jusqua', state.until);
  set('min', state.minVotes);
  set('max', state.maxVotes);
  set('dossier', state.dossier);
  const defaultSort: SortKey = state.q ? 'pertinence' : 'recent';
  if (state.sort !== defaultSort) set('tri', state.sort);
  if (state.sort === 'hasard') set('graine', state.seed);
  if (state.page > 1) set('page', state.page);
  return params;
}

export function activeFilterCount(state: FilterState): number {
  return (
    state.themes.length + state.statuses.length + state.commissions.length +
    (state.since ? 1 : 0) + (state.until ? 1 : 0) +
    (state.minVotes !== null ? 1 : 0) + (state.maxVotes !== null ? 1 : 0) + (state.dossier ? 1 : 0)
  );
}

export function applyFilters(petitions: Petition[], state: FilterState): Petition[] {
  return petitions.filter((p) => {
    if (state.themes.length && !state.themes.some((t) => p.themes.includes(t))) return false;
    if (state.statuses.length && !state.statuses.includes(p.status)) return false;
    if (state.commissions.length && !state.commissions.includes(commissionSlug(p.commission))) return false;
    if (state.since && (!p.published || p.published < state.since)) return false;
    if (state.until && (!p.published || p.published > state.until)) return false;
    if (state.minVotes !== null && (p.votes === null || p.votes < state.minVotes)) return false;
    if (state.maxVotes !== null && (p.votes === null || p.votes > state.maxVotes)) return false;
    if (state.dossier && p.dossier !== state.dossier) return false;
    return true;
  });
}

/** Générateur pseudo-aléatoire déterministe : une graine d'URL rejoue exactement le même tirage. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sortPetitions(items: Petition[], sort: SortKey, seed: number, scores?: Map<string, number>): Petition[] {
  const copy = [...items];
  const byDate = (a: Petition, b: Petition) => (b.published ?? '').localeCompare(a.published ?? '') || Number(b.id) - Number(a.id);
  switch (sort) {
    case 'pertinence':
      return scores ? copy.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || byDate(a, b)) : copy.sort(byDate);
    case 'ancien':
      return copy.sort((a, b) => -byDate(a, b));
    case 'soutiens':
      return copy.sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1) || byDate(a, b));
    case 'soutiens-asc':
      return copy.sort((a, b) => (a.votes ?? Infinity) - (b.votes ?? Infinity) || byDate(a, b));
    case 'hasard': {
      const random = mulberry32(seed);
      const keyed = copy.map((p) => ({ p, k: random() }));
      return keyed.sort((x, y) => x.k - y.k).map((x) => x.p);
    }
    default:
      return copy.sort(byDate);
  }
}

export interface ResultSet {
  items: Petition[];
  hits: Map<string, SearchHit>;
}

export function runQuery(
  petitions: Petition[], byId: Map<string, Petition>, state: FilterState, hits: SearchHit[] | null,
): ResultSet {
  const hitMap = new Map<string, SearchHit>();
  let pool: Petition[];
  if (hits) {
    pool = [];
    for (const hit of hits) {
      const petition = byId.get(hit.id);
      if (petition) {
        hitMap.set(hit.id, hit);
        pool.push(petition);
      }
    }
  } else {
    pool = petitions;
  }
  const filtered = applyFilters(pool, state);
  const scores = hits ? new Map(hits.map((h) => [h.id, h.score])) : undefined;
  return { items: sortPetitions(filtered, hits ? state.sort : state.sort === 'pertinence' ? 'recent' : state.sort, state.seed, scores), hits: hitMap };
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): { slice: T[]; pages: number; page: number } {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { slice: items.slice((current - 1) * size, current * size), pages, page: current };
}
