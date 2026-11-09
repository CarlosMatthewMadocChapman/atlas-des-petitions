import json

import numpy as np
import pytest

from atlas_pipeline.build import BuildError, build_catalog, compute_vectors, run_build
from atlas_pipeline.ingest import parse_csv
from atlas_pipeline.matching import Thresholds
from atlas_pipeline.semantic import (
    MODEL_REVISION, SemanticUnavailable, embedding_text, load_vectors, semantic_edges, text_key,
)
from sample import csv_text
from test_build import SOURCE

TEXTS = ["query: un. chat", "query: deux. chien", "query: trois. cheval"]


def fake_embedder(calls):
    def embed(texts):
        calls.append(list(texts))
        rng = np.random.default_rng(len(texts[0]))
        v = rng.normal(size=(len(texts), 8)).astype(np.float32)
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    return embed


def test_cache_calcule_une_fois_puis_ne_recalcule_que_le_nouveau(tmp_path):
    cache = tmp_path / "emb.npz"
    calls: list = []
    first, stats = load_vectors(TEXTS, cache, fake_embedder(calls))
    assert (stats.cached, stats.computed) == (0, 3) and len(calls) == 1
    again, stats = load_vectors(TEXTS, cache, fake_embedder(calls))
    assert (stats.cached, stats.computed) == (3, 0) and len(calls) == 1  # aucun nouveau calcul
    assert np.array_equal(first, again)
    more, stats = load_vectors(TEXTS + ["query: quatre. vache"], cache, fake_embedder(calls))
    assert (stats.cached, stats.computed) == (3, 1) and calls[-1] == ["query: quatre. vache"]
    assert np.array_equal(more[:3], first)


def test_un_calcul_frais_et_un_calcul_en_cache_donnent_les_memes_vecteurs(tmp_path):
    fresh, _ = load_vectors(TEXTS, tmp_path / "a.npz", fake_embedder([]))
    cached, _ = load_vectors(TEXTS, tmp_path / "a.npz", None)
    assert fresh.dtype == np.float32 and np.array_equal(fresh, cached)


def test_la_cle_depend_du_texte_et_de_la_revision_du_modele():
    assert text_key("a") != text_key("b")
    assert text_key("a") == text_key("a")
    assert MODEL_REVISION in "".join([MODEL_REVISION])  # révision figée, jamais « main »
    assert len(MODEL_REVISION) == 40


def test_le_texte_embarque_est_le_titre_et_le_debut_de_la_description():
    text = embedding_text("Titre", "<p>Corps</p> " + "x" * 2000)
    assert text.startswith("query: Titre. Corps")
    assert len(text) < 760


def make_vectors():
    # 0 et 1 : voisines mutuelles proches ; 2 : proche de 1 mais jamais mutuelle (k=1) ; 3 : loin.
    base = np.array([
        [1.0, 0.0], [0.99, 0.14], [0.95, 0.31], [0.0, 1.0],
    ], dtype=np.float32)
    return base / np.linalg.norm(base, axis=1, keepdims=True)


def call(vectors, lexical, existing=frozenset(), similarity=0.9, k=1, min_lexical=0.12, opposed=lambda i, j: []):
    ids = [str(n + 1) for n in range(len(vectors))]
    return semantic_edges(
        vectors, ids, lexical, set(existing), shared_terms_fn=lambda i, j: ["mot"], opposed_fn=opposed,
        similarity=similarity, mutual_k=k, min_lexical=min_lexical,
    )


def test_une_paire_exige_sens_proche_voisines_mutuelles_et_accord_lexical():
    lexical = np.full((4, 4), 0.3, dtype=np.float32)
    edges = call(make_vectors(), lexical)
    assert [(e["a"], e["b"]) for e in edges] == [("1", "2")]
    assert edges[0]["src"] == "semantique" and edges[0]["type"] == "complementaire" and edges[0]["sem"] > 0.9


def test_sans_accord_lexical_aucune_paire():
    assert call(make_vectors(), np.full((4, 4), 0.05, dtype=np.float32)) == []


def test_une_relation_deja_calculee_n_est_pas_dupliquee():
    assert call(make_vectors(), np.full((4, 4), 0.3, dtype=np.float32), existing={("1", "2")}) == []


def test_des_antonymes_explicites_donnent_une_piste_de_comparaison():
    lexical = np.full((4, 4), 0.3, dtype=np.float32)
    edges = call(make_vectors(), lexical, opposed=lambda i, j: ["promulgation", "abrogation"])
    assert edges[0]["type"] == "comparaison" and edges[0]["cues"] == ["promulgation", "abrogation"]


def test_resultat_deterministe_et_ordonne():
    v = make_vectors()
    lexical = np.full((4, 4), 0.3, dtype=np.float32)
    assert call(v, lexical, k=2, similarity=0.85) == call(v, lexical, k=2, similarity=0.85)


def build_with(raw, tmp_path, vectors):
    out = tmp_path / "out"
    meta = build_catalog(raw, out, None, tmp_path / "none.json", tmp_path / "none2.json", Thresholds(dossier_min_size=2), vectors=vectors)
    return out, meta


@pytest.fixture()
def raw(tmp_path):
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    (raw_dir / "petitions.csv").write_text(csv_text(), encoding="utf-8")
    (raw_dir / "source.json").write_text(json.dumps(SOURCE), encoding="utf-8")
    return raw_dir


def test_le_build_integre_les_relations_semantiques_et_les_signale(raw, tmp_path):
    n = len(parse_csv(csv_text()).petitions)
    # Tous les vecteurs identiques : chaque paire est « très proche » ; seules celles qui ont un recoupement lexical passent.
    vectors = np.tile(np.array([[1.0, 0.0]], dtype=np.float32), (n, 1))
    out, meta = build_with(raw, tmp_path, vectors)
    assert meta["algorithm"]["semantic"]["revision"] == MODEL_REVISION
    edges = json.loads((out / "relations.json").read_text(encoding="utf-8"))["edges"]
    assert all(len(e) == 10 for e in edges)
    marked = [e for e in edges if e[8] == "s"]
    assert len(marked) == meta["counts"]["semantic_relations"]
    for e in marked:
        assert e[9] > 0 and e[2] in "co"


def test_sans_vecteurs_le_build_reste_lexical(raw, tmp_path):
    out, meta = build_with(raw, tmp_path, None)
    assert meta["algorithm"]["semantic"] is None and meta["counts"]["semantic_relations"] == 0


def test_des_vecteurs_de_mauvaise_taille_sont_refuses(raw, tmp_path):
    with pytest.raises(BuildError):
        build_with(raw, tmp_path, np.zeros((3, 2), dtype=np.float32))


def test_calcul_impossible_donne_une_erreur_claire_et_conserve_le_catalogue(tmp_path):
    app = tmp_path / "app"
    (app / "data" / "raw").mkdir(parents=True)
    (app / "pipeline" / "curation").mkdir(parents=True)
    (app / "public" / "data").mkdir(parents=True)
    (app / "public" / "data" / "meta.json").write_text('{"counts":{"petitions":20}}', encoding="utf-8")
    (app / "data" / "raw" / "petitions.csv").write_text(csv_text(), encoding="utf-8")
    (app / "data" / "raw" / "source.json").write_text(json.dumps(SOURCE), encoding="utf-8")

    def broken(_texts):
        raise SemanticUnavailable("modèle absent")

    with pytest.raises(BuildError, match="modèle absent"):
        run_build(app, force=True, embedder=broken)
    assert json.loads((app / "public" / "data" / "meta.json").read_text())["counts"]["petitions"] == 20
    with pytest.raises(BuildError):
        compute_vectors(app, broken)
