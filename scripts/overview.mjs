// Vue d'ensemble : les trois portes de l'Atlas (Assemblée nationale, Sénat, Initiative citoyenne européenne)
// comparées côte à côte, sans jamais mélanger leurs données ni additionner leurs signatures.
// Tout est calculé à la construction, à partir des catalogues publiés de chaque espace.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Paliers de signatures, identiques pour les trois sources. */
export const BUCKETS = [
  { label: 'moins de 100', max: 100 },
  { label: '100 à 999', max: 1_000 },
  { label: '1 000 à 9 999', max: 10_000 },
  { label: '10 000 à 99 999', max: 100_000 },
  { label: '100 000 et plus', max: Infinity },
];

/** Les trois portes, et ce que prévoit chaque institution au-delà du seuil. */
export const DOORS = [
  {
    id: 'an', dir: 'public/data', base: '', name: 'Assemblée nationale', short: 'Assemblée',
    threshold: 100_000,
    rule: 'À 100 000 signatures, la pétition est mise en ligne sur le site de l’Assemblée nationale. Au-delà de 500 000, venues d’au moins 30 départements ou collectivités d’outre-mer, un débat en séance publique devient possible.',
    ruleSource: 'https://petitions.assemblee-nationale.fr/pages/parcours_petition',
  },
  {
    id: 'senat', dir: 'senat/public/data', base: 'senat/', name: 'Sénat', short: 'Sénat',
    threshold: 100_000,
    rule: 'À 100 000 signatures en six mois, la Conférence des présidents du Sénat examine la pétition et décide des suites à lui donner.',
    ruleSource: 'https://petitions.senat.fr/pages/suites',
  },
  {
    id: 'europe', dir: 'europe/public/data', base: 'europe/', name: 'Initiative citoyenne européenne', short: 'Europe',
    threshold: 1_000_000,
    rule: 'Un million de signatures en douze mois, avec un minimum atteint dans au moins sept pays de l’Union : la Commission européenne est alors tenue de répondre publiquement.',
    ruleSource: 'https://citizens-initiative.europa.eu/how-it-works_fr',
  },
];

const median = (sorted) => (sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0);

/** Calcule la vue d'ensemble à partir des dossiers de données de chaque espace (relatifs à `root`). */
export async function computeOverview(root) {
  const read = async (dir, name) => JSON.parse(await readFile(path.join(root, dir, name), 'utf8'));
  const taxonomy = await read('public/data', 'taxonomy.json');
  const doors = [];
  for (const door of DOORS) {
    let catalog, meta;
    try {
      [catalog, meta] = await Promise.all([read(door.dir, 'catalog.json'), read(door.dir, 'meta.json')]);
    } catch {
      continue; // espace pas encore construit
    }
    const all = catalog.rows.map((r) => ({ id: r[0], title: r[1], published: r[3] || null, votes: r[4] ?? 0, status: r[5], themes: r[8] || [] }));
    // Le registre européen ne publie aucun total pour les initiatives retirées ou closes sans décompte : elles
    // comptent dans les volumes, pas dans les statistiques de signatures (un 0 n'y est pas une mesure).
    const withoutTotal = door.id === 'europe' ? all.filter((r) => !r.votes).length : 0;
    const rows = door.id === 'europe' ? all.filter((r) => r.votes) : all;
    const votes = rows.map((r) => r.votes).sort((a, b) => a - b);
    const total = votes.reduce((sum, v) => sum + v, 0);
    const onePercent = Math.max(1, Math.round(rows.length / 100));
    const top = votes.slice(-onePercent).reduce((sum, v) => sum + v, 0);
    const buckets = BUCKETS.map(() => 0);
    for (const v of votes) buckets[BUCKETS.findIndex((b) => v < b.max)]++;
    const years = {};
    for (const r of all) if (r.published) years[r.published.slice(0, 4)] = (years[r.published.slice(0, 4)] ?? 0) + 1;
    const dates = all.map((r) => r.published).filter(Boolean).sort();
    const themes = {};
    for (const t of taxonomy) {
      const members = all.filter((r) => r.themes.includes(t.id));
      const best = members.reduce((a, b) => (b.votes > (a?.votes ?? -1) ? b : a), null);
      themes[t.id] = { count: members.length, best: best && { id: best.id, title: best.title, votes: best.votes } };
    }
    doors.push({
      ...door,
      count: all.length,
      measured: rows.length,
      withoutTotal,
      total,
      median: median(votes),
      under100: buckets[0],
      buckets,
      onePercent,
      topShare: total ? top / total : 0,
      overThreshold: votes.filter((v) => v >= door.threshold).length,
      over100k: votes.filter((v) => v >= 100_000).length,
      answered: all.filter((r) => r.status === 'repondue' || r.status === 'seuil').length,
      years,
      first: dates[0] ?? null,
      fileDate: meta.source?.file_date ?? meta.source?.resource_last_modified ?? null,
      themes,
    });
  }
  return { doors, taxonomy };
}
