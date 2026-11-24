# Audit du catalogue de pétitions

> Rapport généré automatiquement par `pipeline/` — ne pas modifier à la main. Jeu de données du 2026-11-23 (ressource « Pétitions au 23-11-2026 »), récupéré le 2026-11-23. Empreinte SHA-256 : `a4299035745c68f5…`. Version du moteur : `rapprochement-1.1.0`.

## Volume et période

- **5391** pétitions, publiées entre **2020-10-01** et **2026-11-20**.
- Identifiants numériques de 9 à 8229 ; 2830 numéros de cette plage n'apparaissent pas dans le fichier (pétitions non publiées, retirées ou jamais ouvertes : le fichier ne permet pas de le dire).
- Identifiants en double : 0. Statuts inconnus : aucun.

### Écart avec le catalogue public ouvert

**Non relevé.** Pour documenter l'écart, consigner le nombre affiché sur la page des initiatives dans `pipeline/curation/public-count.json` (`{"count": N, "observed_on": "AAAA-MM-JJ", "note": "…"}`) ; ce rapport l'intégrera à la prochaine exécution.

## Pétitions absentes du fichier public

**0** pétitions publiées sur le site officiel manquent au fichier de data.gouv.fr. Elles ont été relues sur le site le 2026-11-23 et ajoutées ici, marquées comme telles. Le programme qui fabrique ce fichier classe comme inutilisé tout numéro inférieur au plus grand numéro déjà vu : une pétition encore en modération à ce moment n'y entre plus jamais.

## Statuts

| Statut | Pétitions |
| --- | --- |
| ouverte | 2524 |
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
| 2026 | 0 | 63 | 0 | 1946 | 2009 |

## Soutiens (nombre de votes à la date du fichier)

Les signatures ne sont pas un compteur temps réel et ne mesurent ni la qualité ni la pertinence d'une proposition.

| Statistique | Valeur |
| --- | --- |
| min | 0 |
| p10 | 8 |
| p25 | 22 |
| median | 62 |
| p75 | 186 |
| p90 | 551 |
| p99 | 13884 |
| max | 2131368 |

| Tranche de soutiens | Pétitions |
| --- | --- |
| 0 à 9 | 614 |
| 10 à 49 | 1763 |
| 50 à 99 | 921 |
| 100 à 499 | 1493 |
| 500 à 999 | 243 |
| 1000 à 4999 | 237 |
| 5000 à 9999 | 36 |
| 10000 et plus | 62 |

La distribution est très asymétrique : médiane 62, maximum 2131368. Valeur absente pour 22 pétitions.

## Commissions et législatures

| Commission | Pétitions |
| --- | --- |
| Commission des lois constitutionnelles, de la législation et de l’administration générale de la République | 1970 |
| Commission des affaires sociales | 1044 |
| Commission des affaires économiques | 724 |
| Commission des affaires culturelles et de l'éducation | 517 |
| Commission des finances, de l’économie générale et du contrôle budgétaire | 479 |
| Commission du développement durable et de l’aménagement du territoire | 336 |
| Commission des affaires étrangères | 253 |
| Commission de la défense nationale et des forces armées | 46 |
| (non renseignée) | 22 |

| Législature | Pétitions |
| --- | --- |
| (non renseignée) | 3937 |
| 2022-2024 | 947 |
| 2017-2022 | 507 |

## Champs absents

| Champ | Valeurs absentes |
| --- | --- |
| commission | 22 |
| legislature | 3937 |
| decision | 3635 |
| deadline | 4 |
| votes | 22 |
| published | 0 |

Descriptions : longueur médiane 1550 caractères, maximum 9973 ; 6 sont proches du plafond de la colonne et peuvent être tronquées ; la description issue du jeu de données n'est donc pas toujours le texte intégral.

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

- Relations calculées : {'proche': 454, 'complementaire': 7585, 'comparaison': 15, 'thematique': 1242}.
- Dossiers thématiques automatiques : 437, regroupant 2115 pétitions.

## Familles thématiques (catégorisation automatique)

| Famille | Pétitions |
| --- | --- |
| Démocratie et institutions | 1165 |
| Solidarités et social | 857 |
| Santé | 848 |
| Droits fondamentaux | 836 |
| Économie et fiscalité | 813 |
| Justice et sécurité | 783 |
| Travail et emploi | 651 |
| Territoires et services publics | 591 |
| Environnement et climat | 441 |
| Médias et information | 394 |
| Éducation et jeunesse | 389 |
| Europe et international | 342 |
| Numérique et données | 322 |
| Agriculture et alimentation | 262 |
| Transports et mobilités | 249 |
| Culture et patrimoine | 244 |
| Énergie | 206 |
| Condition animale | 204 |
| Logement | 189 |
| Défense et sécurité nationale | 138 |

3226 pétitions ont plusieurs thèmes ; 420 n'en ont aucun.

## Vocabulaire qui marque chaque année

| Année | Termes sur-représentés |
| --- | --- |
| 2020 | nocifs, tradition, beau, errants, cerveau, cruaute, attentats, diminuer |
| 2021 | vaccination, vacciner, covid, virus, pandemie, confinement, sanitaire, alinea |
| 2022 | bureau, russe, anormal, bureaux, site, elections, gaz, livraison |
| 2023 | brav, contrariete, lallement, entachent, voltigeurs, baillonner, brigade, abat |
| 2024 | capitale, emmanuel, referendum, but, significatif, benefique, vise, reussite |
| 2025 | etat, citoyennes, duplomb, politique, public, economie, sante, publique |
| 2026 | public, publique, droit, cnews, personnes, protection, chaine, pluralisme |

## Incohérences et ambiguïtés repérées

- 22 pétitions sans nombre de soutiens (Counter({'expiree': 21, 'archivee': 1})).
- Le champ `legislature` est vide pour la majorité des pétitions récentes.
- Le champ `decision_commission` mêle des décisions individuelles et un texte-type de classement d'office.
- Une même demande peut être déposée plusieurs fois : les soutiens ne s'additionnent pas.

## Avertissements du chargement

- aucun
