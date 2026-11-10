import { describe, expect, it } from 'vitest';
import { depositWave, openMostSigned, rankDossiers, topOfDossier } from './ranking';
import type { Dossier, Petition } from './types';

const p = (id: string, votes: number, published = '2026-01-01', status: Petition['status'] = 'ouverte'): Petition => ({
  id, title: id, excerpt: '', published, votes, status, commission: null, legislature: '', themes: [], dossier: '',
});
const d = (id: string, members: string[]): Dossier => ({
  id, label: id, terms: [], size: members.length, cohesion: 0.5, themes: [], years: [], central: members[0], members, pos: [], relations: {},
});
const index = (items: Petition[]) => new Map(items.map((x) => [x.id, x]));

describe('classement par signatures', () => {
  it('une seule grande pétition passe devant vingt petites', () => {
    const small = Array.from({ length: 20 }, (_, i) => p(`s${i}`, 300));
    const byId = index([...small, p('g', 700_000)]);
    const ranked = rankDossiers([d('petites', small.map((x) => x.id)), d('grande', ['g'])], byId);
    expect(ranked.map((x) => x.id)).toEqual(['grande', 'petites']);
    expect(topOfDossier(ranked[0], byId)?.votes).toBe(700_000);
  });

  it("montre d'abord ce qu'on peut encore signer", () => {
    const ids = openMostSigned([p('a', 900, undefined, 'classee'), p('b', 10), p('c', 500)], 2).map((x) => x.id);
    expect(ids).toEqual(['c', 'b']);
  });
});

describe('vague de dépôts', () => {
  const wave = Array.from({ length: 12 }, (_, i) => p(`w${i}`, i === 0 ? 85_000 : 100 + i, `2026-11-0${(i % 3) + 3}`));

  it('compte les dépôts groupés et donne une médiane, pas une somme', () => {
    const found = depositWave(d('x', wave.map((x) => x.id)), index(wave));
    expect(found).toMatchObject({ count: 12, days: 3, from: '2026-11-03', to: '2026-11-05' });
    expect(found?.medianVotes).toBeLessThan(200);
  });

  it('ne signale rien pour des dépôts étalés', () => {
    const spread = Array.from({ length: 12 }, (_, i) => p(`e${i}`, 100, `2026-${String(i + 1).padStart(2, '0')}-01`));
    expect(depositWave(d('y', spread.map((x) => x.id)), index(spread))).toBeNull();
  });
});
