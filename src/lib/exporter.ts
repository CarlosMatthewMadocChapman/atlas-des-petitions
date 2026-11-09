import { officialUrl } from './data';
import type { FilterState } from './filters';
import type { Meta, Petition } from './types';

const COLUMNS = [
  'identifiant', 'titre', 'extrait', 'date_publication', 'soutiens', 'statut', 'commission', 'themes', 'dossier', 'url_officielle',
] as const;

function record(p: Petition, meta: Meta) {
  return {
    identifiant: p.id, titre: p.title, extrait: p.excerpt, date_publication: p.published ?? '',
    soutiens: p.votes ?? '', statut: p.status, commission: p.commission ?? '', themes: p.themes.join(', '),
    dossier: p.dossier, url_officielle: officialUrl(p, meta),
  };
}

function cell(value: string | number): string {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV en UTF-8 avec BOM et séparateur « ; » : s'ouvre correctement dans les tableurs francophones. */
export function toCsv(items: Petition[], meta: Meta): string {
  const rows = items.map((p) => {
    const r = record(p, meta);
    return COLUMNS.map((c) => cell(r[c])).join(';');
  });
  return '﻿' + [COLUMNS.join(';'), ...rows].join('\r\n') + '\r\n';
}

export function toJson(items: Petition[], meta: Meta, filters: FilterState): string {
  return JSON.stringify(
    {
      source: {
        jeu_de_donnees: meta.dataset_page,
        ressource: meta.source.resource_title,
        mise_a_jour_du_fichier: meta.source.file_date ?? meta.source.resource_last_modified,
        recuperation: meta.source.retrieved_at,
        licence: 'Licence Ouverte / Open Licence 2.0',
        attribution: "Données : Assemblée nationale, via data.gouv.fr. Expérimentation indépendante, sans affiliation institutionnelle.",
        version_moteur: meta.algorithm.version,
      },
      criteres: filters,
      total: items.length,
      petitions: items.map((p) => record(p, meta)),
    },
    null,
    2,
  );
}

export function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
