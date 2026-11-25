import { describe, expect, it } from 'vitest';
import type { Core } from './data';
import { gatherings, rallied, scattered, singular } from './gathering';
import type { Dossier, Petition } from './types';

const p = (id: string, votes: number, status = 'ouverte'): Petition => ({ id, title: `Pétition ${id}`, votes, status } as unknown as Petition);
const d = (id: string, members: string[]): Dossier => ({ id, label: id, terms: [id], size: members.length, members } as unknown as Dossier);

function core(petitions: Petition[], dossiers: Dossier[], linked: string[] = []): Core {
  return {
    petitions,
    byId: new Map(petitions.map((x) => [x.id, x])),
    dossiers,
    adjacency: new Map(linked.map((id) => [id, [{ id: 'x', relation: {} }]])),
  } as unknown as Core;
}

describe('rejoindre plutôt que disperser', () => {
  const petitions = [
    p('1', 40), p('2', 35, 'archivee'), p('3', 30), p('4', 25), p('5', 20),
    p('10', 9000), p('11', 50), p('12', 40), p('13', 30), p('14', 20),
    p('20', 3),
  ];
  const c = core(petitions, [d('epars', ['1', '2', '3', '4', '5']), d('rassemble', ['10', '11', '12', '13', '14'])], ['1', '2', '3', '4', '5', '10', '11', '12', '13', '14']);

  it('distingue une demande éparpillée d’une demande rassemblée', () => {
    const all = gatherings(c);
    expect(scattered(all).map((g) => g.dossier.id)).toEqual(['epars']);
    expect(rallied(all).map((g) => g.dossier.id)).toEqual(['rassemble']);
  });

  it('propose de rejoindre la plus signée encore ouverte', () => {
    const [g] = scattered(gatherings(c));
    expect(g.top.id).toBe('1');
    expect(g.join?.id).toBe('1');
    expect(g.under100).toBe(5);
  });

  it('garde les idées singulières : peu soutenues et sans voisine', () => {
    expect(singular(c).map((x) => x.id)).toEqual(['20']);
  });
});
