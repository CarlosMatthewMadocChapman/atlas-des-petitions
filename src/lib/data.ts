import type {
  Dossier, Meta, Neighbor, Petition, PetitionDetail, ProvenanceEntry, Relation, RelationType, Stats, Status, Theme,
} from './types';

type Row = [string, string, string, string | null, number | null, Status, number, string, string[], string, string?];

export interface RawCatalog {
  fields: string[];
  commissions: string[];
  rows: Row[];
}

export interface RawRelations {
  algorithm: string;
  types: Record<string, RelationType>;
  edges: [string, string, string, number, string[], string[], string, string, string?, number?][];
}

export interface RawSearch {
  docs: [string, string, string][];
  stopwords: string[];
  /** Groupes de termes voisins : paires [radical, mot affiché]. */
  groups: [string, string][][];
}

export interface Core {
  petitions: Petition[];
  byId: Map<string, Petition>;
  commissions: string[];
  meta: Meta;
  stats: Stats;
  taxonomy: Theme[];
  themeById: Map<string, Theme>;
  dossiers: Dossier[];
  dossierById: Map<string, Dossier>;
  relations: Relation[];
  adjacency: Map<string, Neighbor[]>;
  provenance: ProvenanceEntry[];
}

export type JsonFetcher = (path: string) => Promise<unknown>;

export function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}data/${path}`;
}

export const fetchJson: JsonFetcher = async (path) => {
  const response = await fetch(dataUrl(path));
  if (!response.ok) throw new Error(`Fichier de données indisponible : ${path} (HTTP ${response.status})`);
  return response.json();
};

export function parseRelations(raw: RawRelations): Relation[] {
  return raw.edges.map(([a, b, code, score, terms, cues, human, note, src, sem]) => ({
    a, b, type: raw.types[code], score: score / 1000, terms, cues, human: human as Relation['human'], note,
    origin: src === 's' ? 'semantique' : 'lexical', sem: src === 's' && sem ? sem / 1000 : null,
  }));
}

export function buildAdjacency(relations: Relation[]): Map<string, Neighbor[]> {
  const adjacency = new Map<string, Neighbor[]>();
  const push = (id: string, neighbor: Neighbor) => {
    const list = adjacency.get(id);
    if (list) list.push(neighbor);
    else adjacency.set(id, [neighbor]);
  };
  for (const relation of relations) {
    push(relation.a, { id: relation.b, relation });
    push(relation.b, { id: relation.a, relation });
  }
  const rank: Record<RelationType, number> = { proche: 0, comparaison: 1, complementaire: 2, thematique: 3 };
  for (const list of adjacency.values()) {
    list.sort((x, y) => rank[x.relation.type] - rank[y.relation.type] || y.relation.score - x.relation.score);
  }
  return adjacency;
}

export function toPetitions(raw: RawCatalog): Petition[] {
  return raw.rows.map((r) => ({
    id: r[0], title: r[1], excerpt: r[2], published: r[3], votes: r[4], status: r[5],
    commission: r[6] >= 0 ? raw.commissions[r[6]] : null, legislature: r[7], themes: r[8], dossier: r[9], readOn: r[10] || undefined,
  }));
}

export async function loadCore(fetcher: JsonFetcher = fetchJson): Promise<Core> {
  const [catalog, meta, stats, taxonomy, dossiers, relationsRaw, provenance] = (await Promise.all([
    fetcher('catalog.json'), fetcher('meta.json'), fetcher('stats.json'), fetcher('taxonomy.json'),
    fetcher('dossiers.json'), fetcher('relations.json'), fetcher('provenance.json').catch(() => []),
  ])) as [RawCatalog, Meta, Stats, Theme[], Dossier[], RawRelations, ProvenanceEntry[]];

  const petitions = toPetitions(catalog);
  const relations = parseRelations(relationsRaw);
  return {
    petitions,
    byId: new Map(petitions.map((p) => [p.id, p])),
    commissions: catalog.commissions,
    meta, stats, taxonomy,
    themeById: new Map(taxonomy.map((t) => [t.id, t])),
    dossiers,
    dossierById: new Map(dossiers.map((d) => [d.id, d])),
    relations,
    adjacency: buildAdjacency(relations),
    provenance,
  };
}

const shardCache = new Map<number, Promise<Record<string, { d: string; x: string | null; l: string | null; u: string }>>>();

export async function loadDetail(
  id: string, shardSize: number, fetcher: JsonFetcher = fetchJson,
): Promise<PetitionDetail | null> {
  const shard = Math.floor(Number(id) / shardSize);
  let promise = shardCache.get(shard);
  if (!promise) {
    promise = fetcher(`details/${shard}.json`) as Promise<Record<string, { d: string; x: string | null; l: string | null; u: string }>>;
    promise.catch(() => shardCache.delete(shard));
    shardCache.set(shard, promise);
  }
  const entry = (await promise)[id];
  return entry ? { description: entry.d, decision: entry.x, deadline: entry.l, url: entry.u } : null;
}

export function officialUrl(petition: Pick<Petition, 'id'>, meta: Meta): string {
  return meta.url_exceptions?.[petition.id] || `${meta.official_site}/i-${petition.id}`;
}
