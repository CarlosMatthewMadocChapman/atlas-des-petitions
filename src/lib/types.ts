export type Status = 'ouverte' | 'archivee' | 'classee' | 'expiree' | 'inconnu';
export type RelationType = 'proche' | 'complementaire' | 'comparaison' | 'thematique';

export interface Petition {
  id: string;
  title: string;
  excerpt: string;
  published: string | null;
  votes: number | null;
  status: Status;
  commission: string | null;
  legislature: string;
  themes: string[];
  dossier: string;
  /** Absente du fichier public : date à laquelle le compteur a été lu sur le site officiel. */
  readOn?: string;
}

export interface PetitionDetail {
  description: string;
  decision: string | null;
  deadline: string | null;
  url: string;
}

export interface Theme {
  id: string;
  label: string;
  color: string;
  ink: string;
}

export interface Relation {
  a: string;
  b: string;
  type: RelationType;
  /** Score technique 0-1 : sert au classement, jamais à une valeur politique. */
  score: number;
  terms: string[];
  cues: string[];
  human: '' | 'confirmé' | 'corrigé' | 'ajouté';
  note: string;
  /** « semantique » : proposée par le modèle de langue et confirmée par le vocabulaire commun. */
  origin?: 'lexical' | 'semantique';
  /** Similarité de sens (0-1) pour une relation sémantique ; sert au classement, jamais à un jugement. */
  sem?: number | null;
}

export interface Dossier {
  id: string;
  label: string;
  terms: string[];
  size: number;
  cohesion: number;
  themes: string[];
  years: string[];
  central: string;
  members: string[];
  pos: [number, number][];
  relations: Partial<Record<RelationType, number>>;
}

export interface SourceInfo {
  dataset_id: string;
  dataset_title: string;
  dataset_last_update: string | null;
  license: string;
  resource_title: string;
  resource_url: string;
  /** Métadonnée data.gouv.fr : n'est pas renouvelée quand le fichier change à adresse constante. */
  resource_last_modified: string;
  /** Date du fichier lui-même (en-tête HTTP, titre de la ressource, ou récupération). Absente des anciens catalogues. */
  file_date?: string;
  file_date_origin?: 'en-tete-http' | 'titre-ressource' | 'recuperation' | 'copie-locale' | 'metadonnee-data-gouv';
  sha256: string;
  bytes: number;
  retrieved_at: string;
}

export interface Meta {
  schema: number;
  source: SourceInfo;
  dataset_page: string;
  official_site: string;
  counts: { petitions: number; relations: number; dossiers: number; in_dossiers: number; themed: number; semantic_relations?: number };
  detail_shard: number;
  url_exceptions: Record<string, string>;
  algorithm: {
    version: string;
    thresholds: Record<string, number>;
    min_dossier_cohesion: number;
    semantic?: { model: string; revision: string; max_length: number; text_chars: number } | null;
  };
  public_count: { count: number; observed_on: string; note?: string } | null;
  recovered?: { count: number; read_on: string } | null;
  warnings: string[];
}

export interface Stats {
  years: Record<string, number>;
  year_status: Record<string, Record<string, number>>;
  status: Record<string, number>;
  vote_buckets: { label: string; low: number; high: number | null; count: number }[];
  votes: Record<string, number>;
  commissions: Record<string, number>;
  themes: Record<string, number>;
  relations: Record<string, number>;
}

export interface ProvenanceEntry {
  retrieved_at: string;
  resource_last_modified: string;
  file_date?: string;
  sha256: string;
  petitions: number;
  algorithm: string;
}

export interface Neighbor {
  id: string;
  relation: Relation;
}
