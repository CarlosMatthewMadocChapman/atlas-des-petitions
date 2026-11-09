"""Découverte et téléchargement de la ressource CSV principale la plus récente.

Si quoi que ce soit échoue, l'exception `FetchError` est levée et aucun fichier
n'est écrasé : le dernier catalogue fiable reste en place.
"""

from __future__ import annotations

import hashlib
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Callable

from . import DATASET_API

USER_AGENT = "atlas-des-petitions/1.0 (+jeu de donnees ouvert; veille hebdomadaire)"
TIMEOUT = 120


class FetchError(RuntimeError):
    pass


def _http_get_with_headers(url: str, opener: Callable[..., Any] | None = None) -> tuple[bytes, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    open_url = opener or urllib.request.urlopen
    try:
        with open_url(request, timeout=TIMEOUT) as response:
            status = getattr(response, "status", 200)
            if status != 200:
                raise FetchError(f"Réponse HTTP {status} pour {url}")
            return response.read(), getattr(response, "headers", None)
    except urllib.error.URLError as error:
        raise FetchError(f"Téléchargement impossible ({url}) : {error}") from error
    except TimeoutError as error:
        raise FetchError(f"Délai dépassé pour {url}") from error


def _http_get(url: str, opener: Callable[..., Any] | None = None) -> bytes:
    return _http_get_with_headers(url, opener)[0]


_TITLE_DATE = re.compile(r"\b(\d{2})-(\d{2})-(\d{4})\b")


def file_date(headers: Any, title: str | None, retrieved_at: str) -> tuple[str, str]:
    """Date du fichier lui-même, et d'où elle vient.

    Le champ `last_modified` des métadonnées data.gouv.fr n'est pas renouvelé quand le contenu du fichier
    change à adresse constante : il est resté au 26 octobre pour un fichier publié le 2 novembre. On lit donc,
    dans l'ordre, l'en-tête `Last-Modified` du téléchargement, la date écrite dans le titre de la ressource
    (« Pétitions au 02-11-2026 »), puis la date de récupération.
    """
    raw = headers.get("Last-Modified") if headers is not None else None
    if raw:
        try:
            moment = parsedate_to_datetime(raw)
            if moment.tzinfo is None:
                moment = moment.replace(tzinfo=timezone.utc)
            return moment.astimezone(timezone.utc).isoformat(timespec="seconds"), "en-tete-http"
        except (TypeError, ValueError):
            pass
    found = _TITLE_DATE.search(title or "")
    if found:
        day, month, year = (int(part) for part in found.groups())
        try:
            return datetime(year, month, day, tzinfo=timezone.utc).isoformat(timespec="seconds"), "titre-ressource"
        except ValueError:
            pass
    return retrieved_at, "recuperation"


def pick_main_csv(metadata: dict[str, Any]) -> dict[str, Any]:
    """Choisit la ressource CSV de type `main` la plus récemment modifiée."""
    resources = metadata.get("resources") or []
    candidates = [
        r
        for r in resources
        if str(r.get("format", "")).lower() == "csv" and r.get("type", "main") == "main" and r.get("url")
    ]
    if not candidates:
        raise FetchError("Aucune ressource CSV principale dans les métadonnées du jeu de données.")
    candidates.sort(key=lambda r: r.get("last_modified") or "", reverse=True)
    return candidates[0]


def fetch_dataset(
    destination: Path,
    api_url: str = DATASET_API,
    opener: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    """Télécharge le CSV, écrit `petitions.csv` et `source.json`, renvoie la provenance."""
    try:
        metadata = json.loads(_http_get(api_url, opener).decode("utf-8"))
    except json.JSONDecodeError as error:
        raise FetchError("Métadonnées data.gouv.fr illisibles.") from error

    resource = pick_main_csv(metadata)
    payload, headers = _http_get_with_headers(resource["url"], opener)
    if len(payload) < 1000 or b";" not in payload[:2000]:
        raise FetchError("Le fichier téléchargé ne ressemble pas au CSV attendu.")

    destination.mkdir(parents=True, exist_ok=True)
    retrieved_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    date_of_file, date_origin = file_date(headers, resource.get("title"), retrieved_at)
    provenance = {
        "dataset_id": metadata.get("id"),
        "dataset_title": metadata.get("title"),
        "dataset_last_update": metadata.get("last_update"),
        "license": metadata.get("license"),
        "resource_id": resource.get("id"),
        "resource_title": resource.get("title"),
        "resource_url": resource["url"],
        "resource_last_modified": resource.get("last_modified"),
        "file_date": date_of_file,
        "file_date_origin": date_origin,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "retrieved_at": retrieved_at,
    }
    (destination / "petitions.csv").write_bytes(payload)
    (destination / "source.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return provenance
