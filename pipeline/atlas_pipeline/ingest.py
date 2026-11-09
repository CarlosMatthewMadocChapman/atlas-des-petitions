"""Lecture et validation du CSV des pétitions de l'Assemblée nationale.

Les valeurs d'origine sont conservées telles quelles (titre, description,
décision). Seuls les types sont normalisés : nombre de soutiens entier ou
absent, dates ISO ou absentes.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

REQUIRED_COLUMNS = ("identifiant", "titre", "description", "date_publication", "nb_votes", "statut", "url")
OPTIONAL_COLUMNS = ("date_limite_vote", "commission", "legislature", "decision_commission")
KNOWN_STATUSES = ("ouverte", "archivee", "classee", "expiree")
_ID_RE = re.compile(r"^\d+$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")


class SchemaError(ValueError):
    pass


@dataclass
class Petition:
    id: str
    title: str
    description: str
    published: str | None
    votes: int | None
    status: str
    deadline: str | None
    commission: str | None
    legislature: str | None
    decision: str | None
    url: str


@dataclass
class IngestResult:
    petitions: list[Petition]
    columns: list[str]
    warnings: list[str] = field(default_factory=list)
    duplicate_ids: list[str] = field(default_factory=list)
    unknown_statuses: dict[str, int] = field(default_factory=dict)


def _blank_to_none(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def _parse_date(value: str | None) -> str | None:
    value = _blank_to_none(value)
    if not value:
        return None
    if not _DATE_RE.match(value):
        return None
    try:
        date.fromisoformat(value[:10])
    except ValueError:
        return None
    return value[:10]


def _parse_votes(value: str | None) -> int | None:
    value = _blank_to_none(value)
    if value is None:
        return None
    try:
        number = float(value.replace(",", ".").replace(" ", ""))
    except ValueError:
        return None
    if number < 0 or number != number:
        return None
    return int(round(number))


def _decode(payload: bytes) -> str:
    text = payload.decode("utf-8-sig")
    return text


def parse_csv(payload: bytes | str) -> IngestResult:
    """Valide le schéma puis convertit chaque ligne. Séparateur `;` obligatoire."""
    text = payload if isinstance(payload, str) else _decode(payload)
    header_line = text.split("\n", 1)[0]
    if ";" not in header_line:
        raise SchemaError("Séparateur « ; » introuvable dans l'en-tête du CSV.")

    reader = csv.DictReader(io.StringIO(text, newline=""), delimiter=";")
    columns = [c.strip() for c in (reader.fieldnames or [])]
    missing = [c for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise SchemaError("Colonnes obligatoires absentes : " + ", ".join(missing))
    reader.fieldnames = columns

    result = IngestResult(petitions=[], columns=columns)
    unexpected = [c for c in columns if c not in REQUIRED_COLUMNS + OPTIONAL_COLUMNS]
    if unexpected:
        result.warnings.append("Colonnes inattendues ignorées : " + ", ".join(unexpected))
    absent_optional = [c for c in OPTIONAL_COLUMNS if c not in columns]
    if absent_optional:
        result.warnings.append("Colonnes optionnelles absentes : " + ", ".join(absent_optional))

    seen: set[str] = set()
    for line_number, row in enumerate(reader, start=2):
        identifier = (row.get("identifiant") or "").strip()
        if not _ID_RE.match(identifier):
            result.warnings.append(f"Ligne {line_number} ignorée : identifiant invalide ({identifier!r}).")
            continue
        if identifier in seen:
            result.duplicate_ids.append(identifier)
            continue
        seen.add(identifier)

        status = (row.get("statut") or "").strip().lower()
        if status not in KNOWN_STATUSES:
            result.unknown_statuses[status or "(vide)"] = result.unknown_statuses.get(status or "(vide)", 0) + 1

        title = (row.get("titre") or "").strip()
        if not title:
            result.warnings.append(f"Pétition {identifier} : titre vide.")
        result.petitions.append(
            Petition(
                id=identifier,
                title=title,
                description=(row.get("description") or "").strip(),
                published=_parse_date(row.get("date_publication")),
                votes=_parse_votes(row.get("nb_votes")),
                status=status or "inconnu",
                deadline=_parse_date(row.get("date_limite_vote")),
                commission=_blank_to_none(row.get("commission")),
                legislature=_blank_to_none(row.get("legislature")),
                decision=_blank_to_none(row.get("decision_commission")),
                url=(row.get("url") or "").strip(),
            )
        )

    if not result.petitions:
        raise SchemaError("Aucune pétition exploitable dans le fichier.")
    if result.duplicate_ids:
        result.warnings.append(f"{len(result.duplicate_ids)} identifiant(s) en double : première occurrence conservée.")
    return result


def load_csv(path: Path) -> IngestResult:
    return parse_csv(path.read_bytes())


def to_public_dict(p: Petition) -> dict[str, Any]:
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "published": p.published,
        "votes": p.votes,
        "status": p.status,
        "deadline": p.deadline,
        "commission": p.commission,
        "legislature": p.legislature,
        "decision": p.decision,
        "url": p.url,
    }
