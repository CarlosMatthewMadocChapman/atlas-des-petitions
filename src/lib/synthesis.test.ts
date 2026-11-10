import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCore, type Core } from './data';
import { concentration, duels, lastWeek } from './synthesis';

const fetcher = async (name: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public/data', name), 'utf8'));
const core: Core = await loadCore(fetcher);

describe("synthèse de l'accueil", () => {
  it('compare la plus signée de chaque côté, et calcule le rapport', () => {
    const list = duels(core);
    expect(list.map((d) => d.subject)).toEqual(['Loi Duplomb', 'CNews', 'Légitime défense']);
    for (const d of list) {
      expect(d.a.votes).toBeGreaterThan(d.b.votes as number);
      expect(d.ratio).toBe(Math.round((d.a.votes as number) / (d.b.votes as number)));
    }
  });

  it('dit la part réelle des cinquante plus signées', () => {
    const { total, share } = concentration(core);
    expect(total).toBe(core.petitions.reduce((s, p) => s + (p.votes ?? 0), 0));
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(1);
  });

  it('résume les sept jours avant le fichier', () => {
    const week = lastWeek(core);
    expect(week.count).toBeGreaterThan(0);
    expect((week.rising?.published ?? '') >= week.from).toBe(true);
  });
});
