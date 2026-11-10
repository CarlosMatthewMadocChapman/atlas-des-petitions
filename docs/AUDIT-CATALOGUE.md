# Audit du catalogue de pétitions

> Rapport généré automatiquement par `pipeline/` — ne pas modifier à la main. Jeu de données du 2026-11-09 (ressource « Pétitions au 09-11-2026 »), récupéré le 2026-11-10. Empreinte SHA-256 : `7e3353564c8814fc…`. Version du moteur : `rapprochement-1.1.0`.

## Volume et période

- **5130** pétitions, publiées entre **2020-10-01** et **2026-11-09**.
- Identifiants numériques de 9 à 7802 ; 2664 numéros de cette plage n'apparaissent pas dans le fichier (pétitions non publiées, retirées ou jamais ouvertes : le fichier ne permet pas de le dire).
- Identifiants en double : 0. Statuts inconnus : aucun.

### Écart avec le catalogue public ouvert

**Non relevé.** Pour documenter l'écart, consigner le nombre affiché sur la page des initiatives dans `pipeline/curation/public-count.json` (`{"count": N, "observed_on": "AAAA-MM-JJ", "note": "…"}`) ; ce rapport l'intégrera à la prochaine exécution.

## Pétitions absentes du fichier public

**861** pétitions publiées sur le site officiel manquent au fichier de data.gouv.fr. Elles ont été relues sur le site le 2026-11-10 et ajoutées ici, marquées comme telles. Le programme qui fabrique ce fichier classe comme inutilisé tout numéro inférieur au plus grand numéro déjà vu : une pétition encore en modération à ce moment n'y entre plus jamais.

## Statuts

| Statut | Pétitions |
| --- | --- |
| ouverte | 2268 |
| archivee | 1454 |
| classee | 1386 |
| expiree | 22 |

### Par année de publication

| Année | archivee | classee | expiree | ouverte | Total |
| --- | --- | --- | --- | --- | --- |
| 2020 | 179 | 0 | 0 | 0 | 179 |
| 2021 | 197 | 0 | 0 | 0 | 197 |
| 2022 | 323 | 0 | 0 | 0 | 323 |
| 2023 | 597 | 0 | 0 | 0 | 597 |
| 2024 | 158 | 123 | 19 | 26 | 326 |
| 2025 | 0 | 1206 | 2 | 552 | 1760 |
| 2026 | 0 | 57 | 1 | 1690 | 1748 |

## Soutiens (nombre de votes à la date du fichier)

Les signatures ne sont pas un compteur temps réel et ne mesurent ni la qualité ni la pertinence d'une proposition.

| Statistique | Valeur |
| --- | --- |
| min | 0 |
| p10 | 9 |
| p25 | 23 |
| median | 63 |
| p75 | 188 |
| p90 | 560 |
| p99 | 13618 |
| max | 2131368 |

| Tranche de soutiens | Pétitions |
| --- | --- |
| 0 à 9 | 548 |
| 10 à 49 | 1672 |
| 50 à 99 | 883 |
| 100 à 499 | 1446 |
| 500 à 999 | 236 |
| 1000 à 4999 | 230 |
| 5000 à 9999 | 32 |
| 10000 et plus | 60 |

La distribution est très asymétrique : médiane 63, maximum 2131368. Valeur absente pour 23 pétitions.

## Commissions et législatures

| Commission | Pétitions |
| --- | --- |
| Commission des lois constitutionnelles, de la législation et de l’administration générale de la République | 1899 |
| Commission des affaires sociales | 1008 |
| Commission des affaires économiques | 702 |
| Commission des finances, de l’économie générale et du contrôle budgétaire | 456 |
| Commission des affaires culturelles et de l'éducation | 417 |
| Commission du développement durable et de l’aménagement du territoire | 330 |
| Commission des affaires étrangères | 252 |
| Commission de la défense nationale et des forces armées | 45 |
| (non renseignée) | 21 |

| Législature | Pétitions |
| --- | --- |
| (non renseignée) | 3676 |
| 2022-2024 | 947 |
| 2017-2022 | 507 |

## Champs absents

| Champ | Valeurs absentes |
| --- | --- |
| commission | 21 |
| legislature | 3676 |
| decision | 3527 |
| deadline | 4 |
| votes | 23 |
| published | 0 |

Descriptions : longueur médiane 1525 caractères, maximum 10000 ; 5 sont proches du plafond de la colonne et peuvent être tronquées ; la description issue du jeu de données n'est donc pas toujours le texte intégral.

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

- Relations calculées : {'proche': 403, 'complementaire': 6983, 'comparaison': 10, 'thematique': 1142}.
- Dossiers thématiques automatiques : 419, regroupant 1986 pétitions.

## Familles thématiques (catégorisation automatique)

| Famille | Pétitions |
| --- | --- |
| Démocratie et institutions | 1113 |
| Santé | 829 |
| Solidarités et social | 821 |
| Droits fondamentaux | 799 |
| Économie et fiscalité | 773 |
| Justice et sécurité | 744 |
| Travail et emploi | 620 |
| Territoires et services publics | 563 |
| Environnement et climat | 437 |
| Éducation et jeunesse | 365 |
| Europe et international | 332 |
| Numérique et données | 314 |
| Médias et information | 310 |
| Agriculture et alimentation | 255 |
| Transports et mobilités | 240 |
| Culture et patrimoine | 231 |
| Énergie | 198 |
| Condition animale | 197 |
| Logement | 181 |
| Défense et sécurité nationale | 134 |

3078 pétitions ont plusieurs thèmes ; 412 n'en ont aucun.

## Vocabulaire qui marque chaque année

| Année | Termes sur-représentés |
| --- | --- |
| 2020 | nocifs, tradition, beau, attentats, errants, cerveau, cruaute, diminuer |
| 2021 | vaccination, vacciner, covid, virus, pandemie, confinement, sanitaire, aah |
| 2022 | bureau, russe, bureaux, anormal, elections, site, livraison, gaz |
| 2023 | brav, contrariete, lallement, entachent, voltigeurs, baillonner, brigade, abat |
| 2024 | capitale, referendum, benefique, but, emmanuel, significatif, vise, promouvoir |
| 2025 | etat, citoyennes, duplomb, public, publique, politique, economie, annees |
| 2026 | public, publique, droit, protection, personnes, certains, judiciaire, politique |

## Incohérences et ambiguïtés repérées

- 23 pétitions sans nombre de soutiens (Counter({'expiree': 22, 'archivee': 1})).
- Le champ `legislature` est vide pour la majorité des pétitions récentes.
- Le champ `decision_commission` mêle des décisions individuelles et un texte-type de classement d'office.
- Une même demande peut être déposée plusieurs fois : les soutiens ne s'additionnent pas.

## Avertissements du chargement

- aucun
