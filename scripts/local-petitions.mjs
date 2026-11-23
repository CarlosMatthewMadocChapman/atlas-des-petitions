// Répertoire des pétitions locales : où s'adresser à sa ville. L'Atlas ne lit aucun contenu de ces plateformes ;
// chaque règle vient d'une page officielle, avec sa date de vérification. Une règle non vérifiée n'est pas écrite.

export const CHECKED_ON = '2026-11-23';

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
];

/** Plateformes repérées dont les règles restent à vérifier sur une page officielle. */
export const TO_CHECK = [
  { city: 'Rennes et Rennes Métropole', platform: 'https://fabriquecitoyenne.fr/', note: 'droit d’interpellation sur la Fabrique citoyenne' },
  { city: 'Montpellier', platform: 'https://participer.montpellier.fr/', note: 'droit d’interpellation citoyenne' },
  { city: 'Lyon', platform: 'https://oye.participer.lyon.fr/', note: 'pétitions sur la plateforme Oyé' },
  { city: 'Lille', platform: 'https://participez.lille.fr/', note: 'plateforme de participation' },
];

/** Autres voies, hors des espaces de l'Atlas. */
export const OTHER_ROUTES = [
  { name: 'Conseil économique, social et environnemental', url: 'https://petitions.lecese.fr/', note: '150 000 signatures en un an pour saisir le CESE ; pas encore de données ouvertes' },
  { name: 'Parlement européen, commission des pétitions', url: 'https://www.europarl.europa.eu/petitions/fr/home', note: 'toute personne résidant dans l’Union peut y adresser une pétition, sans seuil de signatures' },
];
