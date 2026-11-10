# Curation humaine des rapprochements

`relations.json` est relu à chaque reconstruction (`python -m atlas_pipeline build`). Il permet de corriger le moteur
sans toucher au code. Rien n'est jamais modifié dans les textes sources : on ne corrige que des **relations**, des
**thèmes** et des **libellés de dossier**.

```json
{
  "version": 1,
  "confirm": [{ "a": "6", "b": "7", "type": "comparaison", "note": "orientations opposées vérifiées dans les textes" }],
  "add":     [{ "a": "9", "b": "10", "type": "complementaire", "note": "même sujet, demandes distinctes" }],
  "reject":  [{ "a": "12", "b": "30", "note": "faux rapprochement : seul le mot « retraite » est partagé" }],
  "dossier_labels": { "d3051": "Loi Duplomb" },
  "theme_overrides": { "5736": ["medias", "democratie"] }
}
```

- `confirm` : valide un rapprochement calculé (étiquette « confirmé »). Avec `type`, il le **corrige** (« corrigé »).
- `add` : ajoute une relation que le moteur n'a pas vue (« ajouté »). Les deux identifiants doivent exister.
- `reject` : supprime la relation, et empêche qu'elle revienne sous forme de rapprochement thématique.
- `dossier_labels` : remplace le libellé automatique d'un dossier (l'identifiant d'un dossier est `d` + le plus petit
  identifiant de ses pétitions).
- `theme_overrides` : remplace les familles thématiques d'une pétition.

Types valides : `proche`, `complementaire`, `comparaison`. Chaque relation conserve son origine (automatique ou humaine)
et la mention est visible sur les fiches.

## Écart avec le catalogue public

Pour documenter l'écart entre le fichier et le catalogue ouvert,
relever à la main le nombre affiché, puis créer `public-count.json` :

```json
{ "count": 4200, "observed_on": "2026-11-02", "note": "relevé manuel sur la page des initiatives" }
```

Le rapport `docs/AUDIT-CATALOGUE.md` et la page « Méthode et données » l'intègrent à la reconstruction suivante.
