# L'Atlas des pétitions

> Le code et les données de [radiodufutur.com/atlas](https://radiodufutur.com/atlas/), publiés pour que chacun puisse voir comment ça marche, le vérifier et le réutiliser.

Moteur citoyen de découverte et de rapprochement des pétitions de l'Assemblée nationale.
**Expérimentation indépendante, sans affiliation institutionnelle** : on ne peut pas signer ici, chaque fiche renvoie vers la
pétition officielle.

Des milliers de propositions existent déjà. L'Atlas les rend visibles, comparables et reliées :

- **Votre idée** : on écrit sa pétition, l'Atlas montre les pétitions et la constellation les plus proches (tout reste dans le navigateur).
- **Explorer** : recherche tolérante aux accents et aux fautes, élargie par termes voisins et par rapprochements ; filtres
  combinables (famille, statut, période, soutiens, commission) ; adresses partageables ; export CSV / JSON.
- **Constellations** : cartes interactives de sujets (positions calculées hors navigateur), avec version texte.
- **Comparer** : deux à quatre pétitions côte à côte, passages communs surlignés, termes distinctifs (calcul signalé comme tel).
- **Fiches** : faits du jeu de données, texte tel que publié, pétitions proches **avec le motif du rapprochement**, lien officiel.
- **Les invisibles** : pétitions peu soutenues, seuils réglables, « Surprenez-moi » reproductible par graine.
- **Méthode et données** : sources, limites, algorithme, provenance, comment signaler une erreur.

Données : [« Pétitions de l'Assemblée nationale »](https://www.data.gouv.fr/datasets/petitions-de-lassemblee-nationale)
(data.gouv.fr, jeu `6889cc10e79a25f17ed69acb`), **Licence Ouverte / Open Licence 2.0**. Rien n'est inventé : si le CSV est
inaccessible, le pipeline échoue et conserve le dernier catalogue fiable.

## Lancer

Prérequis : Node 20+ (testé avec 22) ; Python 3.10+ uniquement pour régénérer les données.

```bash
npm install
npm run dev          # http://localhost:5173/
```

Le catalogue réel est déjà dans `public/data/` : l'application fonctionne sans Python.

## Tester et construire

```bash
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest : recherche, filtres, comparaison, export… sur les vrais fichiers de public/data
pip install -r pipeline/requirements.txt
npm run test:pipeline  # pytest : import CSV, schéma, doublons, normalisation, moteur, curation, téléchargement
npm run build        # typecheck + build statique dans dist/
npm run preview
```

## Actualiser les données

```bash
npm run data:update      # télécharge le dernier CSV principal (métadonnées data.gouv.fr), valide, reconstruit
npm run data:fetch       # téléchargement seul   → data/raw/ (ignoré par git)
npm run data:build       # reconstruction seule  → public/data/ + docs/AUDIT-CATALOGUE.md
python pipeline/run.py build --from-csv chemin/petitions.csv   # CSV déjà téléchargé (provenance « copie locale »)
```

Le build se fait dans un dossier temporaire, est validé (identifiants uniques, relations valides, chute suspecte du
corpus), puis remplace `public/data/`. **En cas d'échec, le catalogue précédent est conservé.**
`public/data/provenance.json` garde l'historique : date, empreinte SHA-256, nombre de pétitions, version du moteur.

Le catalogue publié ici est actualisé chaque semaine, quand l'Assemblée republie son fichier.

La date affichée (« fichier du … », « soutiens au … ») est celle du **fichier**, lue dans l'en-tête `Last-Modified` du
téléchargement : la métadonnée `last_modified` de data.gouv.fr n'est pas renouvelée quand le contenu change à adresse
constante (elle est restée au 26 octobre pour le fichier du 2 novembre 2026).

## Publier ailleurs

`npm run build` produit dans `dist/` un site statique, publiable tel quel sur n'importe quel hébergement : base relative et navigation par fragment (`#/…`).

## Organisation

```
atlas-des-petitions/
  src/                 application React + TypeScript (Vite) ; src/lib = logique pure et testée
  public/data/         catalogue produit par le pipeline (JSON) — voir ci-dessous
  pipeline/            pipeline Python : fetch, ingest, textnorm, taxonomy, matching, curation, audit, build
  pipeline/curation/   corrections humaines versionnées (relations, thèmes, libellés)
  pipeline/tests/      pytest
  docs/AUDIT-CATALOGUE.md   rapport d'audit généré
```

`public/data/` : `catalog.json` (liste légère), `search.json` (index, chargé à la première recherche), `relations.json`
(rapprochements typés avec motifs), `dossiers.json` (constellations et positions), `details/*.json` (texte intégral du jeu
de données, chargé à la demande), `stats.json`, `taxonomy.json`, `meta.json`, `provenance.json`.

## Le moteur de rapprochement

Reproductible, sans API externe (scikit-learn, scipy). Texte nettoyé et radicalisé (texte original jamais modifié) ; trois
proximités — TF-IDF du titre, TF-IDF du texte (mots et bigrammes), n-grammes de caractères — combinées en un **indice
technique** qui ne sert qu'à classer. Quatre types de relation : textes très proches, propositions complémentaires,
pistes de comparaison (antonymes explicites dans les titres, jamais sur la seule proximité lexicale), rapprochement
thématique (même dossier). Les dossiers viennent d'un regroupement hiérarchique à liage moyen, sans effet de chaîne. Les
seuils vivent dans `Thresholds` (`pipeline/atlas_pipeline/matching.py`) et sont publiés dans `meta.json` et sur la page
Méthode. Le détail et les limites : page « Méthode et données » de l'application.

### Couche sémantique (depuis `rapprochement-1.1.0`)

Le moteur lexical ne voit pas deux idées identiques écrites avec d'autres mots. Une couche de sens les propose : le modèle
open source **intfloat/multilingual-e5-small** (licence MIT, révision figée dans `pipeline/atlas_pipeline/semantic.py`)
transforme chaque pétition en vecteur ; une paire **de plus** n'est retenue que si

- sa similarité de sens est ≥ 0,90 ;
- chacune est parmi les 5 plus proches voisines de l'autre (évite les pétitions « génériques ») ;
- le score lexical atteint 0,12 (le sens propose, les mots confirment : seul, le sens produisait trop de faux rapprochements) ;
- la paire n'existe pas déjà.

Ces relations sont marquées `origin: "semantique"` (9ᵉ et 10ᵉ champs de `relations.json`) et signalées sur les fiches.
Sur le catalogue du 2 novembre : +1 039 relations, couverture des pétitions ayant au moins une voisine précise de 66,7 % à
74,7 %. Les constellations (dossiers) ne changent pas : elles restent calculées par le moteur lexical.

Les vecteurs sont en cache dans `pipeline/cache/embeddings.npz` (clé = empreinte du texte + révision du modèle, float16, ~3 Mo) :
la mise à jour hebdomadaire ne calcule que les pétitions nouvelles ou modifiées, et ne charge le modèle que s'il y en a.

```bash
pip install -r pipeline/requirements-semantic.txt   # torch (CPU) + transformers, seulement si des vecteurs sont à calculer
python pipeline/run.py build                        # avec la couche sémantique (défaut)
python pipeline/run.py build --no-semantic          # moteur lexical seul
ATLAS_EMBED_MODEL_DIR=/chemin/e5small python pipeline/run.py build   # modèle déjà téléchargé (poste sans accès au Hub)
```

Si des vecteurs manquent et que le modèle est indisponible, le build **échoue** et le dernier catalogue fiable est conservé :
il ne bascule jamais en silence vers un autre moteur.

Principes : aucun total de soutiens n'est jamais calculé ; la popularité n'est qu'un filtre ; les familles thématiques sont
une catégorisation automatique non officielle ; aucun compte, aucun suivi (favoris dans le `localStorage`).

## Limites connues

- Écart avec le catalogue public ouvert **non chiffré** : le site officiel refuse les requêtes automatisées. Procédure de
  relevé manuel dans `pipeline/curation/README.md`.
- La description du CSV peut être plus courte que le texte intégral.
- Un seul instantané : pas d'historique d'évolution des soutiens (la provenance est conservée pour le permettre).
- Le français est radicalisé de façon légère (pas de lemmatisation) ; la détection de divergences est volontairement
  étroite.

## Signaler une erreur, modifier le code

Une erreur dans un rapprochement ou une donnée : écrivez à radiodufutur@protonmail.com en indiquant les numéros de pétitions concernés.

Ce dépôt est une copie publique, en lecture : il est mis à jour depuis le projet Radio du Futur et n'accepte pas de contributions directes. Vous pouvez en faire votre propre copie et la modifier librement dans le cadre de la licence ; une copie modifiée n'a aucun effet sur radiodufutur.com et n'engage pas Radio du Futur.

## Licences

- **Code** : licence MIT (`LICENSE`).
- **Données** (`public/data/`, `docs/AUDIT-CATALOGUE.md`) : issues des « Pétitions de l'Assemblée nationale », Licence Ouverte / Open Licence 2.0. Les textes appartiennent à leurs auteurs et sont repris tels que publiés par l'Assemblée.
