import { describe, expect, it } from 'vitest';
import { realSearch } from './testdata';

describe('recherche sur le vrai catalogue', async () => {
  const { core, engine } = await realSearch();
  const titles = (hits: { id: string }[], n = 15) => hits.slice(0, n).map((h) => core.byId.get(h.id)?.title ?? '');

  it('« pluralisme des médias » trouve des pétitions pertinentes, y compris avec d\'autres formulations', () => {
    const hits = engine.search('pluralisme des médias');
    expect(hits.length).toBeGreaterThan(20);
    const top = titles(hits).join(' | ').toLowerCase();
    expect(top).toMatch(/pluralisme|arcom|audiovisuel|tnt|cnews|médias|medias/);
    const mediaThemed = hits.slice(0, 15).filter((h) => core.byId.get(h.id)?.themes.includes('medias')).length;
    expect(mediaThemed).toBeGreaterThanOrEqual(10);
  });

  it('ignore les accents et la casse', () => {
    const a = engine.search('MÉDIAS pluralisme').map((h) => h.id).slice(0, 10);
    const b = engine.search('medias pluralisme').map((h) => h.id).slice(0, 10);
    expect(a).toEqual(b);
  });

  it('tolère les petites fautes de frappe', () => {
    const exact = new Set(engine.search('pluralisme').map((h) => h.id));
    const typo = engine.search('pluralisem').map((h) => h.id);
    expect(typo.length).toBeGreaterThan(0);
    expect(typo.filter((id) => exact.has(id)).length).toBeGreaterThan(typo.length / 2);
  });

  it('élargit prudemment par termes voisins et l\'annonce', () => {
    expect(engine.expansion('pluralisme des médias')).toEqual(expect.arrayContaining(['audiovisuel']));
    expect(engine.expansion('xylophone')).toEqual([]);
  });

  it('ajoute des pétitions rapprochées, signalées comme telles', () => {
    const hits = engine.search('loi duplomb');
    const neighbours = hits.filter((h) => h.kind === 'voisine');
    for (const hit of neighbours) {
      expect(hit.via).toBeTruthy();
      expect(core.adjacency.get(hit.via as string)?.some((n) => n.id === hit.id)).toBe(true);
    }
  });

  it('renvoie une liste vide pour une requête sans mot utile', () => {
    expect(engine.search('')).toEqual([]);
    expect(engine.search('le la les')).toEqual([]);
  });
});
