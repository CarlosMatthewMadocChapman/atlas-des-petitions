# Audit du catalogue de pétitions

> Rapport généré automatiquement par `pipeline/` — ne pas modifier à la main. Jeu de données du 2026-11-18 (ressource « Pétitions au 18-11-2026 »), récupéré le 2026-11-19. Empreinte SHA-256 : `27ab830d148df109…`. Version du moteur : `rapprochement-1.1.0`.

## Volume et période

- **5343** pétitions, publiées entre **2020-10-01** et **2026-11-19**.
- Identifiants numériques de 9 à 8119 ; 2768 numéros de cette plage n'apparaissent pas dans le fichier (pétitions non publiées, retirées ou jamais ouvertes : le fichier ne permet pas de le dire).
- Identifiants en double : 0. Statuts inconnus : aucun.

### Écart avec le catalogue public ouvert

**Non relevé.** Pour documenter l'écart, consigner le nombre affiché sur la page des initiatives dans `pipeline/curation/public-count.json` (`{"count": N, "observed_on": "AAAA-MM-JJ", "note": "…"}`) ; ce rapport l'intégrera à la prochaine exécution.

## Pétitions absentes du fichier public

**108** pétitions publiées sur le site officiel manquent au fichier de data.gouv.fr. Elles ont été relues sur le site le 2026-11-19 et ajoutées ici, marquées comme telles. Le programme qui fabrique ce fichier classe comme inutilisé tout numéro inférieur au plus grand numéro déjà vu : une pétition encore en modération à ce moment n'y entre plus jamais.

## Statuts

| Statut | Pétitions |
| --- | --- |
| ouverte | 2476 |
| archivee | 1454 |
| classee | 1392 |
| expiree | 21 |

### Par année de publication

| Année | archivee | classee | expiree | ouverte | Total |
| --- | --- | --- | --- | --- | --- |
| 2020 | 179 | 0 | 0 | 0 | 179 |
| 2021 | 197 | 0 | 0 | 0 | 197 |
| 2022 | 323 | 0 | 0 | 0 | 323 |
| 2023 | 597 | 0 | 0 | 0 | 597 |
| 2024 | 158 | 123 | 19 | 26 | 326 |
| 2025 | 0 | 1206 | 2 | 552 | 1760 |
| 2026 | 0 | 63 | 0 | 1898 | 1961 |

## Soutiens (nombre de votes à la date du fichier)

Les signatures ne sont pas un compteur temps réel et ne mesurent ni la qualité ni la pertinence d'une proposition.

| Statistique | Valeur |
| --- | --- |
| min | 0 |
| p10 | 8 |
| p25 | 22 |
| median | 62 |
| p75 | 185 |
| p90 | 552 |
| p99 | 13607 |
| max | 2131368 |

| Tranche de soutiens | Pétitions |
| --- | --- |
| 0 à 9 | 626 |
| 10 à 49 | 1740 |
| 50 à 99 | 907 |
| 100 à 499 | 1472 |
| 500 à 999 | 246 |
| 1000 à 4999 | 233 |
| 5000 à 9999 | 36 |
| 10000 et plus | 61 |

La distribution est très asymétrique : médiane 62, maximum 2131368. Valeur absente pour 22 pétitions.

## Commissions et législatures

| Commission | Pétitions |
| --- | --- |
| Commission des lois constitutionnelles, de la législation et de l’administration générale de la République | 1955 |
| Commission des affaires sociales | 1035 |
| Commission des affaires économiques | 720 |
| Commission des affaires culturelles et de l'éducation | 505 |
| Commission des finances, de l’économie générale et du contrôle budgétaire | 476 |
| Commission du développement durable et de l’aménagement du territoire | 334 |
| Commission des affaires étrangères | 252 |
| Commission de la défense nationale et des forces armées | 45 |
| (non renseignée) | 21 |

| Législature | Pétitions |
| --- | --- |
| (non renseignée) | 3889 |
| 2022-2024 | 947 |
| 2017-2022 | 507 |

## Champs absents

| Champ | Valeurs absentes |
| --- | --- |
| commission | 21 |
| legislature | 3889 |
| decision | 3587 |
| deadline | 4 |
| votes | 22 |
| published | 0 |

Descriptions : longueur médiane 1541 caractères, maximum 9973 ; 6 sont proches du plafond de la colonne et peuvent être tronquées ; la description issue du jeu de données n'est donc pas toujours le texte intégral.

## Doublons et rapprochements

- Titres identiques après normalisation : 118 groupes, 270 pétitions concernées.

| Titre répété | Occurrences |
| --- | --- |
| Pétition pour la dissolution de la BRAV-M | 12 |
| Supprimer CNews de l'audiovisuel français | 7 |
| Un logement décent et sans condition pour la totalité des sans-abri en France ! | 6 |
| Contre la loi Duplomb | 5 |
| Rétablissement de la peine de mort | 4 |
| Dissolution de la BRAV-M | 4 |
| Loi duplomb | 4 |
| petition contre la loi Duplomb | 4 |

- Relations calculées : {'proche': 452, 'complementaire': 7461, 'comparaison': 14, 'thematique': 1235}.
- Dossiers thématiques automatiques : 438, regroupant 2109 pétitions.

## Familles thématiques (catégorisation automatique)

| Famille | Pétitions |
| --- | --- |
| Démocratie et institutions | 1154 |
| Solidarités et social | 847 |
| Santé | 840 |
| Droits fondamentaux | 825 |
| Économie et fiscalité | 806 |
| Justice et sécurité | 774 |
| Travail et emploi | 647 |
| Territoires et services publics | 583 |
| Environnement et climat | 441 |
| Éducation et jeunesse | 386 |
| Médias et information | 384 |
| Europe et international | 339 |
| Numérique et données | 321 |
| Agriculture et alimentation | 259 |
| Transports et mobilités | 247 |
| Culture et patrimoine | 242 |
| Énergie | 205 |
| Condition animale | 204 |
| Logement | 188 |
| Défense et sécurité nationale | 136 |

3195 pétitions ont plusieurs thèmes ; 418 n'en ont aucun.

## Vocabulaire qui marque chaque année

| Année | Termes sur-représentés |
| --- | --- |
| 2020 | nocifs, tradition, beau, errants, cerveau, cruaute, attentats, diminuer |
| 2021 | vaccination, vacciner, covid, virus, pandemie, confinement, sanitaire, alinea |
| 2022 | bureau, russe, anormal, bureaux, elections, site, gaz, livraison |
| 2023 | brav, contrariete, lallement, entachent, voltigeurs, baillonner, brigade, abat |
| 2024 | capitale, emmanuel, referendum, but, significatif, benefique, vise, promouvoir |
| 2025 | etat, citoyennes, duplomb, public, economie, politique, publique, annees |
| 2026 | public, publique, cnews, droit, protection, personnes, chaine, pluralisme |

## Incohérences et ambiguïtés repérées

- 22 pétitions sans nombre de soutiens (Counter({'expiree': 21, 'archivee': 1})).
- Le champ `legislature` est vide pour la majorité des pétitions récentes.
- Le champ `decision_commission` mêle des décisions individuelles et un texte-type de classement d'office.
- Une même demande peut être déposée plusieurs fois : les soutiens ne s'additionnent pas.

## Avertissements du chargement

- aucun
