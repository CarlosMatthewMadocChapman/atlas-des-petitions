"""Historique des signatures, relevé après relevé.

Sources, toutes publiques et datées :
- les instantanés hebdomadaires que data.gouv.fr conserve depuis le 30 juillet 2025
  (https://files.data.gouv.fr/data-pipeline-open/an_petitions/AAAA-MM-JJ_petitions.csv) ;
- les relevés de l'Atlas sur le site officiel, pour les pétitions absentes de ces fichiers (recover.py).

Rien n'est interpolé : une date sans relevé reste vide. Seules les pétitions qui ont atteint `MIN_VOTES` signatures
sont suivies, pour que le fichier reste léger ; une pétition qui franchit ce seuil est suivie à partir de là.
Le résultat est versionné dans `pipeline/history/signatures.json`.
"""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path
from typing import Any, Callable

from .fetch import USER_AGENT, FetchError
from .ingest import parse_csv

SNAPSHOTS = "https://files.data.gouv.fr/data-pipeline-open/an_petitions/"
HISTORY_FILE = Path("pipeline/history/signatures.json")
MIN_VOTES = 300
TIMEOUT = 120


def _get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.read()
    except OSError as error:
        raise FetchError(f"Téléchargement impossible ({url}) : {error}") from error


def snapshot_dates(listing: str) -> list[str]:
    """Les dates des instantanés publiés, dans l'ordre."""
    return sorted(set(re.findall(r"(\d{4}-\d{2}-\d{2})_petitions\.csv", listing)))


def empty() -> dict[str, Any]:
    return {"min_votes": MIN_VOTES, "dates": [], "sources": [], "series": {}}


def add_reading(history: dict[str, Any], date: str, source: str, votes: dict[str, int | None]) -> bool:
    """Ajoute un relevé daté. Une date déjà présente n'est pas réécrite (le premier relevé du jour fait foi)."""
    if date in history["dates"]:
        index = history["dates"].index(date)
        changed = False
        for pid, count in votes.items():
            row = history["series"].get(pid)
            if count is None or row is None or row[index] is not None:
                continue
            row[index] = count
            changed = True
        return changed
    dates = history["dates"] + [date]
    order = sorted(range(len(dates)), key=lambda i: dates[i])
    position = order.index(len(dates) - 1)
    history["dates"] = [dates[i] for i in order]
    history["sources"].insert(position, source)
    for row in history["series"].values():
        row.insert(position, None)
    for pid, count in votes.items():
        if count is None:
            continue
        row = history["series"].get(pid)
        if row is None:
            if count < history["min_votes"]:
                continue
            row = history["series"][pid] = [None] * len(history["dates"])
        row[position] = count
    return True


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else empty()


def save(path: Path, history: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    series = {pid: history["series"][pid] for pid in sorted(history["series"], key=int)}
    lines = ",\n".join(f'  "{pid}": {json.dumps(row, separators=(",", ":"))}' for pid, row in series.items())
    head = json.dumps({k: history[k] for k in ("min_votes", "dates", "sources")}, ensure_ascii=False)[:-1]
    path.write_text(f'{head}, "series": {{\n{lines}\n}}}}\n', encoding="utf-8")


def update(
    path: Path,
    recovered_path: Path | None = None,
    get: Callable[[str], bytes] = _get,
    snapshots: str = SNAPSHOTS,
) -> dict[str, Any]:
    """Ajoute les instantanés publiés qui manquent, puis le dernier relevé des pétitions retrouvées."""
    history = load(path)
    added = []
    for date in snapshot_dates(get(snapshots).decode("utf-8", errors="replace")):
        if date in history["dates"] and history["sources"][history["dates"].index(date)] == "data.gouv.fr":
            continue
        result = parse_csv(get(f"{snapshots}{date}_petitions.csv"))
        if add_reading(history, date, "data.gouv.fr", {p.id: p.votes for p in result.petitions}):
            added.append(date)
    if recovered_path is not None and recovered_path.exists():
        recovered = json.loads(recovered_path.read_text(encoding="utf-8"))
        day = recovered.get("read_on")
        if day and add_reading(history, day, "site officiel", {str(p["id"]): p.get("votes") for p in recovered.get("petitions", [])}):
            added.append(f"{day} (site officiel)")
    save(path, history)
    return {"added": added, "dates": len(history["dates"]), "petitions": len(history["series"])}


def series_for(history: dict[str, Any], pid: str) -> list[tuple[str, int]]:
    row = history["series"].get(pid) or []
    return [(history["dates"][i], v) for i, v in enumerate(row) if v is not None]


def rising(history: dict[str, Any], known: set[str], limit: int = 20, min_days: int = 6) -> list[dict[str, Any]]:
    """Les plus fortes hausses sur environ une semaine : dernier relevé comparé au plus récent datant d'au moins `min_days` jours avant."""
    from datetime import date as day

    found = []
    for pid in history["series"]:
        if pid not in known:
            continue
        points = series_for(history, pid)
        if len(points) < 2:
            continue
        d2, v2 = points[-1]
        end = day.fromisoformat(d2)
        earlier = [(d, v) for d, v in points[:-1] if (end - day.fromisoformat(d)).days >= min_days]
        if not earlier:
            continue
        d1, v1 = earlier[-1]
        if v2 <= v1:
            continue
        found.append({"id": pid, "gain": v2 - v1, "from": d1, "to": d2})
    found.sort(key=lambda r: (-r["gain"], int(r["id"])))
    return found[:limit]
