"""Curation humaine versionnée : confirmer, corriger, ajouter ou rejeter un rapprochement."""

from __future__ import annotations

import json
from pathlib import Path

VALID_TYPES = ("proche", "complementaire", "comparaison")


def load_curation(path: Path) -> dict:
    if not path.exists():
        return {"confirm": [], "add": [], "reject": [], "dossier_labels": {}, "theme_overrides": {}}
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in ("confirm", "add", "reject"):
        data.setdefault(key, [])
    data.setdefault("dossier_labels", {})
    data.setdefault("theme_overrides", {})
    for entry in data["add"] + [e for e in data["confirm"] if "type" in e]:
        if entry.get("type") not in VALID_TYPES:
            raise ValueError(f"Type de relation inconnu dans la curation : {entry!r}")
    return data


def _key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if int(a) < int(b) else (b, a)


def apply_curation(edges: list[dict], curation: dict, known_ids: set[str]) -> list[dict]:
    """Chaque arête garde son origine : `human` vaut None, 'confirmé', 'corrigé' ou 'ajouté'."""
    rejected = {_key(e["a"], e["b"]) for e in curation["reject"]}
    confirmed = {_key(e["a"], e["b"]): e for e in curation["confirm"]}
    result: list[dict] = []
    present: set[tuple[str, str]] = set()
    for edge in edges:
        key = _key(edge["a"], edge["b"])
        if key in rejected:
            continue
        edge = dict(edge, human=None, note=None)
        if key in confirmed:
            entry = confirmed[key]
            edge["human"] = "corrigé" if entry.get("type") and entry["type"] != edge["type"] else "confirmé"
            edge["type"] = entry.get("type", edge["type"])
            edge["note"] = entry.get("note")
        present.add(key)
        result.append(edge)
    for entry in curation["add"]:
        key = _key(entry["a"], entry["b"])
        if key in rejected or key in present:
            continue
        if entry["a"] not in known_ids or entry["b"] not in known_ids:
            raise ValueError(f"Curation : identifiant inconnu dans {entry!r}")
        result.append(
            {"a": key[0], "b": key[1], "type": entry["type"], "score": 0.0, "title": 0.0,
             "terms": [], "cues": [], "human": "ajouté", "note": entry.get("note")}
        )
    return result
