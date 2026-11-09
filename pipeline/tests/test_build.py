import json
from pathlib import Path

import pytest

from atlas_pipeline.build import BuildError, build_catalog, run_build, validate_output
from atlas_pipeline.curation import apply_curation, load_curation
from atlas_pipeline.matching import Thresholds
from sample import csv_text

SOURCE = {
    "dataset_id": "x", "dataset_title": "t", "dataset_last_update": None, "license": "lov2", "resource_id": "r",
    "resource_title": "essai", "resource_url": "file", "resource_last_modified": "2026-10-26T01:56:39+00:00",
    "sha256": "a" * 64, "bytes": 1, "retrieved_at": "2026-11-02T00:00:00+00:00",
}


@pytest.fixture()
def raw(tmp_path):
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    (raw_dir / "petitions.csv").write_text(csv_text(), encoding="utf-8")
    (raw_dir / "source.json").write_text(json.dumps(SOURCE), encoding="utf-8")
    return raw_dir


def build(raw, tmp_path, curation=None, name="out"):
    cur = tmp_path / "curation.json"
    if curation is not None:
        cur.write_text(json.dumps(curation), encoding="utf-8")
    out = tmp_path / name
    meta = build_catalog(raw, out, None, cur, tmp_path / "none.json", Thresholds(dossier_min_size=2))
    return out, meta


def test_build_writes_every_file_and_keeps_source_text(raw, tmp_path):
    out, meta = build(raw, tmp_path)
    for name in ("catalog", "search", "relations", "dossiers", "stats", "taxonomy", "meta"):
        assert (out / f"{name}.json").exists()
    assert meta["counts"]["petitions"] == 20
    shard = json.loads((out / "details" / "0.json").read_text(encoding="utf-8"))
    assert shard["1"]["d"].startswith("Il faut retirer l'autorisation")
    assert shard["1"]["u"] == "https://petitions.assemblee-nationale.fr/initiatives/i-1"
    assert validate_output(out) == []


def test_catalog_ids_and_links_are_stable_across_builds(raw, tmp_path):
    first, _ = build(raw, tmp_path, name="a")
    second, _ = build(raw, tmp_path, name="b")
    one = json.loads((first / "catalog.json").read_text(encoding="utf-8"))["rows"]
    two = json.loads((second / "catalog.json").read_text(encoding="utf-8"))["rows"]
    assert [r[0] for r in one] == [r[0] for r in two]


def test_every_relation_points_to_a_catalog_petition(raw, tmp_path):
    out, _ = build(raw, tmp_path)
    ids = {r[0] for r in json.loads((out / "catalog.json").read_text(encoding="utf-8"))["rows"]}
    for a, b, kind, score, terms, cues, human, note, *_ in json.loads((out / "relations.json").read_text(encoding="utf-8"))["edges"]:
        assert a in ids and b in ids and kind in "pcot"


def test_curation_rejects_confirms_corrects_and_adds(raw, tmp_path):
    out, _ = build(raw, tmp_path)
    edges = {(e[0], e[1]): e for e in json.loads((out / "relations.json").read_text(encoding="utf-8"))["edges"]}
    assert ("1", "2") in edges
    curation = {
        "reject": [{"a": "2", "b": "1", "note": "essai"}],
        "add": [{"a": "9", "b": "10", "type": "complementaire", "note": "ajout humain"}],
        "confirm": [{"a": "6", "b": "7", "type": "comparaison"}],
        "dossier_labels": {}, "theme_overrides": {"9": ["transports"]},
    }
    out2, _ = build(raw, tmp_path, curation, name="second")
    edges2 = {(e[0], e[1]): e for e in json.loads((out2 / "relations.json").read_text(encoding="utf-8"))["edges"]}
    assert ("1", "2") not in edges2
    assert edges2[("9", "10")][6] == "ajouté"
    assert edges2[("6", "7")][6] in ("confirmé", "corrigé")


def test_apply_curation_rejects_unknown_ids():
    curation = {"confirm": [], "reject": [], "add": [{"a": "1", "b": "999", "type": "proche"}], "dossier_labels": {}, "theme_overrides": {}}
    with pytest.raises(ValueError):
        apply_curation([], curation, {"1", "2"})


def test_unknown_curation_type_is_refused(tmp_path):
    path = tmp_path / "c.json"
    path.write_text(json.dumps({"add": [{"a": "1", "b": "2", "type": "magique"}]}), encoding="utf-8")
    with pytest.raises(ValueError):
        load_curation(path)


def test_failed_build_keeps_previous_catalog(tmp_path):
    app = tmp_path / "app"
    (app / "data" / "raw").mkdir(parents=True)
    (app / "pipeline" / "curation").mkdir(parents=True)
    (app / "public" / "data").mkdir(parents=True)
    (app / "public" / "data" / "meta.json").write_text('{"counts":{"petitions":5000}}', encoding="utf-8")
    (app / "data" / "raw" / "petitions.csv").write_text(csv_text(), encoding="utf-8")
    (app / "data" / "raw" / "source.json").write_text(json.dumps(SOURCE), encoding="utf-8")
    with pytest.raises(BuildError, match="Chute suspecte"):
        run_build(app, semantic=False)
    assert json.loads((app / "public" / "data" / "meta.json").read_text())["counts"]["petitions"] == 5000
