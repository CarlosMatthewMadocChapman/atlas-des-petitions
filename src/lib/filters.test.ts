import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS, applyFilters, commissionSlug, mulberry32, paginate, parseFilters, runQuery, serializeFilters, sortPetitions,
} from './filters';
import type { Petition } from './types';

const make = (id: string, patch: Partial<Petition> = {}): Petition => ({
  id, title: `Pétition ${id}`, excerpt: '', published: '2025-01-01', votes: 10, status: 'ouverte', commission: 'Commission des affaires sociales',
  legislature: '', themes: [], dossier: '', ...patch,
});

const SAMPLE = [
  make('1', { votes: 5, themes: ['sante'], published: '2024-03-01' }),
  make('2', { votes: 600, themes: ['logement'], status: 'classee', published: '2025-06-01' }),
  make('3', { votes: null, themes: ['sante', 'travail'], published: '2023-01-01', commission: null }),
  make('4', { votes: 49, dossier: 'd4', published: '2026-02-01' }),
  make('5', { votes: 50, published: null }),
];

describe('adresses partageables', () => {
  it('reconstitue exactement les critères depuis l\'adresse', () => {
    const state = {
      ...EMPTY_FILTERS, q: 'pluralisme des médias', themes: ['medias', 'democratie'], statuses: ['ouverte' as const], since: '2024-01-01', maxVotes: 99, sort: 'soutiens' as const, page: 3,
    };
    const params = serializeFilters(state);
    expect(parseFilters(new URLSearchParams(params.toString()))).toEqual(state);
  });

  it('omet les valeurs par défaut', () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('');
    expect(serializeFilters({ ...EMPTY_FILTERS, q: 'abc', sort: 'pertinence' }).toString()).toBe('q=abc');
  });

  it('ignore les valeurs invalides', () => {
    const state = parseFilters(new URLSearchParams('statut=bidon,ouverte&min=abc&tri=n-importe-quoi&page=-4'));
    expect(state.statuses).toEqual(['ouverte']);
    expect(state.minVotes).toBeNull();
    expect(state.sort).toBe('recent');
    expect(state.page).toBe(1);
  });

  it('garde la graine du tirage au hasard', () => {
    const params = serializeFilters({ ...EMPTY_FILTERS, sort: 'hasard', seed: 42 });
    expect(parseFilters(params).seed).toBe(42);
  });
});

describe('filtres combinables', () => {
  it('combine thème, statut et soutiens', () => {
    const res = applyFilters(SAMPLE, { ...EMPTY_FILTERS, themes: ['sante'], maxVotes: 10 });
    expect(res.map((p) => p.id)).toEqual(['1']);
  });

  it('exclut les soutiens inconnus dès qu\'un seuil est posé', () => {
    expect(applyFilters(SAMPLE, { ...EMPTY_FILTERS, maxVotes: 1000 }).map((p) => p.id)).not.toContain('3');
    expect(applyFilters(SAMPLE, EMPTY_FILTERS)).toHaveLength(5);
  });

  it('filtre par période, commission et dossier', () => {
    expect(applyFilters(SAMPLE, { ...EMPTY_FILTERS, since: '2025-01-01' }).map((p) => p.id)).toEqual(['2', '4']);
    expect(applyFilters(SAMPLE, { ...EMPTY_FILTERS, commissions: [commissionSlug('Commission des affaires sociales')] })).toHaveLength(4);
    expect(applyFilters(SAMPLE, { ...EMPTY_FILTERS, dossier: 'd4' }).map((p) => p.id)).toEqual(['4']);
  });
});

describe('tris et pagination', () => {
  it('trie par soutiens sans jamais cacher les valeurs absentes', () => {
    expect(sortPetitions(SAMPLE, 'soutiens', 1).map((p) => p.id)).toEqual(['2', '5', '4', '1', '3']);
    expect(sortPetitions(SAMPLE, 'soutiens-asc', 1).map((p) => p.id)).toEqual(['1', '4', '5', '2', '3']);
  });

  it('le tirage au hasard est reproductible par graine', () => {
    const a = sortPetitions(SAMPLE, 'hasard', 7).map((p) => p.id);
    expect(sortPetitions(SAMPLE, 'hasard', 7).map((p) => p.id)).toEqual(a);
    expect(sortPetitions(SAMPLE, 'hasard', 8).map((p) => p.id)).not.toEqual(a);
    const r = mulberry32(1);
    expect(r()).toBeGreaterThanOrEqual(0);
  });

  it('pagine en bornant la page', () => {
    const list = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(list, 1).slice).toHaveLength(20);
    expect(paginate(list, 3).slice).toHaveLength(5);
    expect(paginate(list, 99).page).toBe(3);
  });

  it('classe par pertinence quand des résultats de recherche existent', () => {
    const byId = new Map(SAMPLE.map((p) => [p.id, p]));
    const out = runQuery(SAMPLE, byId, { ...EMPTY_FILTERS, q: 'x', sort: 'pertinence' }, [
      { id: '2', score: 1, kind: 'directe' }, { id: '1', score: 5, kind: 'directe' }, { id: 'zzz', score: 9, kind: 'directe' },
    ]);
    expect(out.items.map((p) => p.id)).toEqual(['1', '2']);
  });
});
