"""Couche sémantique : des vecteurs de sens pour retrouver des idées voisines écrites avec d'autres mots.

Le moteur lexical (TF-IDF, caractères) reste le socle. Cette couche ne fait que **proposer des candidats** :
une paire n'est retenue que si un modèle de langue open source la juge très proche (voisines mutuelles) ET
que le vocabulaire des deux textes se recoupe un peu (garde-fou lexical). Le score sémantique, seul, produisait
trop de faux rapprochements (« Stop financement Ukraine » avec « Destitution de Macron »).

- Modèle : intfloat/multilingual-e5-small (licence MIT), figé à une révision précise.
- Aucun service externe à l'exécution ; les vecteurs sont mis en cache dans le dépôt (clé = empreinte du texte),
  si bien que la mise à jour hebdomadaire ne calcule que les pétitions nouvelles ou modifiées.
- Les vecteurs sont stockés en float16 et toujours relus ainsi : un calcul frais et un calcul en cache donnent
  exactement les mêmes paires.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

from .textnorm import clean_text

MODEL_ID = "intfloat/multilingual-e5-small"
MODEL_REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"
MAX_LENGTH = 256
TEXT_CHARS = 700
BATCH = 32

Embedder = Callable[[list[str]], np.ndarray]


class SemanticUnavailable(RuntimeError):
    """Bibliothèques ou modèle absents alors que des vecteurs restent à calculer."""


def embedding_text(title: str, description: str) -> str:
    # Le préfixe « query: » est la convention du modèle pour comparer des textes entre eux.
    return f"query: {title}. {clean_text(description)[:TEXT_CHARS]}"


def text_key(text: str) -> str:
    return hashlib.sha1(f"{MODEL_REVISION}|{MAX_LENGTH}|{text}".encode("utf-8")).hexdigest()


def _quantize(vectors: np.ndarray) -> np.ndarray:
    return vectors.astype(np.float16)


@dataclass
class VectorStats:
    total: int
    cached: int
    computed: int


def load_vectors(
    texts: list[str], cache_path: Path, embedder: Embedder | None = None,
) -> tuple[np.ndarray, VectorStats]:
    """Vecteurs de tous les textes ; seuls ceux absents du cache passent par le modèle."""
    keys = [text_key(t) for t in texts]
    known: dict[str, np.ndarray] = {}
    if cache_path.exists():
        with np.load(cache_path, allow_pickle=False) as data:
            known = dict(zip(data["keys"].tolist(), data["vectors"]))
    missing = [i for i, k in enumerate(keys) if k not in known]
    if missing:
        embedder = embedder or transformers_embedder()
        fresh = _quantize(embedder([texts[i] for i in missing]))
        for i, vector in zip(missing, fresh):
            known[keys[i]] = vector
    matrix = np.stack([known[k] for k in keys]) if keys else np.zeros((0, 0), dtype=np.float16)
    if missing or not cache_path.exists():
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(cache_path, keys=np.array(keys), vectors=matrix)
    return matrix.astype(np.float32), VectorStats(len(texts), len(texts) - len(missing), len(missing))


def transformers_embedder(model_dir: str | None = None) -> Embedder:
    """Embedder CPU basé sur transformers + torch (importés ici : le reste du pipeline n'en a pas besoin).

    `ATLAS_EMBED_MODEL_DIR` permet d'utiliser un dossier local (poste sans accès direct au Hub).
    """
    try:
        import torch
        from transformers import AutoModel, AutoTokenizer
    except ImportError as error:  # pragma: no cover - dépend de l'environnement
        raise SemanticUnavailable(
            "torch et transformers sont nécessaires pour calculer de nouveaux vecteurs "
            "(pip install -r pipeline/requirements-semantic.txt), ou lancer avec --no-semantic."
        ) from error

    source = model_dir or os.environ.get("ATLAS_EMBED_MODEL_DIR")
    kwargs = {} if source else {"revision": MODEL_REVISION}
    try:
        tokenizer = AutoTokenizer.from_pretrained(source or MODEL_ID, **kwargs)
        model = AutoModel.from_pretrained(source or MODEL_ID, **kwargs).eval()
    except OSError as error:  # pragma: no cover - réseau / modèle absent
        raise SemanticUnavailable(f"Modèle {MODEL_ID} introuvable : {error}") from error

    def embed(texts: list[str]) -> np.ndarray:
        order = np.argsort([len(t) for t in texts], kind="stable")  # lots homogènes, plus rapides
        out = np.zeros((len(texts), model.config.hidden_size), dtype=np.float32)
        with torch.no_grad():
            for start in range(0, len(texts), BATCH):
                idx = order[start:start + BATCH]
                encoded = tokenizer([texts[i] for i in idx], padding=True, truncation=True, max_length=MAX_LENGTH, return_tensors="pt")
                hidden = model(**encoded).last_hidden_state
                mask = encoded["attention_mask"].unsqueeze(-1).float()
                pooled = (hidden * mask).sum(1) / mask.sum(1)
                out[idx] = torch.nn.functional.normalize(pooled, dim=1).numpy()
        return out

    return embed


def semantic_edges(
    vectors: np.ndarray,
    ids: list[str],
    lexical_score: np.ndarray,
    existing: set[tuple[str, str]],
    shared_terms_fn,
    opposed_fn,
    similarity: float,
    mutual_k: int,
    min_lexical: float,
) -> list[dict]:
    """Paires proposées par le sens et confirmées par le vocabulaire commun.

    - similarité cosinus >= `similarity` ;
    - chacune dans les `mutual_k` plus proches voisines de l'autre (évite les pétitions « génériques » qui
      ressemblent à tout) ;
    - score lexical >= `min_lexical` ;
    - absente des relations déjà calculées.
    """
    n = len(ids)
    sim = vectors @ vectors.T
    np.fill_diagonal(sim, -1.0)
    k = min(mutual_k, n - 1)
    top = np.argpartition(-sim, kth=k - 1, axis=1)[:, :k]
    neighbours = [set(map(int, row)) for row in top]
    out: list[dict] = []
    for i in range(n):
        for j in sorted(neighbours[i]):
            if j <= i or i not in neighbours[j] or sim[i, j] < similarity:
                continue
            if float(lexical_score[i, j]) < min_lexical:
                continue
            a, b = sorted((ids[i], ids[j]), key=int)
            if (a, b) in existing:
                continue
            cues = opposed_fn(i, j)
            out.append({
                "a": a, "b": b,
                "type": "comparaison" if cues else "complementaire",
                "score": round(float(lexical_score[i, j]), 4),
                "title": 0.0,
                "terms": shared_terms_fn(i, j),
                "cues": cues,
                "src": "semantique",
                "sem": round(float(sim[i, j]), 3),
            })
    out.sort(key=lambda e: (-e["sem"], int(e["a"]), int(e["b"])))
    return out
