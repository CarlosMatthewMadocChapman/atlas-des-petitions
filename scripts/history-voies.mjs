// L'histoire des trois voies : d'où vient chacune, ce qu'elle promet, ce qu'il est advenu des pétitions qui ont
// franchi son seuil. Les faits institutionnels viennent de pages officielles (citées) ; les suites, des données.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Repères datés, chacun avec sa source. */
export const MILESTONES = [
  { date: '2012-04-01', door: 'europe', label: 'L’Initiative citoyenne européenne entre en vigueur (règlement 211/2011)', source: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32011R0211' },
  { date: '2020-01-01', door: 'europe', label: 'Nouvelles règles de l’ICE (règlement 2019/788)', source: 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32019R0788' },
  { date: '2020-01-23', door: 'senat', label: 'Le Sénat ouvre sa plateforme e-pétitions', source: 'https://www.vie-publique.fr/en-bref/272956-le-senat-ouvre-sa-plateforme-de-petitions-citoyennes-en-ligne' },
  { date: '2020-10-01', door: 'an', label: 'L’Assemblée nationale ouvre sa plateforme de pétitions en ligne', source: 'https://www.vie-publique.fr/en-bref/276461-assemblee-nationale-une-plateforme-en-ligne-de-petitions-citoyennes' },
];

/** Pétitions auxquelles le Sénat a décidé de donner suite (liste officielle, lue le 25 novembre 2026). */
export const SENATE_FOLLOWED = ['416', '742', '917', '947', '1012', '1227', '1699'];
export const SENATE_FOLLOWED_SOURCE = 'https://petitions.senat.fr/pages/suites';

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function computeHistory(root) {
  const out = { an: [], senat: [], europe: [] };
  // Assemblée : les pétitions au-delà de 100 000 signatures, avec leur statut et la décision publiée.
  try {
    const dir = path.join(root, 'public/data');
    const [catalog, meta] = await Promise.all([readJson(path.join(dir, 'catalog.json')), readJson(path.join(dir, 'meta.json'))]);
    const shards = new Map();
    for (const r of catalog.rows.filter((row) => (row[4] ?? 0) >= 100_000).sort((a, b) => b[4] - a[4])) {
      const shard = Math.floor(Number(r[0]) / meta.detail_shard);
      if (!shards.has(shard)) shards.set(shard, await readJson(path.join(dir, 'details', `${shard}.json`)).catch(() => ({})));
      const detail = shards.get(shard)[r[0]] ?? {};
      out.an.push({ id: r[0], title: r[1], published: r[3], votes: r[4], status: r[5], decision: detail.x ?? null, url: detail.u ?? null });
    }
  } catch { /* espace absent */ }
  // Sénat : la liste officielle des suites, avec les signatures du fichier.
  try {
    const catalog = await readJson(path.join(root, 'senat/public/data/catalog.json'));
    const byId = new Map(catalog.rows.map((r) => [r[0], r]));
    for (const id of SENATE_FOLLOWED) {
      const r = byId.get(id);
      out.senat.push({ id, title: r?.[1] ?? `Pétition n° ${id}`, votes: r?.[4] ?? null, published: r?.[3] ?? null, url: `https://petitions.senat.fr/initiatives/i-${id}` });
    }
  } catch { /* espace absent */ }
  // Europe : les initiatives auxquelles la Commission a répondu, avec la date et le lien de la réponse.
  try {
    const dir = path.join(root, 'europe/public/data');
    const [catalog, extra] = await Promise.all([readJson(path.join(dir, 'catalog.json')), readJson(path.join(dir, 'extra.json'))]);
    for (const r of catalog.rows.filter((row) => row[5] === 'repondue')) {
      const x = extra[r[0]] ?? {};
      out.europe.push({ id: r[0], title: r[1], votes: r[4], regnum: x.regnum ?? null, answerDate: x.answer?.date ?? null, answerUrl: x.answer?.url ?? null, countries: x.countries?.length ?? 0 });
    }
    out.europe.sort((a, b) => String(b.answerDate).localeCompare(String(a.answerDate)));
  } catch { /* espace absent */ }
  return out;
}
