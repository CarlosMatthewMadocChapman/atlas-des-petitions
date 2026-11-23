"""Lecture du registre officiel de l'Initiative citoyenne européenne (ICE).

Le registre n'est pas publié en fichier : il s'interroge par son interface publique
(https://register.eci.ec.europa.eu/core/api/register/…), celle qu'utilise le site officiel. On en tire le même CSV que
celui de l'Assemblée (séparateur « ; », mêmes colonnes), pour que tout le reste du pipeline serve tel quel, et un
fichier `extra.json` pour ce qui n'existe qu'à l'échelle européenne : numéro d'enregistrement, signatures par pays,
réponse de la Commission, langue du texte.

Rien de personnel n'est gardé : le registre publie les noms et adresses des organisateurs et la liste des financeurs,
l'Atlas ne lit ni les uns ni les autres. Une requête par seconde au plus.
"""

from __future__ import annotations

import csv
import hashlib
import html
import io
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .fetch import USER_AGENT, FetchError

API = "https://register.eci.ec.europa.eu/core/api/register"
PAGE = "https://citizens-initiative.europa.eu/initiatives/details"
TIMEOUT = 60
PAUSE = 1.0
COLUMNS = ("identifiant", "titre", "description", "date_publication", "nb_votes", "statut", "date_limite_vote", "url")


def _get_json(url: str) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, ValueError) as error:
        raise FetchError(f"Registre de l'ICE illisible ({url}) : {error}") from error


def _date(value: str | None) -> str | None:
    """« 16/03/2022 » ou « 13/11/2026 00:00 » → « 2022-03-16 »."""
    match = re.match(r"(\d{2})/(\d{2})/(\d{4})", value or "")
    return f"{match.group(3)}-{match.group(2)}-{match.group(1)}" if match else None


def plain(text: str | None) -> str:
    """Texte brut : balises retirées, entités décodées, espaces resserrés."""
    text = re.sub(r"<br\s*/?>|</p>", " ", text or "", flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def version(detail: dict[str, Any], lang: str = "FR") -> tuple[dict[str, Any], bool]:
    """La version française si elle existe, sinon l'originale. Renvoie (version, est_française)."""
    versions = detail.get("linguisticVersions") or []
    for v in versions:
        if (v.get("languageCode") or "").upper() == lang:
            return v, True
    original = next((v for v in versions if v.get("original")), versions[0] if versions else {})
    return original, False


def to_row(entry: dict[str, Any], detail: dict[str, Any]) -> tuple[dict[str, str], dict[str, Any]]:
    """Une initiative → une ligne du CSV commun, et ses informations européennes (sans aucune donnée personnelle)."""
    v, french = version(detail)
    year, number = entry["year"], entry["number"]
    submission = detail.get("submission") or {}
    votes = submission.get("totalSignatures") or entry.get("totalSupporters")
    row = {
        "identifiant": str(entry["id"]),
        "titre": plain(v.get("title")) or plain(entry.get("title")),
        "description": plain(v.get("objectives")),
        "date_publication": _date(detail.get("registrationDate")) or "",
        "nb_votes": "" if votes is None else str(votes),
        "statut": (entry.get("status") or "").lower(),
        "date_limite_vote": _date(detail.get("deadline")) or "",
        "url": f"{PAGE}/{year}/{number}_{'fr' if french else (v.get('languageCode') or 'en').lower()}",
    }
    answer = detail.get("answer") or {}
    answer_link = None
    for link in answer.get("links") or []:
        localized = {(x.get("languageCode") or "").upper(): x.get("link") for x in link.get("link") or []}
        answer_link = (localized.get("FR") or link.get("defaultLink") or "").strip() or None
        if answer_link:
            break
    extra = {
        "regnum": entry.get("pubRegNum"),
        "language": None if french else (v.get("languageCode") or "").upper() or None,
        "collection_start": _date(detail.get("startCollectionDate")),
        "countries": sorted(
            ([(e.get("countryCodeType") or "").upper(), e.get("total")] for e in submission.get("entry") or [] if e.get("total")),
            key=lambda c: -c[1],
        ),
        "answer": {"date": _date(answer.get("decisionDate")), "url": answer_link} if answer else None,
        "treaties": plain(v.get("treaties")) or None,
    }
    return row, extra


def write_csv(rows: list[dict[str, str]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=COLUMNS, delimiter=";", lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def fetch_register(
    destination: Path,
    get_json: Callable[[str], Any] = _get_json,
    pause: float = PAUSE,
) -> dict[str, Any]:
    """Lit tout le registre, écrit `petitions.csv`, `extra.json` et `source.json` ; renvoie la provenance."""
    listing = get_json(f"{API}/search/ALL/FR/0/1000")
    entries = listing.get("entries") or []
    if not entries or len(entries) < (listing.get("recordsFound") or 0):
        raise FetchError("Liste du registre de l'ICE incomplète.")
    rows, extras = [], {}
    for i, entry in enumerate(sorted(entries, key=lambda e: e["id"])):
        if i and pause:
            time.sleep(pause)
        detail = get_json(f"{API}/details/{entry['year']}/{entry['number']}")
        row, extra = to_row(entry, detail)
        if not row["titre"]:
            continue
        rows.append(row)
        extras[row["identifiant"]] = extra
    payload = write_csv(rows)
    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    provenance = {
        "dataset_id": "registre-ice",
        "dataset_title": "Registre de l'Initiative citoyenne européenne",
        "dataset_last_update": None,
        "license": "cc-by-4.0",
        "resource_id": None,
        "resource_title": f"Registre lu le {retrieved_at[:10]} ({len(rows)} initiatives)",
        "resource_url": f"{API}/search/ALL/FR/0/1000",
        "resource_last_modified": retrieved_at,
        "file_date": retrieved_at,
        "file_date_origin": "recuperation",
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "retrieved_at": retrieved_at,
    }
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "petitions.csv").write_bytes(payload)
    (destination / "extra.json").write_text(json.dumps(extras, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (destination / "source.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding="utf-8")
    return provenance
