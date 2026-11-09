import { describe, expect, it } from 'vitest';
import { condensedGraph, demandGroups, withYou } from './condense';
import { isMatchable, matchText, sharedWords, wordCount } from './match';
import { realSearch } from './testdata';

describe('« Écrivez votre pétition » sur le vrai catalogue', async () => {
  const { core, engine, stopwords } = await realSearch();
  const run = (text: string) => matchText(core, engine, stopwords, text);

  it('retrouve la constellation du vote blanc', () => {
    const r = run('Je demande que le vote blanc soit reconnu comme un suffrage exprimé lors de toutes les élections.');
    expect(r.hits.length).toBeGreaterThan(5);
    expect(r.hits.slice(0, 5).every((h) => /blanc/i.test(h.petition.title + h.petition.excerpt))).toBe(true);
    expect(r.closeCount).toBeGreaterThanOrEqual(3);
    expect(r.dossier).not.toBeNull();
    expect(core.dossierById.get(r.dossier!.id)?.terms.join(' ')).toMatch(/blanc/);
  });

  it('retrouve les pétitions sur les néonicotinoïdes malgré une autre formulation', () => {
    const r = run("Il faut interdire les pesticides néonicotinoïdes pour protéger les abeilles et les agriculteurs.");
    const titles = r.hits.slice(0, 6).map((h) => h.petition.title.toLowerCase()).join(' | ');
    expect(titles).toMatch(/néonicotino|acétamipride|pesticide/);
    expect(r.themes.map((t) => t.id)).toContain('agriculture');
  });

  it('indique les mots de l\'utilisateur qui se retrouvent dans la pétition', () => {
    const r = run('Je veux la gratuité des transports en commun dans toutes les villes.');
    const top = r.hits[0];
    expect(top.shared.length).toBeGreaterThan(0);
    expect(top.shared.every((w) => 'je veux la gratuité des transports en commun dans toutes les villes.'.includes(w))).toBe(true);
    expect(sharedWords('gratuité transports', 'Pour la gratuité des transports', stopwords)).toEqual(['gratuité', 'transports']);
  });

  it('ne force aucun résultat sur un texte sans rapport avec le catalogue', () => {
    const r = run('xylophone zéphyr quantique');
    expect(r.hits.length).toBe(0);
    expect(r.closeCount).toBe(0);
  });

  it('exige quelques mots avant de chercher', () => {
    expect(wordCount('Bonjour à tous')).toBe(3);
    expect(isMatchable('vote blanc')).toBe(false);
    expect(isMatchable('vote blanc reconnu')).toBe(true);
  });

  it('est déterministe', () => {
    const t = 'Pour que les loyers soient encadrés dans les grandes villes';
    expect(run(t).hits.map((h) => h.petition.id)).toEqual(run(t).hits.map((h) => h.petition.id));
  });
});

describe('constellations condensées', async () => {
  const { core } = await realSearch();

  it('regroupe les textes très proches en une seule demande', () => {
    const big = core.dossiers.find((d) => d.size >= 15 && demandGroups(core, d).length < d.size);
    expect(big).toBeDefined();
    const groups = demandGroups(core, big!);
    expect(groups.reduce((n, g) => n + g.members.length, 0)).toBe(big!.size);
    expect(new Set(groups.flatMap((g) => g.members)).size).toBe(big!.size);
    for (const g of groups) expect(g.members[0]).toBe(g.rep);
    for (let i = 1; i < groups.length; i++) expect(groups[i - 1].members.length).toBeGreaterThanOrEqual(groups[i].members.length);
  });

  it('limite la carte et ne garde que de vrais liens', () => {
    const d = core.dossiers.find((x) => x.size >= 15) ?? core.dossiers[0];
    const groups = demandGroups(core, d);
    const graph = condensedGraph(core, d, groups, 8);
    expect(graph.nodes.length).toBeLessThanOrEqual(8);
    const known = new Set(core.relations.map((r) => `${r.a}-${r.b}`));
    for (const l of graph.links) expect(known.has(`${l.relation.a}-${l.relation.b}`)).toBe(true);
  });

  it('ajoute le point « Votre texte » relié aux pétitions proches', () => {
    const d = core.dossiers[0];
    const graph = condensedGraph(core, d, demandGroups(core, d), 8);
    const matches = graph.nodes.slice(0, 2).map((n) => ({ id: n.id, close: true }));
    const out = withYou(graph, matches);
    expect(out.nodes.some((n) => n.id === 'vous')).toBe(true);
    expect(out.links.filter((l) => l.a === 'vous')).toHaveLength(2);
    expect(withYou(graph, [{ id: 'inconnu', close: false }])).toBe(graph);
  });
});
