import type { Core } from './data';
import { fileDate } from './format';
import { depositWave, topOfDossier, type DepositWave } from './ranking';
import type { Dossier, Petition } from './types';

/** Choix éditorial : un sujet, deux demandes opposées. Les chiffres viennent toujours du catalogue. */
const DUELS = [
  { subject: 'Loi Duplomb', a: '3014', aLabel: 'Contre la loi', b: '3106', bLabel: 'Pour la loi' },
  { subject: 'CNews', a: '5820', aLabel: 'Supprimer la chaîne', b: '7662', bLabel: 'Soutenir la chaîne' },
  { subject: 'Légitime défense', a: '6334', aLabel: 'Contre la présomption', b: '6449', bLabel: 'Pour la présomption' },
];

export interface Duel {
  subject: string;
  a: Petition;
  aLabel: string;
  b: Petition;
  bLabel: string;
  ratio: number;
  share: number;
}

/** La plus signée de chaque côté. Un duel dont une pétition manque au catalogue, ou dont l'ordre s'inverse, n'est pas affiché. */
export function duels(core: Core): Duel[] {
  return DUELS.flatMap(({ subject, a, aLabel, b, bLabel }) => {
    const pa = core.byId.get(a);
    const pb = core.byId.get(b);
    if (!pa?.votes || !pb?.votes || pa.votes < pb.votes) return [];
    return [{ subject, a: pa, aLabel, b: pb, bLabel, ratio: Math.round(pa.votes / pb.votes), share: pb.votes / pa.votes }];
  });
}

export function concentration(core: Core, top = 50): { total: number; share: number } {
  const votes = core.petitions.map((p) => p.votes ?? 0).sort((a, b) => b - a);
  const total = votes.reduce((sum, v) => sum + v, 0);
  return { total, share: total ? votes.slice(0, top).reduce((sum, v) => sum + v, 0) / total : 0 };
}

export interface Week {
  from: string;
  count: number;
  rising: Petition | null;
  wave: { dossier: Dossier; wave: DepositWave; top: Petition | null } | null;
}

/** Les sept jours qui précèdent le fichier. */
export function lastWeek(core: Core): Week {
  const from = new Date(Date.parse(fileDate(core.meta.source)) - 7 * 86_400_000).toISOString().slice(0, 10);
  const fresh = core.petitions.filter((p) => (p.published ?? '') >= from);
  const rising = fresh.reduce<Petition | null>((best, p) => ((p.votes ?? -1) > (best?.votes ?? -1) ? p : best), null);
  let found: Week['wave'] = null;
  for (const dossier of core.dossiers) {
    const wave = depositWave(dossier, core.byId);
    if (wave && wave.to >= from && wave.count > (found?.wave.count ?? 0)) found = { dossier, wave, top: topOfDossier(dossier, core.byId) };
  }
  return { from, count: fresh.length, rising, wave: found };
}
