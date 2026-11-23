/**
 * La chambre dont cet Atlas explore les pétitions. Chaque chambre a son espace à part (/atlas/ et /atlas/senat/),
 * construit séparément : VITE_ATLAS_SOURCE est fixé au moment du build.
 */
export type ChamberId = 'an' | 'senat';

export interface Chamber {
  id: ChamberId;
  name: string;
  /** « de l'Assemblée nationale », « du Sénat » */
  of: string;
  /** « à l'Assemblée nationale », « au Sénat » */
  at: string;
  /** Seuils officiels de signatures tracés sur les courbes. */
  thresholds: number[];
  /** Rattrapage des pétitions absentes du fichier et observatoire « Suite à donner » : propres à l'Assemblée. */
  recovery: boolean;
  suiteADonner: boolean;
  /** L'autre espace, relatif à la racine de celui-ci. */
  other: { label: string; href: string };
}

const CHAMBERS: Record<ChamberId, Chamber> = {
  an: {
    id: 'an', name: 'Assemblée nationale', of: "de l'Assemblée nationale", at: "à l'Assemblée nationale",
    thresholds: [100_000, 500_000], recovery: true, suiteADonner: true,
    other: { label: 'Pétitions du Sénat', href: 'senat/' },
  },
  senat: {
    id: 'senat', name: 'Sénat', of: 'du Sénat', at: 'au Sénat',
    thresholds: [100_000], recovery: false, suiteADonner: false,
    other: { label: "Pétitions de l'Assemblée", href: '../' },
  },
};

export function chamberOf(id: string | undefined): Chamber {
  return id === 'senat' ? CHAMBERS.senat : CHAMBERS.an;
}

export const chamber: Chamber = chamberOf(import.meta.env.VITE_ATLAS_SOURCE);

/** Adresse de l'autre espace, à partir de la base de celui-ci. */
export const otherSpaceHref = `${import.meta.env.BASE_URL}${chamber.other.href}`;
