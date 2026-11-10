"""Construit les fichiers JSON de l'application à partir du CSV brut.

La construction se fait dans un dossier temporaire puis remplace atomiquement
`public/data` : si une étape échoue, le dernier catalogue fiable reste en place.
"""

from __future__ import annotations

import json
import shutil
from collections import Counter
from dataclasses import asdict
from pathlib import Path

import numpy as np

from . import ALGORITHM_VERSION, DATASET_PAGE, OFFICIAL_SITE
from .audit import build_audit, load_public_count, render_markdown
from .concepts import groups_as_stems
from .curation import apply_curation, load_curation
from .ingest import Petition, load_csv
from .recover import RECOVERED_FILE, load_recovered
from .matching import (
    Thresholds, build_corpus, build_engine, candidate_edges, cluster_dossiers, cohesion, opposed_cues, shared_terms,
    spring_layout,
)
from .semantic import (
    MAX_LENGTH, MODEL_ID, MODEL_REVISION, TEXT_CHARS, SemanticUnavailable, embedding_text, load_vectors, semantic_edges,
)
from .taxonomy import THEMES, assign_themes, public_taxonomy
from .textnorm import STOPWORDS, clean_text, stem, tokens

DETAIL_SHARD = 200
EXCERPT_CHARS = 190
MIN_DOSSIER_COHESION = 0.22
TYPE_CODE = {"proche": "p", "complementaire": "c", "comparaison": "o", "thematique": "t"}
THEMATIC_MIN_SCORE = 0.17
THEMATIC_PER_NODE = 4


class BuildError(RuntimeError):
    pass


def _dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def excerpt(description: str) -> str:
    text = clean_text(description)
    if len(text) <= EXCERPT_CHARS:
        return text
    cut = text[:EXCERPT_CHARS].rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:.") + "…"


def dossier_label(engine, members: list[int], limit: int = 4) -> tuple[list[str], str]:
    rows = engine.body_matrix[members]
    mean = np.asarray(rows.mean(axis=0)).ravel()
    names = engine.body_features
    order = np.argsort(-mean)
    terms: list[str] = []
    used: set[str] = set()
    for idx in order:
        feature = str(names[idx])
        if " " in feature or feature in used or mean[idx] <= 0:
            continue
        used.add(feature)
        terms.append(engine.corpus.surface.get(feature, feature))
        if len(terms) >= limit:
            break
    return terms, " · ".join(terms[:3])


def with_recovered(petitions: list[Petition], path: Path | None) -> tuple[list[Petition], dict | None]:
    """Ajoute au fichier les pétitions qu'il omet, dans l'ordre des numéros."""
    if path is None:
        return petitions, None
    extra, recovered = load_recovered(path, {p.id for p in petitions})
    return sorted(petitions + extra, key=lambda p: int(p.id)), recovered


def build_catalog(
    raw_dir: Path, out_dir: Path, docs_dir: Path | None, curation_path: Path, public_count_path: Path,
    thresholds: Thresholds = Thresholds(),
    vectors: np.ndarray | None = None,
    recovered_path: Path | None = None,
) -> dict:
    csv_path = raw_dir / "petitions.csv"
    source_path = raw_dir / "source.json"
    if not csv_path.exists() or not source_path.exists():
        raise BuildError("Données brutes absentes : lancer d'abord « fetch ».")
    source = json.loads(source_path.read_text(encoding="utf-8"))
    # Anciennes données brutes sans date propre au fichier : on retombe sur la métadonnée, en le disant.
    source.setdefault("file_date", source["resource_last_modified"])
    source.setdefault("file_date_origin", "metadonnee-data-gouv")
    ingest = load_csv(csv_path)
    # Pétitions que le fichier omet, relues sur le site officiel (recover.py) : elles rejoignent le corpus, datées.
    ingest.petitions, recovered = with_recovered(ingest.petitions, recovered_path)
    P: list[Petition] = ingest.petitions
    ids = [p.id for p in P]
    id_set = set(ids)

    corpus = build_corpus(ids, [p.title for p in P], [p.description for p in P])
    curation = load_curation(curation_path)
    themes: dict[str, list[str]] = {}
    for p, ts, bs in zip(P, corpus.title_stems, corpus.body_stems):
        themes[p.id] = curation["theme_overrides"].get(p.id) or assign_themes(ts, bs).themes

    engine = build_engine(corpus, [p.description for p in P], thresholds)
    lexical_edges = candidate_edges(engine)
    semantic: list[dict] = []
    if vectors is not None:
        if vectors.shape[0] != len(ids):
            raise BuildError("Les vecteurs sémantiques ne correspondent pas au corpus.")
        known = {tuple(sorted((e["a"], e["b"]), key=int)) for e in lexical_edges}
        semantic = semantic_edges(
            vectors, ids, engine.score, known,
            shared_terms_fn=lambda i, j: shared_terms(engine, i, j),
            opposed_fn=lambda i, j: [
                corpus.surface.get(c, c) for c in opposed_cues(corpus.title_stems[i], corpus.title_stems[j])
            ],
            similarity=thresholds.sem_similarity, mutual_k=thresholds.sem_mutual_k, min_lexical=thresholds.sem_min_lexical,
        )
    edges = apply_curation(lexical_edges + semantic, curation, id_set)

    position = {pid: i for i, pid in enumerate(ids)}
    dossiers: list[dict] = []
    dossier_of: dict[str, str] = {}
    for members in cluster_dossiers(engine):
        coh = cohesion(engine, members)
        if coh < MIN_DOSSIER_COHESION:
            continue
        sub = engine.score[np.ix_(members, members)]
        centrality = sub.mean(axis=1)
        order = np.argsort(-centrality, kind="stable")
        ordered = [members[k] for k in order]
        layout = spring_layout(sub[np.ix_(order, order)])
        did = "d" + str(min(int(ids[m]) for m in members))
        terms, label = dossier_label(engine, members)
        label = curation["dossier_labels"].get(did, label)
        counts = Counter(t for m in members for t in themes[ids[m]])
        dossier_themes = [t for t, c in counts.most_common(3) if c >= max(2, 0.25 * len(members))]
        years = [P[m].published[:4] for m in members if P[m].published]
        member_ids = {ids[m] for m in members}
        dossiers.append({
            "id": did, "label": label, "terms": terms, "size": len(members), "cohesion": round(coh, 3),
            "themes": dossier_themes, "years": [min(years), max(years)] if years else [],
            "central": ids[ordered[0]], "members": [ids[m] for m in ordered],
            "pos": [[round(float(x), 3), round(float(y), 3)] for x, y in layout],
            "relations": {},
        })
        for m in members:
            dossier_of[ids[m]] = did
    dossiers.sort(key=lambda d: (-d["size"], d["id"]))

    # Rapprochements thématiques : paires d'un même dossier dont le score dépasse un plancher.
    typed = {frozenset((e["a"], e["b"])) for e in edges}
    typed |= {frozenset((r["a"], r["b"])) for r in curation["reject"]}
    thematic: list[dict] = []
    for d in dossiers:
        idxs = [position[m] for m in d["members"]]
        used: Counter = Counter()
        pairs = sorted(
            ((float(engine.score[i, j]), i, j) for a, i in enumerate(idxs) for j in idxs[a + 1:]),
            key=lambda x: (-x[0], x[1], x[2]),
        )
        for score, i, j in pairs:
            if score < THEMATIC_MIN_SCORE:
                break
            if frozenset((ids[i], ids[j])) in typed or used[i] >= THEMATIC_PER_NODE or used[j] >= THEMATIC_PER_NODE:
                continue
            used[i] += 1
            used[j] += 1
            a, b = sorted((ids[i], ids[j]), key=int)
            thematic.append({"a": a, "b": b, "type": "thematique", "score": round(score, 4), "title": 0.0,
                             "terms": shared_terms(engine, i, j, 4), "cues": [], "human": None, "note": None})
    edges = edges + thematic
    for d in dossiers:
        members = set(d["members"])
        d["relations"] = dict(Counter(e["type"] for e in edges if e["a"] in members and e["b"] in members))

    commissions = sorted({p.commission for p in P if p.commission})
    commission_index = {c: i for i, c in enumerate(commissions)}
    catalog_rows = [
        [p.id, p.title, excerpt(p.description), p.published, p.votes, p.status,
         commission_index.get(p.commission, -1), p.legislature or "", themes[p.id], dossier_of.get(p.id, ""), p.read_on or ""]
        for p in P
    ]
    catalog = {
        "fields": ["id", "title", "excerpt", "published", "votes", "status", "commission", "legislature", "themes", "dossier", "read_on"],
        "commissions": commissions, "rows": catalog_rows,
    }

    search_docs = []
    for p, ts, bs in zip(P, corpus.title_stems, corpus.body_stems):
        title_set = set(ts)
        seen: list[str] = []
        for s in bs:
            if s not in title_set and s not in seen:
                seen.append(s)
        search_docs.append([p.id, " ".join(ts), " ".join(seen[:220])])
    search = {"docs": search_docs, "stopwords": sorted(STOPWORDS), "groups": groups_as_stems()}

    relations = {
        "algorithm": ALGORITHM_VERSION,
        "types": {"p": "proche", "c": "complementaire", "o": "comparaison", "t": "thematique"},
        "edges": [
            [e["a"], e["b"], TYPE_CODE[e["type"]], int(round(e["score"] * 1000)), e["terms"], e["cues"],
             e.get("human") or "", e.get("note") or "",
             "s" if e.get("src") == "semantique" else "", int(round(e.get("sem", 0) * 1000))]
            for e in edges
        ],
    }

    details_dir = out_dir / "details"
    shards: dict[int, dict] = {}
    for p in P:
        shards.setdefault(int(p.id) // DETAIL_SHARD, {})[p.id] = {
            "d": p.description, "x": p.decision, "l": p.deadline, "u": p.url,
        }
    for shard, content in shards.items():
        _dump(details_dir / f"{shard}.json", content)

    public_count = load_public_count(public_count_path)
    audit = build_audit(ingest, themes, edges, dossiers, public_count)
    stats = {
        "years": audit["years"], "year_status": audit["year_status"], "status": audit["status"],
        "vote_buckets": audit["vote_buckets"], "votes": audit["votes"],
        "commissions": audit["commissions"], "themes": audit["themes"], "relations": audit["relations"],
    }
    meta = {
        "schema": 1,
        "source": source,
        "dataset_page": DATASET_PAGE,
        "official_site": OFFICIAL_SITE,
        "counts": {
            "petitions": len(P), "relations": len(edges), "dossiers": len(dossiers),
            "in_dossiers": sum(d["size"] for d in dossiers), "themed": sum(1 for t in themes.values() if t),
            "semantic_relations": sum(1 for e in edges if e.get("src") == "semantique"),
        },
        "detail_shard": DETAIL_SHARD,
        "url_exceptions": {p.id: p.url for p in P if p.url != f"{OFFICIAL_SITE}/i-{p.id}"},
        "algorithm": {
            "version": ALGORITHM_VERSION, "thresholds": asdict(thresholds),
            "min_dossier_cohesion": MIN_DOSSIER_COHESION,
            "semantic": None if vectors is None else {
                "model": MODEL_ID, "revision": MODEL_REVISION, "max_length": MAX_LENGTH, "text_chars": TEXT_CHARS,
            },
        },
        "public_count": public_count,
        "recovered": recovered,
        "warnings": ingest.warnings,
    }

    _dump(out_dir / "catalog.json", catalog)
    _dump(out_dir / "search.json", search)
    _dump(out_dir / "relations.json", relations)
    _dump(out_dir / "dossiers.json", dossiers)
    _dump(out_dir / "stats.json", stats)
    _dump(out_dir / "taxonomy.json", public_taxonomy())
    _dump(out_dir / "meta.json", meta)

    entry = {
        "retrieved_at": source["retrieved_at"], "file_date": source["file_date"],
        "file_date_origin": source["file_date_origin"], "resource_last_modified": source["resource_last_modified"],
        "sha256": source["sha256"], "petitions": len(P), "algorithm": ALGORITHM_VERSION,
    }
    meta["_provenance_entry"] = entry

    if docs_dir is not None:
        docs_dir.mkdir(parents=True, exist_ok=True)
        (docs_dir / "AUDIT-CATALOGUE.md").write_text(
            render_markdown(audit, meta, {t["id"]: t["label"] for t in THEMES}), encoding="utf-8"
        )
    return meta


def validate_output(out_dir: Path, previous_dir: Path | None = None) -> list[str]:
    """Contrôles de cohérence : toute erreur empêche le remplacement du catalogue."""
    problems: list[str] = []
    meta = json.loads((out_dir / "meta.json").read_text(encoding="utf-8"))
    catalog = json.loads((out_dir / "catalog.json").read_text(encoding="utf-8"))
    ids = [row[0] for row in catalog["rows"]]
    if len(ids) != len(set(ids)):
        problems.append("Identifiants dupliqués dans le catalogue.")
    if meta["counts"]["petitions"] != len(ids):
        problems.append("Le compteur du méta ne correspond pas au catalogue.")
    known = set(ids)
    relations = json.loads((out_dir / "relations.json").read_text(encoding="utf-8"))
    for a, b, *_ in relations["edges"]:
        if a not in known or b not in known:
            problems.append(f"Relation vers une pétition inconnue : {a}-{b}")
            break
    for row in catalog["rows"]:
        if not row[1]:
            problems.append(f"Titre vide pour {row[0]}")
            break
    if previous_dir and (previous_dir / "meta.json").exists():
        before = json.loads((previous_dir / "meta.json").read_text(encoding="utf-8"))["counts"]["petitions"]
        if len(ids) < 0.9 * before:
            problems.append(f"Chute suspecte du corpus : {before} → {len(ids)} pétitions.")
    return problems


def _replace_directory(new_dir: Path, final_dir: Path) -> None:
    """Remplace le contenu de `final_dir` en gardant une copie de repli (sans renommer le dossier,
    qu'un serveur de développement ou un antivirus peut verrouiller sous Windows)."""
    backup_dir = final_dir.with_name(final_dir.name + ".previous")
    shutil.rmtree(backup_dir, ignore_errors=True)
    if final_dir.exists():
        shutil.copytree(final_dir, backup_dir)
    try:
        if final_dir.exists():
            for child in final_dir.iterdir():
                shutil.rmtree(child) if child.is_dir() else child.unlink()
        shutil.copytree(new_dir, final_dir, dirs_exist_ok=True)
    except OSError:
        if backup_dir.exists():
            shutil.copytree(backup_dir, final_dir, dirs_exist_ok=True)
        raise
    finally:
        shutil.rmtree(new_dir, ignore_errors=True)
    shutil.rmtree(backup_dir, ignore_errors=True)


def compute_vectors(app_root: Path, embedder=None):
    """Vecteurs sémantiques de toutes les pétitions (cache dans pipeline/cache/embeddings.npz)."""
    petitions, _ = with_recovered(load_csv(app_root / "data" / "raw" / "petitions.csv").petitions, app_root / RECOVERED_FILE)
    texts = [embedding_text(p.title, p.description) for p in petitions]
    try:
        return load_vectors(texts, app_root / "pipeline" / "cache" / "embeddings.npz", embedder)
    except SemanticUnavailable as error:
        raise BuildError(str(error)) from error


def run_build(app_root: Path, force: bool = False, semantic: bool = True, embedder=None) -> dict:
    raw_dir = app_root / "data" / "raw"
    final_dir = app_root / "public" / "data"
    tmp_dir = app_root / "data" / "build-tmp"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    vectors = None
    if semantic:
        vectors, stats = compute_vectors(app_root, embedder)
        print(f"Vecteurs sémantiques : {stats.total} ({stats.cached} en cache, {stats.computed} calculés).")
    meta = build_catalog(
        raw_dir, tmp_dir, app_root / "docs", app_root / "pipeline" / "curation" / "relations.json",
        app_root / "pipeline" / "curation" / "public-count.json", vectors=vectors,
        recovered_path=app_root / RECOVERED_FILE,
    )
    problems = validate_output(tmp_dir, None if force else final_dir)
    if problems:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise BuildError("Validation échouée, catalogue précédent conservé :\n- " + "\n- ".join(problems))

    entry = meta.pop("_provenance_entry")
    history_path = final_dir / "provenance.json"
    history = json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else []
    if not history or (history[-1]["sha256"], history[-1]["algorithm"]) != (entry["sha256"], entry["algorithm"]):
        history.append(entry)
    _dump(tmp_dir / "provenance.json", history)
    _replace_directory(tmp_dir, final_dir)
    return meta
