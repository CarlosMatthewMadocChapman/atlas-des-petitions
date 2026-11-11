# Les pétitions absentes du fichier : découverte, rattrapage et vérification

*Atlas des pétitions — Radio du Futur. Dossier documentaire ouvert le 11 novembre 2026. Les chiffres ci-dessous désignent des instantanés datés.*

## Pourquoi cette vérification a commencé

L'Atlas des pétitions rapproche les propositions citoyennes publiées sur la plateforme de l'Assemblée nationale. En actualisant son catalogue depuis le jeu de données ouvert publié sur data.gouv.fr, une anomalie est apparue : plusieurs pétitions bien présentes sur le site officiel étaient absentes du CSV, y compris des pétitions recueillant un très grand nombre de soutiens.

Le 9 novembre 2026, un relevé manuel montrait que **42 des 300 premières pétitions** du classement officiel par soutiens manquaient au fichier utilisé par l'Atlas. La pétition **n° 5820**, qui comptait plus d'un million de soutiens au 10 novembre, en était un exemple particulièrement visible.

Le 10 novembre, cette recherche a donné lieu au [signalement public n° 839 dans le dépôt de production des données](https://github.com/datagouv/datagouvfr_data_pipelines/issues/839). Il comporte des numéros de pétitions, des dates vérifiées et une proposition de correction. Ce signalement constitue une **hypothèse technique documentée** ; il ne confirme pas à lui seul qu'une correction a été adoptée par les producteurs du fichier.

## D'où pourrait venir l'absence de certaines pétitions ?

Le code de génération du jeu de données comporte un calcul appelé `unused_ids`. Il marque comme inutilisés les numéros inférieurs au plus grand identifiant déjà rencontré qui sont absents du fichier précédent. Ces numéros sont ensuite ignorés lors des lectures suivantes.

Or l'attribution d'un numéro peut précéder la publication effective d'une pétition, notamment pendant sa modération. Si des numéros plus élevés sont publiés entre-temps, une pétition publiée ultérieurement avec un numéro inférieur peut rester indéfiniment absente des extractions.

La [discussion technique sur GitHub](https://github.com/datagouv/datagouvfr_data_pipelines/issues/839) contient l'extrait de code exact, les exemples et la correction suggérée.

## Comment l'Atlas a retrouvé les fiches

Pour disposer d'un catalogue plus complet sans attendre la correction de la source, l'Atlas a ajouté un **rattrapage distinct du téléchargement du CSV** :

1. Télécharger le fichier ouvert, puis conserver sa date, son adresse et son empreinte SHA-256.
2. Calculer les numéros manquants entre le plus petit et le plus grand identifiant du CSV.
3. Pour chaque numéro, vérifier sur le site officiel de l'Assemblée si une fiche est effectivement publiée. Les identifiants non publiés sont ignorés, sans être déclarés définitivement inexistants.
4. Pour les fiches trouvées, relever les informations disponibles (numéro, titre, description accessible, date de publication, soutiens, statut…) et enregistrer **la date de consultation**. Les noms des auteurs ne sont pas recopiés.
5. Fusionner ces résultats avec le fichier ouvert par numéro officiel : **si une pétition figure ensuite dans le CSV, le CSV reprend la priorité**. Valider les identifiants et les relations avant publication.

Le programme se trouve dans [`pipeline/atlas_pipeline/recover.py`](../pipeline/atlas_pipeline/recover.py). La fusion est réalisée par [`pipeline/atlas_pipeline/build.py`](../pipeline/atlas_pipeline/build.py). Les fiches récupérées sont enregistrées dans [`pipeline/recovered/hors-fichier.json`](../pipeline/recovered/hors-fichier.json), avec leur date de lecture. Les totaux du catalogue et sa source sont consultables dans [`public/data/meta.json`](../public/data/meta.json), le rapport dans [`docs/AUDIT-CATALOGUE.md`](./AUDIT-CATALOGUE.md).

Pour reproduire le circuit depuis le dossier `atlas-des-petitions/`, avec les dépendances requises :

```bash
npm run data:fetch
python pipeline/run.py recover
npm run data:build
```

Cette opération interroge la plateforme officielle pour les numéros absents : elle doit rester modérée et respecter ses conditions d'accès. La tâche de mise à jour de l'Atlas tente ce rattrapage ; si celui-ci échoue, elle conserve les résultats précédemment vérifiés, sans prétendre les avoir rafraîchis.

## Ce que montraient les données du 9 et du 10 novembre 2026

| Provenance | Pétitions |
| --- | ---: |
| Fichier ouvert daté du 9 novembre | 4 269 |
| Fiches supplémentaires retrouvées sur le site officiel le 10 novembre | 861 |
| **Catalogue enrichi de l'Atlas** | **5 130** |

Ces nombres décrivent cet instantané, **pas un total permanent**. Le fichier du 9 novembre peut être à jour à sa propre date tout en restant incomplet. Les 861 fiches ont été consultées le 10 novembre ; leurs nombres de soutiens peuvent donc être plus récents que ceux du CSV. L'Atlas ne dispose d'aucun compteur temps réel.

### Une vérification indépendante : « Suite à donner »

À la suite de ce signalement, [« Suite à donner »](https://suiteadonner.nucom.fr/), un observatoire indépendant du suivi parlementaire des pétitions, a vérifié les numéros manquants sur ses propres données. Dans sa réponse du 10 novembre, l'observatoire signalait **863 pétitions publiées absentes**, représentant environ **1,46 million de signatures** dans son relevé. Il a publié une [page de suivi des pétitions absentes du fichier](https://suiteadonner.nucom.fr/absentes-du-fichier) et renvoyé vers le signalement GitHub.

L'écart de **deux pétitions** entre les 863 signalées par cet observatoire et les 861 ajoutées par l'Atlas reste à comparer **par identifiants**, en tenant compte des critères et des heures de vérification. Ces deux résultats ne doivent pas être présentés comme parfaitement identiques. Le cumul des signatures ne désigne pas nécessairement autant de signataires différents.

L'Atlas permet de découvrir les pétitions et leurs proximités ; « Suite à donner » permet de poursuivre leur parcours jusqu'aux décisions parlementaires disponibles. Les fiches de l'Atlas proposent des liens par numéro officiel vers cet autre observatoire.

## Ce qui reste à surveiller

- Le **statut de l'issue n° 839** et une éventuelle correction du producteur du CSV. Une liste qui se vide dans le rattrapage ne prouve pas, à elle seule, pourquoi elle s'est vidée.
- La différence entre **date du fichier ouvert**, **date de vérification d'une fiche récupérée** et **date de publication de la pétition**.
- Les fiches dont la description officielle accessible est incomplète, dont des champs ne sont pas renseignés, ou dont le format change.
- L'absence de dénombrement fiable des personnes distinctes ayant signé plusieurs pétitions.
- La comparaison nominative des **numéros officiels**, pour comprendre l'écart 861 / 863, sans spéculer sur les auteurs ou une action coordonnée.

L'objectif est de rendre visibles les limites d'un jeu de données, la méthode employée pour l'enrichir et le travail indépendant que chacun peut vérifier. Toutes les pétitions conservent leur numéro et leur lien vers l'Assemblée nationale. L'Atlas est une expérimentation de [Radio du Futur](https://radiodufutur.com/), sans affiliation à l'Assemblée nationale.
