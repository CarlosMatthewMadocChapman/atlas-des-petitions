import { mulberry32 } from './filters';
import type { Petition } from './types';

/**
 * « Surprenez-moi » : une sélection variée tirée au sort (graine partageable), en alternant
 * les familles thématiques et en évitant deux pétitions du même dossier.
 */
export function surprise(pool: Petition[], seed: number, count = 9): Petition[] {
  const random = mulberry32(seed);
  const shuffle = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const groups = new Map<string, Petition[]>();
  for (const p of shuffle(pool)) {
    const key = p.themes[0] ?? 'autre';
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  const order = shuffle([...groups.keys()]);
  const picked: Petition[] = [];
  const usedDossiers = new Set<string>();
  let progressed = true;
  while (picked.length < count && progressed) {
    progressed = false;
    for (const key of order) {
      const list = groups.get(key) ?? [];
      while (list.length) {
        const candidate = list.shift() as Petition;
        if (candidate.dossier && usedDossiers.has(candidate.dossier)) continue;
        if (candidate.dossier) usedDossiers.add(candidate.dossier);
        picked.push(candidate);
        progressed = true;
        break;
      }
      if (picked.length >= count) break;
    }
  }
  return picked;
}
