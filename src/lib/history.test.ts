import { describe, expect, it } from 'vitest';
import { chartGeometry, loadReadings, weeklyGain, type Reading } from './history';

const r = (date: string, votes: number): Reading => ({ date, votes, source: 'data.gouv.fr' });

describe('courbe des signatures', () => {
  it("s'interrompt au-delà de quinze jours sans relevé, sans rien inventer", () => {
    const g = chartGeometry([r('2026-01-01', 100), r('2026-01-08', 200), r('2026-03-01', 900), r('2026-03-08', 950)], 600, 200);
    expect(g.segments.map((s) => s.length)).toEqual([2, 2]);
    expect(g.points).toHaveLength(4);
  });

  it('trace les seuils seulement quand la pétition en approche', () => {
    expect(chartGeometry([r('2026-01-01', 1000), r('2026-01-08', 2000)], 600, 200).thresholds).toEqual([]);
    const near = chartGeometry([r('2026-01-01', 60_000), r('2026-01-08', 80_000)], 600, 200);
    expect(near.thresholds.map((t) => t.value)).toEqual([100_000]);
    expect(near.max).toBeGreaterThan(100_000);
  });

  it('reste dans son cadre', () => {
    const g = chartGeometry([r('2025-07-30', 2_061_910), r('2026-11-18', 2_131_368)], 640, 220);
    for (const p of g.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(640);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(220);
    }
    expect(g.ticks.length).toBeGreaterThan(0);
    expect(g.ticks.length).toBeLessThanOrEqual(6);
  });

  it('mesure la hausse sur au moins six jours', () => {
    expect(weeklyGain([r('2026-11-09', 100), r('2026-11-16', 300), r('2026-11-18', 340)])).toEqual({ gain: 240, since: '2026-11-09' });
    expect(weeklyGain([r('2026-11-16', 300)])).toBeNull();
  });

  it("lit une tranche d'historique et ignore les dates sans relevé", async () => {
    const fetcher = async () => ({ dates: ['2026-01-01', '2026-01-08'], sources: ['data.gouv.fr', 'site officiel'], s: { '205': [null, 500] } });
    expect(await loadReadings('205', 200, fetcher)).toEqual([{ date: '2026-01-08', votes: 500, source: 'site officiel' }]);
    expect(await loadReadings('206', 200, fetcher)).toEqual([]);
  });
});
