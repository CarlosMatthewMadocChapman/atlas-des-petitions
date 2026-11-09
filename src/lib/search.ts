import MiniSearch from 'minisearch';
import type { Neighbor } from './types';
import type { RawSearch } from './data';
import { stems } from './text';

export type HitKind = 'directe' | 'elargie' | 'voisine';

export interface SearchHit {
  id: string;
  score: number;
  kind: HitKind;
  /** Pour une pétition voisine : l'identifiant de la pétition trouvée dont elle est rapprochée. */
  via?: string;
}

export interface TextHit {
  id: string;
  score: number;
  /** Nombre de termes distincts du texte retrouvés dans la pétition. */
  matched: number;
}

export interface SearchEngine {
  search(query: string): SearchHit[];
  /** Pétitions les plus proches d'un texte libre (plusieurs phrases). Tout se passe dans le navigateur. */
  similar(text: string, limit?: number): { terms: string[]; hits: TextHit[] };
  queryStems(query: string): string[];
  /** Termes voisins ajoutés à la requête, pour l'afficher honnêtement. */
  expansion(query: string): string[];
}

const EXPANSION_WEIGHT = 0.18;
const MIN_DIRECT_BEFORE_OR = 12;
const NEIGHBOURS_FROM_TOP = 6;
const MAX_TEXT_TERMS = 70;

export function createSearch(
  raw: RawSearch,
  neighborsOf: (id: string) => Neighbor[] = () => [],
): SearchEngine {
  const stopwords = new Set(raw.stopwords);
  const index = new MiniSearch<{ id: string; t: string; b: string }>({
    fields: ['t', 'b'],
    idField: 'id',
    tokenize: (text) => text.split(' ').filter(Boolean),
    processTerm: (term) => term,
    searchOptions: {
      boost: { t: 3 },
      prefix: (term) => term.length >= 3,
      fuzzy: (term) => (term.length > 4 ? 0.18 : false),
    },
  });
  index.addAll(raw.docs.map(([id, t, b]) => ({ id, t, b })));

  const groupsByStem = new Map<string, [string, string][][]>();
  for (const group of raw.groups) {
    for (const [s] of group) {
      const list = groupsByStem.get(s);
      if (list) list.push(group);
      else groupsByStem.set(s, [group]);
    }
  }

  const queryStems = (query: string) => [...new Set(stems(query, stopwords))];

  /** Radical → mot affiché des termes voisins de la requête. */
  const related = (query: string): Map<string, string> => {
    const own = new Set(queryStems(query));
    const found = new Map<string, string>();
    for (const s of own) {
      for (const group of groupsByStem.get(s) ?? []) {
        for (const [g, word] of group) if (!own.has(g) && !found.has(g)) found.set(g, word);
      }
    }
    return found;
  };
  const expansion = (query: string): string[] => [...related(query).values()];

  const search = (query: string): SearchHit[] => {
    const terms = queryStems(query);
    if (terms.length === 0) return [];
    const joined = terms.join(' ');
    const hits = new Map<string, SearchHit>();

    for (const r of index.search(joined, { combineWith: 'AND' })) {
      hits.set(r.id as string, { id: r.id as string, score: r.score, kind: 'directe' });
    }
    if (hits.size < MIN_DIRECT_BEFORE_OR && terms.length > 1) {
      for (const r of index.search(joined, { combineWith: 'OR' })) {
        if (!hits.has(r.id as string)) hits.set(r.id as string, { id: r.id as string, score: r.score * 0.35, kind: 'elargie' });
      }
    }
    const neighbours = [...related(query).keys()];
    if (neighbours.length > 0) {
      for (const r of index.search(neighbours.join(' '), { combineWith: 'OR', prefix: false, fuzzy: false })) {
        const id = r.id as string;
        const existing = hits.get(id);
        if (existing) existing.score += r.score * EXPANSION_WEIGHT;
        else if (r.terms.length >= 2) hits.set(id, { id, score: r.score * EXPANSION_WEIGHT, kind: 'elargie' });
      }
    }

    const ranked = [...hits.values()].sort((a, b) => b.score - a.score || Number(a.id) - Number(b.id));
    const direct = ranked.filter((h) => h.kind === 'directe').slice(0, NEIGHBOURS_FROM_TOP);
    const topScore = ranked[0]?.score ?? 1;
    for (const hit of direct) {
      for (const n of neighborsOf(hit.id)) {
        if (n.relation.type === 'thematique' || hits.has(n.id)) continue;
        hits.set(n.id, { id: n.id, score: topScore * 0.05 * n.relation.score, kind: 'voisine', via: hit.id });
      }
    }
    return [...hits.values()].sort((a, b) => b.score - a.score || Number(a.id) - Number(b.id));
  };

  const similar = (text: string, limit = 40) => {
    const terms = queryStems(text).slice(0, MAX_TEXT_TERMS);
    if (terms.length === 0) return { terms, hits: [] as TextHit[] };
    const minMatched = terms.length <= 2 ? 1 : 2;
    const hits = index
      .search(terms.join(' '), { combineWith: 'OR', prefix: false, fuzzy: false })
      .filter((r) => r.terms.length >= minMatched)
      .slice(0, limit)
      .map((r) => ({ id: r.id as string, score: r.score, matched: r.terms.length }));
    return { terms, hits };
  };

  return { search, similar, queryStems, expansion };
}

/** Découpe un texte en morceaux (mot trouvé / reste) pour surligner les termes de la requête. */
export function highlightParts(text: string, queryStems: string[], stem: (w: string) => string, fold: (w: string) => string): { text: string; hit: boolean }[] {
  if (queryStems.length === 0) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  const re = /(\p{L}+)/gu;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    const word = match[0];
    const s = stem(fold(word));
    const hit = word.length >= 3 && queryStems.some((q) => s === q || (q.length >= 4 && s.startsWith(q)));
    if (start > last) parts.push({ text: text.slice(last, start), hit: false });
    parts.push({ text: word, hit });
    last = start + word.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}
