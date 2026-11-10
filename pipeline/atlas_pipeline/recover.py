"""Rattrapage des pétitions que le fichier public omet.

Le fichier de data.gouv.fr est fabriqué par un programme qui lit le site officiel page par page. Il classe
définitivement comme « inutilisé » tout numéro inférieur au plus grand numéro déjà vu et absent du fichier précédent.
Une pétition encore en modération quand un numéro supérieur paraît n'y entre donc jamais : ainsi la n° 5820, plus d'un
million de signatures, ou la n° 7121.

Ce module relit ces numéros sur le site officiel. Un numéro non publié renvoie vers l'accueil : il est simplement
ignoré, et sera relu la fois suivante. Le résultat est versionné dans `pipeline/recovered/hors-fichier.json` et chaque
pétition garde la date à laquelle son compteur a été lu. Le nom des auteurs affiché sur le site n'est jamais repris.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .fetch import USER_AGENT, FetchError
from .ingest import Petition, load_csv

SITE = "https://petitions.assemblee-nationale.fr/initiatives"
TIMEOUT = 30
PAUSE_SECONDS = 0.25
MAX_ERRORS = 25
RECOVERED_FILE = Path("pipeline/recovered/hors-fichier.json")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


_opener = urllib.request.build_opener(_NoRedirect)


def _status_and_location(url: str, method: str) -> tuple[int, bytes]:
    request = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with _opener.open(request, timeout=TIMEOUT) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, b""


def fetch_page(identifier: str, request: Callable[[str, str], tuple[int, bytes]] = _status_and_location) -> str | None:
    """Le HTML de la fiche, ou None si le numéro n'est pas publié (redirection ou 404)."""
    url = f"{SITE}/i-{identifier}"
    status, _ = request(url, "HEAD")
    if status in (301, 302, 303, 307, 308, 404):
        return None
    if status != 200:
        raise FetchError(f"Réponse HTTP {status} pour {url}")
    status, body = request(url, "GET")
    if status != 200:
        raise FetchError(f"Réponse HTTP {status} pour {url}")
    return body.decode("utf-8", errors="replace")


def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def _first(pattern: str, page: str) -> str | None:
    found = re.search(pattern, page, re.S)
    return found.group(1) if found else None


def _iso(day: str | None) -> str | None:
    found = re.search(r"(\d{2})/(\d{2})/(\d{4})", day or "")
    return f"{found.group(3)}-{found.group(2)}-{found.group(1)}" if found else None


def _status(page: str) -> str:
    if re.search(r'class="[^"]*archive-header', page):
        return "archivee"
    if re.search(r'class="alert label initiative-status', page):
        return "classee"
    if re.search(r'class="warning label initiative-status', page):
        return "expiree"
    return "ouverte"


def parse_page(page: str, identifier: str, read_on: str) -> dict[str, Any]:
    """Mêmes champs que le fichier public, lus aux mêmes endroits de la page. Lève FetchError si la fiche est illisible."""
    title = _first(r'<h2[^>]*class="[^"]*heading2[^"]*"[^>]*>(.*?)</h2>', page)
    votes = _first(r'<span[^>]*class="[^"]*progress__bar__number[^"]*"[^>]*>(.*?)</span>', page)
    published = _iso(_first(r'<div[^>]*class="[^"]*publish-date[^"]*"[^>]*>(.*?)</div>', page))
    description = _first(r'<meta[^>]*property="og:description"[^>]*content="(.*?)"', page)
    if not title or votes is None or not published:
        raise FetchError(f"Fiche {identifier} illisible : la structure du site a peut-être changé.")
    digits = re.sub(r"\D", "", _text(votes))
    labels = [_text(label) for label in re.findall(r'<a[^>]*href="/initiatives\?filter[^"]*"[^>]*>(.*?)</a>', page, re.S)]
    legislature = next((label.replace("Législature ", "") for label in labels if label.startswith("Législature")), None)
    return {
        "id": identifier,
        "title": _text(title),
        "description": _text(description or ""),
        "published": published,
        "votes": int(digits) if digits else None,
        "status": _status(page),
        "deadline": _iso(_first(r'<span[^>]*class="[^"]*phase-date[^"]*"[^>]*>(.*?)</span>', page)),
        "commission": next((label for label in labels if label.startswith("Commission")), None),
        "legislature": legislature,
        "decision": None,
        "url": f"{SITE}/i-{identifier}",
        "read_on": read_on,
    }


def holes(identifiers: list[str]) -> list[str]:
    """Les numéros absents du fichier, entre le plus petit et le plus grand."""
    present = {int(i) for i in identifiers}
    return [str(n) for n in range(min(present), max(present)) if n not in present]


def recover(
    identifiers: list[str],
    fetch: Callable[[str], str | None] = fetch_page,
    read_on: str | None = None,
    pause: float = PAUSE_SECONDS,
) -> dict[str, Any]:
    """Relit chaque numéro manquant. Trop d'erreurs : FetchError, et le dernier rattrapage reste en place."""
    day = read_on or datetime.now(timezone.utc).date().isoformat()
    found: list[dict[str, Any]] = []
    errors = 0
    candidates = holes(identifiers)
    for identifier in candidates:
        try:
            page = fetch(identifier)
            if page is not None:
                found.append(parse_page(page, identifier, day))
        except FetchError:
            errors += 1
            if errors > MAX_ERRORS:
                raise FetchError(f"Rattrapage interrompu : plus de {MAX_ERRORS} fiches illisibles.") from None
        if pause:
            time.sleep(pause)
    return {"read_on": day, "checked": len(candidates), "errors": errors, "petitions": found}


def run_recover(app_root: Path) -> dict[str, Any]:
    csv_path = app_root / "data" / "raw" / "petitions.csv"
    if not csv_path.exists():
        raise FetchError("Données brutes absentes : lancer d'abord « fetch ».")
    result = recover([p.id for p in load_csv(csv_path).petitions])
    target = app_root / RECOVERED_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return result


def load_recovered(path: Path, known_ids: set[str]) -> tuple[list[Petition], dict[str, Any] | None]:
    """Les pétitions rattrapées qui manquent toujours au fichier. Si le fichier en contient une, le fichier prime."""
    if not path.exists():
        return [], None
    data = json.loads(path.read_text(encoding="utf-8"))
    petitions = [
        Petition(
            id=str(item["id"]), title=item["title"], description=item.get("description") or "", published=item.get("published"),
            votes=item.get("votes"), status=item.get("status") or "ouverte", deadline=item.get("deadline"),
            commission=item.get("commission"), legislature=item.get("legislature"), decision=item.get("decision"),
            url=item["url"], read_on=item.get("read_on"),
        )
        for item in data.get("petitions", [])
        if str(item["id"]) not in known_ids
    ]
    return petitions, {"count": len(petitions), "read_on": data.get("read_on")}
