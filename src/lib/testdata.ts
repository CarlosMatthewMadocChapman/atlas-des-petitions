import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCore, type JsonFetcher, type RawSearch } from './data';
import { createSearch } from './search';

/** Lit les fichiers réellement produits par le pipeline (aucune donnée fictive dans les tests d'intégration). */
export const fileFetcher: JsonFetcher = async (path) =>
  JSON.parse(readFileSync(resolve(__dirname, '../../public/data', path), 'utf-8'));

let core: ReturnType<typeof loadCore> | null = null;
export const realCore = () => (core ??= loadCore(fileFetcher));

export async function realSearch() {
  const [c, raw] = await Promise.all([realCore(), fileFetcher('search.json') as Promise<RawSearch>]);
  return { core: c, engine: createSearch(raw, (id) => c.adjacency.get(id) ?? []), stopwords: new Set(raw.stopwords) };
}
