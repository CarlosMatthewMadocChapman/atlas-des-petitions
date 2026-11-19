# Audit du catalogue de pétitions

> Rapport généré automatiquement par `pipeline/` — ne pas modifier à la main. Jeu de données du 2026-11-16 (ressource « Pétitions au 16-11-2026 »), récupéré le 2026-11-16. Empreinte SHA-256 : `19be6e1dd2d68d9b…`. Version du moteur : `rapprochement-1.1.0`.

## Volume et période

- **5204** pétitions, publiées entre **2020-10-01** et **2026-11-12**.
- Identifiants numériques de 9 à 8070 ; 2858 numéros de cette plage n'apparaissent pas dans le fichier (pétitions non publiées, retirées ou jamais ouvertes : le fichier ne permet pas de le dire).
- Identifiants en double : 0. Statuts inconnus : aucun.

### Écart avec le catalogue public ouvert

**Non relevé.** Pour documenter l'écart, consigner le nombre affiché sur la page des initiatives dans `pipeline/curation/public-count.json` (`{"count": N, "observed_on": "AAAA-MM-JJ", "note": "…"}`) ; ce rapport l'intégrera à la prochaine exécution.

## Pétitions absentes du fichier public

**906** pétitions publiées sur le site officiel manquent au fichier de data.gouv.fr. Elles ont été relues sur le site le 2026-11-16 et ajoutées ici, marquées comme telles. Le programme qui fabrique ce fichier classe comme inutilisé tout numéro inférieur au plus grand numéro déjà vu : une pétition encore en modération à ce moment n'y entre plus jamais.

## Statuts

| Statut | Pétitions |
| --- | --- |
| ouverte | 2337 |
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
| 2026 | 0 | 63 | 0 | 1759 | 1822 |

## Soutiens (nombre de votes à la date du fichier)

Les signatures ne sont pas un compteur temps réel et ne mesurent ni la qualité ni la pertinence d'une proposition.

| Statistique | Valeur |
| --- | --- |
| min | 0 |
| p10 | 9 |
| p25 | 23 |
| median | 64 |
| p75 | 190 |
| p90 | 564 |
| p99 | 13907 |
| max | 2131368 |

| Tranche de soutiens | Pétitions |
| --- | --- |
| 0 à 9 | 531 |
| 10 à 49 | 1715 |
| 50 à 99 | 896 |
| 100 à 499 | 1469 |
| 500 à 999 | 242 |
| 1000 à 4999 | 233 |
| 5000 à 9999 | 35 |
| 10000 et plus | 61 |

La distribution est très asymétrique : médiane 64, maximum 2131368. Valeur absente pour 22 pétitions.

## Commissions et législatures

| Commission | Pétitions |
| --- | --- |
| Commission des lois constitutionnelles, de la législation et de l’administration générale de la République | 1927 |
| Commission des affaires sociales | 1018 |
| Commission des affaires économiques | 709 |
| Commission des finances, de l’économie générale et du contrôle budgétaire | 465 |
| Commission des affaires culturelles et de l'éducation | 435 |
| Commission du développement durable et de l’aménagement du territoire | 332 |
| Commission des affaires étrangères | 252 |
| Commission de la défense nationale et des forces armées | 45 |
| (non renseignée) | 21 |

| Législature | Pétitions |
| --- | --- |
| (non renseignée) | 3750 |
| 2022-2024 | 947 |
| 2017-2022 | 507 |

## Champs absents

| Champ | Valeurs absentes |
| --- | --- |
| commission | 21 |
| legislature | 3750 |
| decision | 3599 |
| deadline | 4 |
| votes | 22 |
| published | 0 |

Descriptions : longueur médiane 1529 caractères, maximum 10000 ; 5 sont proches du plafond de la colonne et peuvent être tronquées ; la description issue du jeu de données n'est donc pas toujours le texte intégral.

## Doublons et rapprochements

- Titres identiques après normalisation : 114 groupes, 257 pétitions concernées.

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

- Relations calculées : {'proche': 403, 'complementaire': 7191, 'comparaison': 12, 'thematique': 1195}.
- Dossiers thématiques automatiques : 427, regroupant 2032 pétitions.

## Familles thématiques (catégorisation automatique)

| Famille | Pétitions |
| --- | --- |
| Démocratie et institutions | 1132 |
| Santé | 833 |
| Solidarités et social | 831 |
| Droits fondamentaux | 812 |
| Économie et fiscalité | 785 |
| Justice et sécurité | 756 |
| Travail et emploi | 631 |
| Territoires et services publics | 572 |
| Environnement et climat | 440 |
| Éducation et jeunesse | 372 |
| Europe et international | 334 |
| Médias et information | 326 |
| Numérique et données | 319 |
| Agriculture et alimentation | 257 |
| Transports et mobilités | 243 |
| Culture et patrimoine | 234 |
| Énergie | 201 |
| Condition animale | 197 |
| Logement | 186 |
| Défense et sécurité nationale | 136 |

3123 pétitions ont plusieurs thèmes ; 413 n'en ont aucun.

## Vocabulaire qui marque chaque année

| Année | Termes sur-représentés |
| --- | --- |
| 2020 | nocifs, tradition, beau, attentats, errants, cerveau, cruaute, diminuer |
| 2021 | vaccination, vacciner, covid, virus, pandemie, confinement, sanitaire, aah |
| 2022 | bureau, russe, bureaux, anormal, elections, site, gaz, livraison |
| 2023 | brav, contrariete, lallement, entachent, voltigeurs, baillonner, brigade, abat |
| 2024 | capitale, but, referendum, emmanuel, significatif, benefique, vise, promouvoir |
| 2025 | etat, citoyennes, duplomb, publique, public, politique, economie, annees |
| 2026 | public, publique, droit, protection, personnes, certains, politique, professionnels |

## Incohérences et ambiguïtés repérées

- 22 pétitions sans nombre de soutiens (Counter({'expiree': 21, 'archivee': 1})).
- Le champ `legislature` est vide pour la majorité des pétitions récentes.
- Le champ `decision_commission` mêle des décisions individuelles et un texte-type de classement d'office.
- Une même demande peut être déposée plusieurs fois : les soutiens ne s'additionnent pas.

## Avertissements du chargement

- aucun
