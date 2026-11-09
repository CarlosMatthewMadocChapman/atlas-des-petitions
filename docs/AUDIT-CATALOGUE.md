# Audit du catalogue de pétitions

> Rapport généré automatiquement par `pipeline/` — ne pas modifier à la main. Jeu de données du 2026-11-09 (ressource « Pétitions au 09-11-2026 »), récupéré le 2026-11-09. Empreinte SHA-256 : `7e3353564c8814fc…`. Version du moteur : `rapprochement-1.1.0`.

## Volume et période

- **4269** pétitions, publiées entre **2020-10-01** et **2026-11-06**.
- Identifiants numériques de 9 à 7802 ; 3525 numéros de cette plage n'apparaissent pas dans le fichier (pétitions non publiées, retirées ou jamais ouvertes : le fichier ne permet pas de le dire).
- Identifiants en double : 0. Statuts inconnus : aucun.

### Écart avec le catalogue public ouvert

**Non vérifié automatiquement.** Le site officiel n'expose pas de comptage lisible par un script sans solliciter ses pages (la plateforme refuse les requêtes automatisées), et ce pipeline s'interdit d'aspirer le site pour reconstituer un corpus déjà publié en open data. Pour documenter l'écart, relever à la main le nombre affiché sur la page des initiatives puis le consigner dans `pipeline/curation/public-count.json` (`{"count": N, "observed_on": "AAAA-MM-JJ", "note": "…"}`) ; ce rapport l'intégrera à la prochaine exécution.

## Statuts

| Statut | Pétitions |
| --- | --- |
| ouverte | 1589 |
| archivee | 1454 |
| classee | 1204 |
| expiree | 22 |

### Par année de publication

| Année | archivee | classee | expiree | ouverte | Total |
| --- | --- | --- | --- | --- | --- |
| 2020 | 179 | 0 | 0 | 0 | 179 |
| 2021 | 197 | 0 | 0 | 0 | 197 |
| 2022 | 323 | 0 | 0 | 0 | 323 |
| 2023 | 597 | 0 | 0 | 0 | 597 |
| 2024 | 158 | 123 | 19 | 26 | 326 |
| 2025 | 0 | 1030 | 2 | 439 | 1471 |
| 2026 | 0 | 51 | 1 | 1124 | 1176 |

## Soutiens (nombre de votes à la date du fichier)

Les signatures ne sont pas un compteur temps réel et ne mesurent ni la qualité ni la pertinence d'une proposition.

| Statistique | Valeur |
| --- | --- |
| min | 0 |
| p10 | 11 |
| p25 | 26 |
| median | 71 |
| p75 | 205 |
| p90 | 654 |
| p99 | 15428 |
| max | 2131368 |

| Tranche de soutiens | Pétitions |
| --- | --- |
| 0 à 9 | 365 |
| 10 à 49 | 1344 |
| 50 à 99 | 767 |
| 100 à 499 | 1257 |
| 500 à 999 | 212 |
| 1000 à 4999 | 216 |
| 5000 à 9999 | 32 |
| 10000 et plus | 53 |

La distribution est très asymétrique : médiane 71, maximum 2131368. Valeur absente pour 23 pétitions.

## Commissions et législatures

| Commission | Pétitions |
| --- | --- |
| Commission des lois constitutionnelles, de la législation et de l’administration générale de la République | 1594 |
| Commission des affaires sociales | 868 |
| Commission des affaires économiques | 599 |
| Commission des finances, de l’économie générale et du contrôle budgétaire | 348 |
| Commission des affaires culturelles et de l'éducation | 342 |
| Commission du développement durable et de l’aménagement du territoire | 274 |
| Commission des affaires étrangères | 188 |
| Commission de la défense nationale et des forces armées | 39 |
| (non renseignée) | 17 |

| Législature | Pétitions |
| --- | --- |
| (non renseignée) | 2815 |
| 2022-2024 | 947 |
| 2017-2022 | 507 |

## Champs absents

| Champ | Valeurs absentes |
| --- | --- |
| commission | 17 |
| legislature | 2815 |
| decision | 2666 |
| deadline | 4 |
| votes | 23 |
| published | 0 |

Descriptions : longueur médiane 1395 caractères, maximum 9973 ; 6 sont proches du plafond de la colonne et peuvent être tronquées ; la description issue du jeu de données n'est donc pas toujours le texte intégral.

## Doublons et rapprochements

- Titres identiques après normalisation : 93 groupes, 213 pétitions concernées.

| Titre répété | Occurrences |
| --- | --- |
| Pétition pour la dissolution de la BRAV-M | 12 |
| Un logement décent et sans condition pour la totalité des sans-abri en France ! | 6 |
| Contre la loi Duplomb | 5 |
| Rétablissement de la peine de mort | 4 |
| Dissolution de la BRAV-M | 4 |
| Loi duplomb | 4 |
| petition contre la loi Duplomb | 4 |
| Pétition pour la sauvegarde de nos droits naturels dont vous êtes les garants par l'articl | 3 |

- Relations calculées : {'proche': 333, 'complementaire': 5699, 'comparaison': 8, 'thematique': 933}.
- Dossiers thématiques automatiques : 358, regroupant 1659 pétitions.

## Familles thématiques (catégorisation automatique)

| Famille | Pétitions |
| --- | --- |
| Démocratie et institutions | 887 |
| Santé | 704 |
| Solidarités et social | 682 |
| Droits fondamentaux | 641 |
| Économie et fiscalité | 610 |
| Justice et sécurité | 589 |
| Travail et emploi | 497 |
| Territoires et services publics | 456 |
| Environnement et climat | 357 |
| Éducation et jeunesse | 301 |
| Médias et information | 260 |
| Europe et international | 252 |
| Numérique et données | 242 |
| Agriculture et alimentation | 220 |
| Transports et mobilités | 199 |
| Culture et patrimoine | 198 |
| Énergie | 169 |
| Condition animale | 168 |
| Logement | 156 |
| Défense et sécurité nationale | 114 |

2485 pétitions ont plusieurs thèmes ; 365 n'en ont aucun.

## Vocabulaire qui marque chaque année

| Année | Termes sur-représentés |
| --- | --- |
| 2020 | nocifs, tradition, beau, cerveau, cruaute, errants, attentats, maltraitance |
| 2021 | vaccination, covid, vacciner, virus, pandemie, confinement, sanitaire, aah |
| 2022 | bureau, bureaux, russe, anormal, elections, site, livraison, gaz |
| 2023 | brav, contrariete, lallement, manifestants, entachent, voltigeurs, baillonner, brigade |
| 2024 | capitale, significatif, reussite, but, emmanuel, referendum, vise, promouvoir |
| 2025 | etat, citoyennes, publique, public, duplomb, sociale, annees, grande |
| 2026 | public, cnews, judiciaire, publique, protection, droit, personnes, sexuelles |

## Incohérences et ambiguïtés repérées

- 23 pétitions sans nombre de soutiens (Counter({'expiree': 22, 'archivee': 1})).
- Le champ `legislature` est vide pour la majorité des pétitions récentes.
- Le champ `decision_commission` mêle des décisions individuelles et un texte-type de classement d'office.
- Une même demande peut être déposée plusieurs fois : les soutiens ne s'additionnent pas.

## Avertissements du chargement

- aucun
