"""Moteur de rapprochement : TF-IDF de mots, n-grammes de caractères, règles explicites.

Principes :
- le score sert uniquement à classer techniquement des résultats ;
- une proximité n'est jamais une identité de revendication ;
- un « désaccord » n'est proposé que sur des indices explicites et jamais sur
  la seule proximité lexicale ;
- tout est déterministe et reproductible, sans service externe.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

import numpy as np
from scipy.cluster.hierarchy import fcluster, linkage
from scipy.spatial.distance import squareform
from sklearn.feature_extraction.text import TfidfVectorizer

from . import ALGORITHM_VERSION
from .textnorm import clean_text, fold, stem, tokens


@dataclass(frozen=True)
class Thresholds:
    # Pondération du score technique (somme = 1).
    w_title: float = 0.30
    w_body: float = 0.45
    w_chars: float = 0.25
    # Seuils de typage des relations.
    near_score: float = 0.62
    near_title: float = 0.80
    related_score: float = 0.21
    min_shared_terms: int = 3
    oppose_title: float = 0.30
    neighbours_per_petition: int = 10
    # Couche sémantique (voir semantic.py) : candidats du modèle de langue confirmés par le vocabulaire.
    sem_similarity: float = 0.90
    sem_mutual_k: int = 5
    sem_min_lexical: float = 0.12
    # Dossiers (liage moyen, donc sans effet de chaîne).
    dossier_distance: float = 0.80
    dossier_min_size: int = 3
    dossier_max_size: int = 45


# Couples d'antonymes explicites : un désaccord n'est suggéré que si deux titres
# portent chacun un côté opposé du même couple, sur un sujet partagé.
ANTONYM_PAIRS: list[tuple[set[str], set[str]]] = [
    ({stem(w) for w in ("interdire", "interdiction", "bannir", "prohiber", "interdit")},
     {stem(w) for w in ("autoriser", "autorisation", "legaliser", "legalisation", "depenaliser", "depenalisation")}),
    ({stem(w) for w in ("supprimer", "suppression", "abroger", "abrogation", "abolir", "abolition")},
     {stem(w) for w in ("maintenir", "retablir", "retablissement", "instaurer", "creer", "creation", "preserver", "sauvegarder", "promulguer", "promulgation")}),
    ({stem(w) for w in ("obligatoire", "obligation", "obliger")},
     {stem(w) for w in ("facultatif", "refuser", "refus", "liberte", "libre")}),
    ({stem(w) for w in ("augmenter", "augmentation", "hausse", "relever")},
     {stem(w) for w in ("baisser", "baisse", "diminuer", "diminution", "reduire", "reduction", "abaisser")}),
]
_CUE_STEMS = {s for left, right in ANTONYM_PAIRS for s in left | right}

TYPE_NEAR, TYPE_RELATED, TYPE_OPPOSED = "proche", "complementaire", "comparaison"


@dataclass
class Corpus:
    ids: list[str]
    titles: list[str]
    title_stems: list[list[str]]
    body_stems: list[list[str]]  # titre + description
    surface: dict[str, str] = field(default_factory=dict)


def build_corpus(ids: list[str], titles: list[str], descriptions: list[str]) -> Corpus:
    surface_counts: dict[str, Counter] = {}
    title_stems: list[list[str]] = []
    body_stems: list[list[str]] = []
    for title, description in zip(titles, descriptions):
        t_tokens = tokens(title)
        b_tokens = t_tokens + tokens(description)
        for word in b_tokens:
            surface_counts.setdefault(stem(word), Counter())[word] += 1
        title_stems.append([stem(w) for w in t_tokens])
        body_stems.append([stem(w) for w in b_tokens])
    surface = {
        s: sorted(c.items(), key=lambda kv: (-kv[1], len(kv[0]), kv[0]))[0][0] for s, c in surface_counts.items()
    }
    return Corpus(ids, titles, title_stems, body_stems, surface)


@dataclass
class Engine:
    corpus: Corpus
    thresholds: Thresholds
    title_matrix: object
    body_matrix: object
    body_features: np.ndarray
    title_sim: np.ndarray
    body_sim: np.ndarray
    char_sim: np.ndarray
    score: np.ndarray


def _tfidf_words(docs: list[list[str]], max_df: float) -> TfidfVectorizer:
    return TfidfVectorizer(
        tokenizer=str.split, preprocessor=None, lowercase=False, token_pattern=None,
        ngram_range=(1, 2), sublinear_tf=True, min_df=2, max_df=max_df, dtype=np.float32,
    )


def _dense_cosine(matrix) -> np.ndarray:
    sim = (matrix @ matrix.T).toarray().astype(np.float32)
    np.fill_diagonal(sim, 0.0)
    return np.clip(sim, 0.0, 1.0)


def build_engine(corpus: Corpus, descriptions: list[str], thresholds: Thresholds = Thresholds()) -> Engine:
    title_docs = [" ".join(s) for s in corpus.title_stems]
    body_docs = [" ".join(s) for s in corpus.body_stems]

    title_vec = _tfidf_words(corpus.title_stems, max_df=0.30)
    title_matrix = title_vec.fit_transform(title_docs)
    body_vec = _tfidf_words(corpus.body_stems, max_df=0.30)
    body_matrix = body_vec.fit_transform(body_docs)

    char_docs = [fold(clean_text(f"{t}. {d[:700]}")) for t, d in zip(corpus.titles, descriptions)]
    char_vec = TfidfVectorizer(
        analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=3, max_df=0.5,
        max_features=200_000, dtype=np.float32,
    )
    char_matrix = char_vec.fit_transform(char_docs)

    title_sim = _dense_cosine(title_matrix)
    body_sim = _dense_cosine(body_matrix)
    char_sim = _dense_cosine(char_matrix)
    score = thresholds.w_title * title_sim + thresholds.w_body * body_sim + thresholds.w_chars * char_sim
    return Engine(
        corpus, thresholds, title_matrix, body_matrix,
        np.array(body_vec.get_feature_names_out()), title_sim, body_sim, char_sim, score.astype(np.float32),
    )


def shared_terms(engine: Engine, i: int, j: int, limit: int = 5) -> list[str]:
    """Termes caractéristiques communs, dans leur forme la plus fréquente."""
    common = engine.body_matrix[i].minimum(engine.body_matrix[j]).tocoo()
    if common.nnz == 0:
        return []
    order = np.argsort(-common.data)
    result: list[str] = []
    seen_roots: set[str] = set()
    for k in order:
        feature = str(engine.body_features[common.col[k]])
        parts = feature.split()
        if any(p in seen_roots for p in parts):
            continue
        result.append(" ".join(engine.corpus.surface.get(p, p) for p in parts))
        seen_roots.update(parts)
        if len(result) >= limit:
            break
    return result


def opposed_cues(stems_a: list[str], stems_b: list[str]) -> list[str]:
    """Indices d'antonymes portés chacun par un seul des deux titres."""
    set_a, set_b = set(stems_a), set(stems_b)
    for left, right in ANTONYM_PAIRS:
        a_left, a_right, b_left, b_right = set_a & left, set_a & right, set_b & left, set_b & right
        if a_left and b_right and not a_right and not b_left:
            return sorted(a_left | b_right)
        if a_right and b_left and not a_left and not b_right:
            return sorted(a_right | b_left)
    return []


def classify_pair(engine: Engine, i: int, j: int) -> dict | None:
    th = engine.thresholds
    s = float(engine.score[i, j])
    t = float(engine.title_sim[i, j])
    terms = shared_terms(engine, i, j)

    if s >= th.near_score or (t >= th.near_title and float(engine.body_sim[i, j]) >= 0.35):
        kind = TYPE_NEAR
    elif s >= th.related_score and len(terms) >= th.min_shared_terms:
        kind = TYPE_RELATED
    else:
        return None

    cues: list[str] = []
    if t >= th.oppose_title:
        found = opposed_cues(engine.corpus.title_stems[i], engine.corpus.title_stems[j])
        topical = (set(engine.corpus.title_stems[i]) & set(engine.corpus.title_stems[j])) - _CUE_STEMS
        if found and len(topical) >= 2:
            kind = TYPE_OPPOSED
            cues = [engine.corpus.surface.get(c, c) for c in found]
    return {
        "a": engine.corpus.ids[i], "b": engine.corpus.ids[j], "type": kind, "score": round(s, 4),
        "title": round(t, 3), "terms": terms, "cues": cues,
    }


def candidate_edges(engine: Engine) -> list[dict]:
    """Voisins les plus proches de chaque pétition, typés, dédoublonnés."""
    n = len(engine.corpus.ids)
    k = engine.thresholds.neighbours_per_petition
    seen: set[tuple[int, int]] = set()
    edges: list[dict] = []
    top = np.argpartition(-engine.score, kth=min(k, n - 1), axis=1)[:, :k]
    for i in range(n):
        for j in top[i]:
            j = int(j)
            if i == j:
                continue
            key = (i, j) if i < j else (j, i)
            if key in seen:
                continue
            seen.add(key)
            edge = classify_pair(engine, *key)
            if edge:
                edges.append(edge)
    edges.sort(key=lambda e: (-e["score"], int(e["a"]), int(e["b"])))
    return edges


def cluster_dossiers(engine: Engine) -> list[list[int]]:
    """Liage moyen sur 1 - score : un voisin intermédiaire ne suffit pas à agréger."""
    th = engine.thresholds
    n = len(engine.corpus.ids)
    distance = 1.0 - engine.score.astype(np.float64)
    np.fill_diagonal(distance, 0.0)
    tree = linkage(squareform(distance, checks=False), method="average")
    labels = fcluster(tree, t=th.dossier_distance, criterion="distance")

    groups: dict[int, list[int]] = {}
    for index, label in enumerate(labels):
        groups.setdefault(int(label), []).append(index)

    def split(members: list[int], cut: float) -> list[list[int]]:
        if len(members) <= th.dossier_max_size:
            return [members]
        sub = distance[np.ix_(members, members)]
        sub_tree = linkage(squareform(sub, checks=False), method="average")
        sub_labels = fcluster(sub_tree, t=cut - 0.03, criterion="distance")
        parts: dict[int, list[int]] = {}
        for pos, label in zip(members, sub_labels):
            parts.setdefault(int(label), []).append(pos)
        if len(parts) == 1:
            return [members[: th.dossier_max_size]]
        out: list[list[int]] = []
        for part in parts.values():
            out.extend(split(part, cut - 0.03))
        return out

    clusters: list[list[int]] = []
    for members in groups.values():
        for part in split(members, th.dossier_distance):
            if len(part) >= th.dossier_min_size:
                clusters.append(sorted(part))
    clusters.sort(key=lambda m: (-len(m), m[0]))
    return clusters


def cohesion(engine: Engine, members: list[int]) -> float:
    if len(members) < 2:
        return 0.0
    sub = engine.score[np.ix_(members, members)]
    return float(sub.sum() / (len(members) * (len(members) - 1)))


def spring_layout(weights: np.ndarray, iterations: int = 420, neighbours: int = 3) -> np.ndarray:
    """Fruchterman-Reingold déterministe sur le graphe des plus proches voisins.

    Seuls les `neighbours` liens les plus forts de chaque pétition attirent ; sinon une
    attraction généralisée écraserait tout le dossier en une boule illisible.
    """
    n = weights.shape[0]
    if n == 1:
        return np.zeros((1, 2))
    w = weights.astype(np.float64).copy()
    np.fill_diagonal(w, 0.0)
    keep = np.zeros_like(w, dtype=bool)
    for i, cols in enumerate(np.argsort(-w, axis=1, kind="stable")[:, : min(neighbours, n - 1)]):
        keep[i, cols] = True
    keep |= keep.T
    adjacency = np.where(keep, w / (w.max() or 1.0), 0.0)

    angle = np.linspace(0, 2 * np.pi, n, endpoint=False)
    pos = np.stack([np.cos(angle), np.sin(angle)], axis=1) * (0.6 + 0.4 * ((np.arange(n) * 7) % 5) / 4)[:, None]
    k = 1.5 / np.sqrt(n)
    temp = 0.2
    for _ in range(iterations):
        delta = pos[:, None, :] - pos[None, :, :]
        dist = np.linalg.norm(delta, axis=2) + 1e-6
        unit = delta / dist[:, :, None]
        repulse = (k * k / dist)[:, :, None] * unit
        attract = -((dist * dist / k) * adjacency)[:, :, None] * unit
        force = repulse.sum(axis=1) + attract.sum(axis=1)
        norm = np.linalg.norm(force, axis=1, keepdims=True) + 1e-9
        pos += force / norm * np.minimum(norm, temp)
        temp = max(0.004, temp * 0.987)

    pos -= pos.mean(axis=0)
    radius = np.linalg.norm(pos, axis=1)
    scale = np.percentile(radius, 90) or 1.0
    pos = pos / scale * 0.85
    radius = np.linalg.norm(pos, axis=1)
    too_far = radius > 1.0
    pos[too_far] = pos[too_far] / radius[too_far, None]

    min_gap = 0.11
    for _ in range(60):
        delta = pos[:, None, :] - pos[None, :, :]
        dist = np.linalg.norm(delta, axis=2) + 1e-9
        np.fill_diagonal(dist, np.inf)
        close = dist < min_gap
        if not close.any():
            break
        safe = np.where(close, dist, 1.0)
        push = np.where(close, (min_gap - safe) / safe / 2, 0.0)[:, :, None] * delta
        pos += push.sum(axis=1)
    return pos
