// Répertoire des pétitions locales : où s'adresser à sa ville. L'Atlas ne lit aucun contenu de ces plateformes ;
// chaque règle vient d'une page officielle, avec sa date de vérification. Une règle non vérifiée n'est pas écrite.

export const CHECKED_ON = '2026-11-24';

/** Villes dont les règles ont été lues sur une page officielle. */
export const CITIES = [
  {
    city: 'Strasbourg',
    device: 'Pétition citoyenne',
    threshold: '1 400 signatures d’habitant·es de 16 ans ou plus, en six mois ; rencontre avec les élu·es dès 50 signatures',
    outcome: 'La pétition est présentée à la Maire, qui peut l’inscrire à l’ordre du jour du Conseil municipal.',
    platform: 'https://participer.strasbourg.eu/',
    source: 'https://www.strasbourg.eu/web/participer/explication-petitions',
  },
  {
    city: 'Bordeaux',
    device: 'Interpeller ma ville',
    threshold: '4 000 soutiens',
    outcome: 'La plateforme suit chaque interpellation : seuil atteint, puis réponse ou médiation de la Ville.',
    platform: 'https://participation.bordeaux.fr/initiatives',
    source: 'https://participation.bordeaux.fr/initiatives',
  },
  {
    city: 'Nantes',
    device: 'Droit d’interpellation citoyenne',
    threshold: '300 soutiens de Nantaises et Nantais, venus d’au moins trois quartiers, en deux mois',
    outcome: 'Les interpellations au-dessus du seuil passent devant une commission d’élus de tous les groupes du conseil municipal.',
    platform: 'https://dialoguecitoyen.metropole.nantes.fr/',
    source: 'https://metropole.nantes.fr/droit-interpellation',
  },
  {
    city: 'Montpellier',
    device: 'Droit d’interpellation citoyenne',
    threshold: '5 % des électeurs inscrits, arrondis à la centaine inférieure (8 500 signataires la première année, seuil révisé chaque année), en six mois',
    outcome: 'Débat en Conseil municipal ; le porteur de l’interpellation dispose de cinq minutes pour la présenter.',
    platform: 'https://participer.montpellier.fr/',
    source: 'https://participer.montpellier.fr/sites/default/files/2024-10/R%C3%A8glement%20droit%20d%27interpellation%20citoyenne.pdf',
  },
  {
    city: 'Rennes et Rennes Métropole',
    device: 'Droit d’interpellation citoyenne',
    threshold: '1 000 soutiens en trois mois ; dépôts suspendus depuis le 7 mars 2025, avant les municipales de mars 2026 (reprise à confirmer)',
    outcome: 'Discussion en conseil municipal (Ville) ou métropolitain (Métropole), selon le sujet.',
    platform: 'https://fabriquecitoyenne.fr/',
    source: 'https://fabriquecitoyenne.fr/pages/le-droit-dinterpellation-citoyenne',
  },
  {
    city: 'Lille, Hellemmes et Lomme',
    device: 'Pétition locale',
    threshold: 'Seuil fixé par la délibération du 5 février 2021 (soutiens d’électeurs inscrits) ; dépôt dès 16 ans, ou par une association liée à l’une des trois communes',
    outcome: 'Avec les soutiens requis, la pétition peut être inscrite à l’ordre du jour du Conseil municipal de Lille.',
    platform: 'https://participez.lille.fr/project/droit-de-petition-locale/presentation/presentation',
    source: 'https://participez.lille.fr/project/droit-de-petition-locale/presentation/presentation',
  },
];

/** Plateformes repérées dont les règles restent à vérifier sur une page officielle. */
export const TO_CHECK = [
  { city: 'Lyon', platform: 'https://oye.participer.lyon.fr/', note: 'pétitions et participation sur la plateforme Oyé !' },
  { city: 'Paris', platform: 'https://www.paris.fr/', note: 'droit d’interpellation du Conseil de Paris (seuil de 5 000 signatures selon des documents de 2020, à confirmer)' },
];

/** Autres voies, hors des espaces de l'Atlas. */
export const OTHER_ROUTES = [
  { name: 'Conseil économique, social et environnemental', url: 'https://petitions.lecese.fr/', note: '150 000 signatures en un an pour saisir le CESE ; pas encore de données ouvertes' },
  { name: 'Parlement européen, commission des pétitions', url: 'https://www.europarl.europa.eu/petitions/fr/home', note: 'toute personne résidant dans l’Union peut y adresser une pétition, sans seuil de signatures' },
];
