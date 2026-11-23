/**
 * La source dont cet Atlas explore les pétitions. Chaque source a son espace à part (/atlas/, /atlas/senat/,
 * /atlas/europe/), construit séparément : VITE_ATLAS_SOURCE est fixé au moment du build.
 */
export type ChamberId = 'an' | 'senat' | 'europe';

export interface Chamber {
  id: ChamberId;
  name: string;
  /** « de l'Assemblée nationale », « du Sénat » */
  of: string;
  /** « à l'Assemblée nationale », « au Sénat » */
  at: string;
  /** « avec l'Assemblée nationale » : l'institution dont l'Atlas est indépendant. */
  with: string;
  /** Ce que l'on explore : « Pétitions de l'Assemblée nationale », « Initiatives citoyennes européennes ». */
  corpus: string;
  /** Nom du site, pour les titres. */
  site: string;
  /** Où se trouvent les données, sous quelle licence. */
  publisher: string;
  licence: { label: string; url: string };
  /** Seuils officiels de signatures tracés sur les courbes. */
  thresholds: number[];
  /** Rattrapage des pétitions absentes du fichier et observatoire « Suite à donner » : propres à l'Assemblée. */
  recovery: boolean;
  suiteADonner: boolean;
  /** Le fichier donne une commission et une législature (Assemblée seulement). */
  commissions: boolean;
  examples: string[];
  placeholder: string;
}

const LO = { label: 'Licence Ouverte 2.0', url: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/' };

const CHAMBERS: Record<ChamberId, Chamber> = {
  an: {
    id: 'an', name: 'Assemblée nationale', of: "de l'Assemblée nationale", at: "à l'Assemblée nationale", with: "l'Assemblée nationale",
    corpus: "Pétitions de l'Assemblée nationale", site: "L'Atlas des pétitions", publisher: 'data.gouv.fr', licence: LO,
    thresholds: [100_000, 500_000], recovery: true, suiteADonner: true, commissions: true,
    examples: ['CNews', 'loi Duplomb', 'Gaza', 'destitution', 'armes mutilantes', 'chasse à courre', 'Nutri-Score'],
    placeholder: 'CNews, pesticides, Gaza, destitution…',
  },
  senat: {
    id: 'senat', name: 'Sénat', of: 'du Sénat', at: 'au Sénat', with: 'le Sénat',
    corpus: 'Pétitions du Sénat', site: "L'Atlas des pétitions du Sénat", publisher: 'data.gouv.fr', licence: LO,
    thresholds: [100_000], recovery: false, suiteADonner: false, commissions: false,
    examples: ['retraites', 'handicap', 'AAH', 'chasse', 'vaccins', 'loi Duplomb', 'animaux'],
    placeholder: 'retraites, handicap, chasse, vaccins…',
  },
  europe: {
    id: 'europe', name: 'Initiative citoyenne européenne', of: "de l'Initiative citoyenne européenne", at: 'à la Commission européenne',
    with: "la Commission européenne ni aucune institution de l'Union",
    corpus: 'Initiatives citoyennes européennes', site: "L'Atlas des initiatives européennes",
    publisher: "le registre de l'Initiative citoyenne européenne",
    licence: { label: 'CC BY 4.0 (contenus de la Commission)', url: 'https://commission.europa.eu/legal-notice_fr' },
    thresholds: [1_000_000], recovery: false, suiteADonner: false, commissions: false,
    examples: ['animaux', 'eau', 'climat', 'revenu universel', 'glyphosate', 'jeux vidéo', 'minorités'],
    placeholder: 'animaux, eau, climat, revenu universel…',
  },
};

export function chamberOf(id: string | undefined): Chamber {
  return CHAMBERS[(id as ChamberId) ?? 'an'] ?? CHAMBERS.an;
}

export const chamber: Chamber = chamberOf(import.meta.env.VITE_ATLAS_SOURCE);

/** Dossier de chaque espace sous /atlas/. */
const DIRS: Record<ChamberId, string> = { an: '', senat: 'senat/', europe: 'europe/' };
const LABELS: Record<ChamberId, string> = { an: "Pétitions de l'Assemblée", senat: 'Pétitions du Sénat', europe: 'Initiatives européennes' };

/** Les autres espaces de l'Atlas, avec leur adresse relative à la base de celui-ci. */
export const otherSpaces = (Object.keys(DIRS) as ChamberId[])
  .filter((id) => id !== chamber.id)
  .map((id) => ({ id, label: LABELS[id], href: `${import.meta.env.BASE_URL}${chamber.id === 'an' ? '' : '../'}${DIRS[id]}` }));
