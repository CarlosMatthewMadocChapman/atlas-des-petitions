import { fetchJson, type JsonFetcher } from './data';

export interface Reading {
  date: string;
  votes: number;
  source: string;
}

interface Shard {
  dates: string[];
  sources: string[];
  s: Record<string, (number | null)[]>;
}

const cache = new Map<number, Promise<Shard | null>>();

/** Les relevés d'une pétition, dans l'ordre ; tableau vide si elle n'est pas suivie (moins de signatures que le seuil). */
export async function loadReadings(id: string, shardSize: number, fetcher: JsonFetcher = fetchJson): Promise<Reading[]> {
  const shard = Math.floor(Number(id) / shardSize);
  let promise = cache.get(shard);
  if (!promise) {
    promise = (fetcher(`history/${shard}.json`) as Promise<Shard>).catch(() => null);
    cache.set(shard, promise);
  }
  const data = await promise;
  const row = data?.s[id];
  if (!data || !row) return [];
  return row.flatMap((votes, i) => (votes === null ? [] : [{ date: data.dates[i], votes, source: data.sources[i] }]));
}

const DAY = 86_400_000;
/** Au-delà de cet écart entre deux relevés, la courbe s'interrompt : rien n'est supposé entre les deux. */
export const MAX_GAP_DAYS = 15;

export interface ChartGeometry {
  segments: { x: number; y: number }[][];
  points: { x: number; y: number; reading: Reading }[];
  max: number;
  thresholds: { value: number; y: number; label: string }[];
  ticks: { x: number; label: string }[];
}

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Géométrie de la courbe dans un cadre `width` × `height` (marges comprises). Pur, testé. */
export function chartGeometry(readings: Reading[], width: number, height: number, pad = { left: 8, right: 8, top: 12, bottom: 22 }, levels: number[] = [100_000, 500_000]): ChartGeometry {
  const times = readings.map((r) => Date.parse(r.date));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times, t0 + DAY);
  const peak = Math.max(...readings.map((r) => r.votes), 1);
  const thresholdValues = levels.filter((v) => peak >= v / 2);
  const max = Math.max(peak, ...thresholdValues) * 1.08;
  const x = (t: number) => pad.left + ((t - t0) / (t1 - t0)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom);

  const points = readings.map((reading, i) => ({ x: x(times[i]), y: y(reading.votes), reading }));
  const segments: { x: number; y: number }[][] = [];
  points.forEach((p, i) => {
    if (i === 0 || times[i] - times[i - 1] > MAX_GAP_DAYS * DAY) segments.push([]);
    segments[segments.length - 1].push({ x: p.x, y: p.y });
  });

  const ticks: ChartGeometry['ticks'] = [];
  const start = new Date(t0);
  for (let m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)); m.getTime() <= t1; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
    ticks.push({ x: x(m.getTime()), label: MONTH.format(m) });
  }
  const every = Math.max(1, Math.ceil(ticks.length / 5));
  return {
    segments,
    points,
    max,
    thresholds: thresholdValues.map((value) => ({ value, y: y(value), label: `${value.toLocaleString('fr-FR')} signatures` })),
    ticks: ticks.filter((_, i) => i % every === 0),
  };
}

/** Hausse depuis le relevé le plus récent datant d'au moins six jours. */
export function weeklyGain(readings: Reading[]): { gain: number; since: string } | null {
  const last = readings[readings.length - 1];
  if (!last) return null;
  const end = Date.parse(last.date);
  const earlier = readings.filter((r) => end - Date.parse(r.date) >= 6 * DAY).pop();
  return earlier ? { gain: last.votes - earlier.votes, since: earlier.date } : null;
}
