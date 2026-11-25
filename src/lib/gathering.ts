import type { Core } from './data';
import type { Dossier, Petition } from './types';

/**
 * Rejoindre plutôt que disperser : lecture des constellations (groupes de pétitions proches).
 * Les signatures de pétitions différentes ne sont jamais additionnées à l'écran : une même personne peut en avoir
 * signé plusieurs. La part de la plus signée sert seulement à trier les groupes.
 */
export interface Gathering {
  dossier: Dossier;
  members: Petition[];
  top: Petition;
  /** La plus signée encore ouverte : celle qu'on peut rejoindre aujourd'hui. */
  join: Petition | null;
  /** Part de la plus signée dans le groupe (tri uniquement). */
  topShare: number;
  under100: number;
}

export function gatherings(core: Core, minSize = 4): Gathering[] {
  const out: Gathering[] = [];
  for (const dossier of core.dossiers) {
    if (dossier.size < minSize) continue;
    const members = dossier.members.map((id) => core.byId.get(id)).filter((p): p is Petition => Boolean(p));
    if (members.length < minSize) continue;
    members.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    const sum = members.reduce((s, p) => s + (p.votes ?? 0), 0);
    const top = members[0];
    out.push({
      dossier,
      members,
      top,
      join: members.find((p) => p.status === 'ouverte') ?? null,
      topShare: sum ? (top.votes ?? 0) / sum : 0,
      under100: members.filter((p) => (p.votes ?? 0) < 100).length,
    });
  }
  return out;
}

/** Demandes éparpillées : beaucoup de pétitions, aucune ne rassemble la moitié des soutiens du groupe. */
export function scattered(all: Gathering[], limit = 6): Gathering[] {
  return all.filter((g) => g.topShare < 0.5).sort((a, b) => b.members.length - a.members.length).slice(0, limit);
}

/** Demandes rassemblées : une pétition a fédéré l'essentiel des soutiens. */
export function rallied(all: Gathering[], limit = 4): Gathering[] {
  return all.filter((g) => g.topShare >= 0.85 && g.members.length >= 5).sort((a, b) => b.members.length - a.members.length).slice(0, limit);
}

/** Idées singulières : peu de soutiens et aucune pétition proche. Elles ne doublonnent rien. */
export function singular(core: Core, max = 100): Petition[] {
  return core.petitions.filter((p) => p.votes !== null && p.votes < max && !(core.adjacency.get(p.id)?.length));
}
