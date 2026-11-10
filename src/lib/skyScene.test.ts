import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCore, type Core } from './data';
import { COMMON_STARS, MAX_STARS, sceneFor } from './skyScene';

const fetcher = async (name: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public/data', name), 'utf8'));
const core: Core = await loadCore(fetcher);

describe('scène du ciel', () => {
  it('montre les pétitions de la constellation visitée, à la taille de leurs signatures', () => {
    const dossier = [...core.dossiers].sort((a, b) => b.size - a.size)[0];
    const scene = sceneFor(core, `/constellations/${dossier.id}`);
    expect(new Set(scene.stars.map((s) => s.id))).toEqual(new Set(dossier.members.slice(0, MAX_STARS)));
    expect(Math.max(...scene.stars.map((s) => s.size))).toBe(1);
  });

  it('allume la pétition ouverte dans sa constellation', () => {
    const dossier = core.dossiers[0];
    const scene = sceneFor(core, `/petition/${dossier.members[0]}`);
    expect(scene.stars.filter((s) => s.focus).map((s) => s.id)).toEqual([dossier.members[0]]);
  });

  it('garde le centre libre dans le ciel commun et ne dépasse jamais le nombre d\'astres', () => {
    const scene = sceneFor(core, '/');
    expect(scene.stars).toHaveLength(COMMON_STARS);
    expect(scene.level).toBeLessThan(sceneFor(core, `/constellations/${core.dossiers[0].id}`).level);
    for (const star of scene.stars) expect(Math.hypot(star.x, star.y)).toBeGreaterThan(0.4);
    expect(scene.stars.find((s) => s.id === '3014')?.size).toBe(1);
  });

  it('ne relie que des astres présents', () => {
    const scene = sceneFor(core, '/recherche');
    const ids = new Set(scene.stars.map((s) => s.id));
    for (const link of scene.links) expect(ids.has(link.a) && ids.has(link.b)).toBe(true);
  });

  it('retombe sur le ciel commun pour une constellation inconnue', () => {
    expect(sceneFor(core, '/constellations/inconnue').stars).toHaveLength(COMMON_STARS);
  });
});
