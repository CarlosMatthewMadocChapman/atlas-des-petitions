import { describe, expect, it } from 'vitest';
import { buildAdjacency, officialUrl, parseRelations } from './data';
import { dossierGraph, egoGraph, groupNeighbors } from './graph';
import { distinctiveTerms, sharedSegments } from './compare';
import { toCsv, toJson } from './exporter';
import { EMPTY_FILTERS } from './filters';
import { surprise } from './diversify';
import { realCore, realSearch } from './testdata';

describe('catalogue réel produit par le pipeline', async () => {
  const core = await realCore();

  it('contient les pétitions du jeu de données, avec identifiants uniques', () => {
    expect(core.petitions.length).toBe(core.meta.counts.petitions);
    expect(core.petitions.length).toBeGreaterThan(4000);
    expect(new Set(core.petitions.map((p) => p.id)).size).toBe(core.petitions.length);
    expect(core.meta.source.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('chaque pétition a un lien vers le site officiel', () => {
    for (const p of core.petitions) {
      const url = officialUrl(p, core.meta);
      expect(url, p.id).toMatch(/^https:\/\/petitions\.assemblee-nationale\.fr\/initiatives\/i-\d+$/);
    }
  });

  it('toutes les relations pointent vers des pétitions existantes et ont un type', () => {
    for (const r of core.relations) {
      expect(core.byId.has(r.a) && core.byId.has(r.b)).toBe(true);
      expect(['proche', 'complementaire', 'comparaison', 'thematique']).toContain(r.type);
    }
  });

  it('chaque dossier a des membres, des positions, et une pétition centrale parmi eux', () => {
    for (const d of core.dossiers) {
      expect(d.members.length).toBe(d.size);
      expect(d.pos.length).toBe(d.size);
      expect(d.members).toContain(d.central);
      for (const m of d.members) expect(core.byId.get(m)?.dossier).toBe(d.id);
    }
  });

  it('les liens du graphe sont de vrais résultats calculés', () => {
    const dossier = core.dossiers[0];
    const graph = dossierGraph(core, dossier);
    const known = new Set(core.relations.map((r) => `${r.a}-${r.b}`));
    expect(graph.links.length).toBeGreaterThan(0);
    for (const l of graph.links) expect(known.has(`${l.a}-${l.b}`)).toBe(true);
    const ego = egoGraph(core, dossier.central);
    for (const l of ego.links) expect(known.has(`${l.a}-${l.b}`)).toBe(true);
  });

  it('classe les voisines par type', () => {
    const id = [...core.adjacency.keys()][0];
    const groups = groupNeighbors(core.adjacency.get(id) ?? []);
    expect(Object.values(groups).flat().length).toBe((core.adjacency.get(id) ?? []).length);
  });

  it('n\'additionne jamais les soutiens : aucun total n\'est exposé', () => {
    expect(JSON.stringify(core.stats)).not.toMatch(/total_votes|sum_votes/);
  });

  it('exporte en CSV (BOM, « ; », guillemets) et en JSON avec provenance', () => {
    const sample = core.petitions.slice(0, 3);
    const csv = toCsv([{ ...sample[0], title: 'Titre ; avec "guillemets"' }, ...sample.slice(1)], core.meta);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Titre ; avec ""guillemets"""');
    expect(csv.split('\r\n')).toHaveLength(5);
    const json = JSON.parse(toJson(sample, core.meta, EMPTY_FILTERS));
    expect(json.total).toBe(3);
    expect(json.source.licence).toMatch(/Licence Ouverte/);
    expect(json.petitions[0].url_officielle).toMatch(/^https:/);
  });

  it('« Surprenez-moi » est reproductible, varié et sans doublon de dossier', () => {
    const pool = core.petitions.filter((p) => p.votes !== null && p.votes < 50);
    const a = surprise(pool, 5, 9).map((p) => p.id);
    expect(surprise(pool, 5, 9).map((p) => p.id)).toEqual(a);
    expect(a).toHaveLength(9);
    const themes = new Set(a.map((id) => core.byId.get(id)?.themes[0] ?? 'autre'));
    expect(themes.size).toBeGreaterThanOrEqual(5);
    const dossiers = a.map((id) => core.byId.get(id)?.dossier).filter(Boolean);
    expect(new Set(dossiers).size).toBe(dossiers.length);
    for (const id of a) expect(core.byId.get(id)?.votes).toBeLessThan(50);
  });
});

describe('relations sémantiques', async () => {
  const core = await realCore();

  it('sont signalées comme telles et comptées dans le méta', () => {
    const semantic = core.relations.filter((r) => r.origin === 'semantique');
    expect(semantic.length).toBe(core.meta.counts.semantic_relations);
    expect(semantic.length).toBeGreaterThan(500);
    for (const r of semantic) {
      expect(r.sem).toBeGreaterThanOrEqual(core.meta.algorithm.thresholds.sem_similarity);
      expect(r.score).toBeGreaterThanOrEqual(core.meta.algorithm.thresholds.sem_min_lexical - 0.001);
      expect(['complementaire', 'comparaison']).toContain(r.type);
      expect(r.terms.length).toBeGreaterThan(0);
    }
    expect(core.relations.filter((r) => r.origin !== 'semantique').every((r) => r.sem === null)).toBe(true);
  });

  it('la provenance du modèle est publiée (nom, révision figée)', () => {
    expect(core.meta.algorithm.semantic?.model).toBe('intfloat/multilingual-e5-small');
    expect(core.meta.algorithm.semantic?.revision).toMatch(/^[0-9a-f]{40}$/);
  });

  it('une paire sémantique apparaît chez les deux pétitions', () => {
    const r = core.relations.find((x) => x.origin === 'semantique');
    expect(r).toBeDefined();
    expect(core.adjacency.get(r!.a)?.some((n) => n.id === r!.b)).toBe(true);
    expect(core.adjacency.get(r!.b)?.some((n) => n.id === r!.a)).toBe(true);
  });
});

describe('relations (unitaire)', () => {
  it('construit un voisinage symétrique, trié par type puis par indice', () => {
    const relations = parseRelations({
      algorithm: 'x', types: { p: 'proche', c: 'complementaire', o: 'comparaison', t: 'thematique' },
      edges: [['1', '2', 'c', 300, ['a'], [], '', ''], ['1', '3', 'p', 700, ['b'], [], '', ''], ['2', '3', 't', 200, [], [], '', '']],
    });
    const adjacency = buildAdjacency(relations);
    expect(adjacency.get('1')?.map((n) => n.id)).toEqual(['3', '2']);
    expect(adjacency.get('3')?.map((n) => n.id)).toEqual(['1', '2']);
    expect(relations[1].score).toBe(0.7);
  });
});

describe('comparaison', async () => {
  const { stopwords } = await realSearch();

  it('repère les passages communs d\'au moins six mots', () => {
    const a = 'Il faut retirer l\'autorisation de diffusion de cette chaîne. Le reste diffère complètement ici.';
    const b = 'Nous voulons retirer l\'autorisation de diffusion de cette chaîne, rien d\'autre à signaler.';
    const { segments, common } = sharedSegments([a, b]);
    expect(common.length).toBe(1);
    expect(common[0].toLowerCase()).toContain('retirer l\'autorisation de diffusion de cette chaîne');
    expect(segments[0].some((s) => s.shared)).toBe(true);
    expect(segments[0].map((s) => s.text).join('')).toBe(a);
  });

  it('ne signale rien quand les textes sont différents', () => {
    const { common } = sharedSegments(['Des pistes cyclables dans toutes les villes de France.', 'Réduire la taille des classes en maternelle.']);
    expect(common).toEqual([]);
  });

  it('isole les termes propres à chaque texte', () => {
    const [x, y] = distinctiveTerms(['cannabis légalisation marché noir santé', 'cannabis interdiction jeunesse prévention santé'], stopwords);
    expect(x).toContain('legalisation');
    expect(y).toContain('interdiction');
    expect(x).not.toContain('cannabis');
  });
});
