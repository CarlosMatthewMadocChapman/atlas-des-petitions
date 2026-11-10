import type { Dossier, Petition } from './types';

/** La pétition la plus signée d'une constellation. */
export function topOfDossier(dossier: Dossier, byId: Map<string, Petition>): Petition | null {
  let top: Petition | null = null;
  for (const id of dossier.members) {
    const petition = byId.get(id);
    if (petition && (top === null || (petition.votes ?? -1) > (top.votes ?? -1))) top = petition;
  }
  return top;
}

/**
 * Classe les constellations par leur pétition la plus signée, jamais par leur nombre de pétitions : multiplier
 * les pétitions ne fait pas monter un sujet. On ne somme pas non plus les soutiens, une personne pouvant en signer plusieurs.
 */
export function rankDossiers(dossiers: Dossier[], byId: Map<string, Petition>): Dossier[] {
  const weight = (d: Dossier) => topOfDossier(d, byId)?.votes ?? -1;
  return [...dossiers].sort((a, b) => weight(b) - weight(a) || a.id.localeCompare(b.id));
}

export interface DepositWave {
  count: number;
  days: number;
  from: string;
  to: string;
  medianVotes: number;
}

const WAVE_DAYS = 3;
const WAVE_MIN = 10;
const WAVE_SHARE = 0.4;
const DAY_MS = 86_400_000;

/**
 * Le constat, sans interprétation : beaucoup de pétitions d'un même sujet déposées en quelques jours.
 * Le fichier ne dit pas qui les a déposées, ni si c'était concerté.
 */
export function depositWave(dossier: Dossier, byId: Map<string, Petition>): DepositWave | null {
  const items = dossier.members
    .map((id) => byId.get(id))
    .filter((p): p is Petition => Boolean(p?.published))
    .sort((a, b) => (a.published as string).localeCompare(b.published as string));
  let best: Petition[] = [];
  let start = 0;
  for (let end = 0; end < items.length; end++) {
    const limit = Date.parse(items[end].published as string) - (WAVE_DAYS - 1) * DAY_MS;
    while (Date.parse(items[start].published as string) < limit) start++;
    if (end - start + 1 > best.length) best = items.slice(start, end + 1);
  }
  if (best.length < WAVE_MIN || best.length < WAVE_SHARE * items.length) return null;
  const votes = best.map((p) => p.votes ?? 0).sort((a, b) => a - b);
  return {
    count: best.length, days: WAVE_DAYS,
    from: best[0].published as string, to: best[best.length - 1].published as string,
    medianVotes: votes[Math.floor(votes.length / 2)],
  };
}

export const openMostSigned = (petitions: Petition[], limit: number): Petition[] =>
  petitions.filter((p) => p.status === 'ouverte').sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1)).slice(0, limit);
