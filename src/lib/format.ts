import type { RelationType, Status } from './types';

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const NUMBER = new Intl.NumberFormat('fr-FR');

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'non renseignée';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? 'non renseignée' : DATE.format(d);
}

/** Date du fichier de données : la date propre au fichier, sinon (anciens catalogues) la métadonnée data.gouv.fr. */
export function fileDate(source: { file_date?: string; resource_last_modified: string }): string {
  return source.file_date ?? source.resource_last_modified;
}

export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '—' : MONTH.format(d);
}

export function formatNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? 'non renseigné' : NUMBER.format(n);
}

export function formatVotes(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'soutiens non renseignés';
  return n <= 1 ? `${NUMBER.format(n)} soutien` : `${NUMBER.format(n)} soutiens`;
}

export const STATUS_LABEL: Record<Status, string> = {
  ouverte: 'Ouverte',
  archivee: 'Archivée',
  classee: 'Classée',
  expiree: 'Expirée',
  inconnu: 'Statut inconnu',
};

export const STATUS_HELP: Record<Status, string> = {
  ouverte: 'La pétition est encore ouverte aux soutiens sur le site officiel.',
  archivee: 'La période de soutien est terminée.',
  classee: 'Classée par la commission compétente (voir la décision publiée).',
  expiree: 'Le délai de collecte est écoulé sans atteindre le seuil requis.',
  inconnu: 'Le statut du jeu de données n\'est pas reconnu.',
};

export const RELATION_LABEL: Record<RelationType, string> = {
  proche: 'Textes très proches',
  complementaire: 'Propositions complémentaires',
  comparaison: 'Pistes de comparaison',
  thematique: 'Même dossier thématique',
};

export const RELATION_SHORT: Record<RelationType, string> = {
  proche: 'Texte proche',
  complementaire: 'Complémentaire',
  comparaison: 'À comparer',
  thematique: 'Thématique',
};

export const RELATION_HELP: Record<RelationType, string> = {
  proche:
    'Rapprochement fort à examiner : titres et descriptions presque identiques. Les demandes peuvent malgré tout différer.',
  complementaire:
    'Même sujet, vocabulaire commun, mais des demandes ou des solutions qui peuvent être distinctes.',
  comparaison:
    'Même sujet et indices explicites d\'orientations différentes (par exemple « interdire » et « autoriser »). Une piste, pas un verdict.',
  thematique:
    'Pétitions du même dossier dont les textes partagent un vocabulaire, sans que leurs demandes soient forcément liées.',
};

export function plural(n: number, one: string, many: string): string {
  return `${NUMBER.format(n)} ${n > 1 ? many : one}`;
}

export function shortCommission(name: string | null): string {
  if (!name) return 'Commission non renseignée';
  return name
    .replace(/^Commission (des|du|de la|de l'|de) ?/i, '')
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}
