"""Audit automatique du catalogue : chiffres mesurés, jamais estimés."""

from __future__ import annotations

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

from .ingest import IngestResult, Petition
from .textnorm import fold, stem, tokens

VOTE_BUCKETS = [(0, 9), (10, 49), (50, 99), (100, 499), (500, 999), (1000, 4999), (5000, 9999), (10000, None)]


def bucket_label(low: int, high: int | None) -> str:
    return f"{low} et plus" if high is None else f"{low} à {high}"


def vote_buckets(petitions: list[Petition]) -> list[dict]:
    counts = []
    for low, high in VOTE_BUCKETS:
        n = sum(1 for p in petitions if p.votes is not None and p.votes >= low and (high is None or p.votes <= high))
        counts.append({"label": bucket_label(low, high), "low": low, "high": high, "count": n})
    return counts


def quantiles(values: list[int]) -> dict:
    if not values:
        return {}
    ordered = sorted(values)
    pick = lambda q: ordered[min(len(ordered) - 1, int(q * (len(ordered) - 1)))]
    return {"min": ordered[0], "p10": pick(0.1), "p25": pick(0.25), "median": pick(0.5),
            "p75": pick(0.75), "p90": pick(0.9), "p99": pick(0.99), "max": ordered[-1]}


def year_terms(petitions: list[Petition], per_year: int = 8, min_docs: int = 6) -> dict[str, list[str]]:
    """Termes sur-représentés une année donnée par rapport au corpus entier."""
    yearly_df: dict[str, Counter] = defaultdict(Counter)
    total_df: Counter = Counter()
    sizes: Counter = Counter()
    surface: dict[str, Counter] = defaultdict(Counter)
    for p in petitions:
        if not p.published:
            continue
        year = p.published[:4]
        toks = tokens(p.title + " " + p.description[:1200])
        stems_seen = set()
        for tok in toks:
            s = stem(tok)
            surface[s][tok] += 1
            stems_seen.add(s)
        sizes[year] += 1
        for s in stems_seen:
            yearly_df[year][s] += 1
            total_df[s] += 1
    n_total = sum(sizes.values())
    result: dict[str, list[str]] = {}
    for year, df in sorted(yearly_df.items()):
        scored = []
        for s, c in df.items():
            if c < min_docs or total_df[s] < 12:
                continue
            lift = (c / sizes[year]) / (total_df[s] / n_total)
            scored.append((lift * (c ** 0.5), s))
        scored.sort(reverse=True)
        result[year] = [surface[s].most_common(1)[0][0] for _, s in scored[:per_year]]
    return result


def build_audit(
    ingest: IngestResult,
    themes: dict[str, list[str]],
    edges: list[dict],
    dossiers: list[dict],
    public_count: dict | None,
) -> dict:
    P = ingest.petitions
    by_status = Counter(p.status for p in P)
    years = Counter((p.published or "????")[:4] for p in P)
    year_status: dict[str, Counter] = defaultdict(Counter)
    for p in P:
        year_status[(p.published or "????")[:4]][p.status] += 1
    votes = [p.votes for p in P if p.votes is not None]
    ids = sorted(int(p.id) for p in P)
    gaps = sorted(set(range(ids[0], ids[-1] + 1)) - set(ids))
    title_groups: dict[str, list[str]] = defaultdict(list)
    for p in P:
        title_groups[fold(p.title).strip(" .!")].append(p.id)
    dup_groups = sorted((v for v in title_groups.values() if len(v) > 1), key=len, reverse=True)
    lengths = [len(p.description) for p in P]
    return {
        "total": len(P),
        "columns": ingest.columns,
        "warnings": ingest.warnings,
        "duplicate_ids": ingest.duplicate_ids,
        "unknown_statuses": ingest.unknown_statuses,
        "status": dict(by_status),
        "years": dict(sorted(years.items())),
        "year_status": {y: dict(c) for y, c in sorted(year_status.items())},
        "published_min": min((p.published for p in P if p.published), default=None),
        "published_max": max((p.published for p in P if p.published), default=None),
        "votes": quantiles(votes),
        "vote_buckets": vote_buckets(P),
        "votes_missing": [{"id": p.id, "status": p.status} for p in P if p.votes is None],
        "top_votes": [
            {"id": p.id, "title": p.title, "votes": p.votes}
            for p in sorted((p for p in P if p.votes is not None), key=lambda p: -p.votes)[:5]
        ],
        "commissions": dict(Counter(p.commission or "(non renseignée)" for p in P).most_common()),
        "legislatures": dict(Counter(p.legislature or "(non renseignée)" for p in P).most_common()),
        "missing": {
            "commission": sum(1 for p in P if not p.commission),
            "legislature": sum(1 for p in P if not p.legislature),
            "decision": sum(1 for p in P if not p.decision),
            "deadline": sum(1 for p in P if not p.deadline),
            "votes": sum(1 for p in P if p.votes is None),
            "published": sum(1 for p in P if not p.published),
        },
        "ids": {"min": ids[0], "max": ids[-1], "absent_in_range": len(gaps)},
        "title_duplicates": {
            "groups": len(dup_groups),
            "petitions": sum(len(g) for g in dup_groups),
            "largest": [
                {"title": next(p.title for p in P if p.id == g[0]), "count": len(g)} for g in dup_groups[:8]
            ],
        },
        "description_length": {
            "median": int(statistics.median(lengths)), "max": max(lengths),
            "under_80": sum(1 for n in lengths if n < 80),
            "at_cap": sum(1 for n in lengths if n >= max(lengths) - 30),
        },
        "themes": dict(Counter(t for ts in themes.values() for t in ts).most_common()),
        "unthemed": sum(1 for ts in themes.values() if not ts),
        "multi_theme": sum(1 for ts in themes.values() if len(ts) > 1),
        "relations": dict(Counter(e["type"] for e in edges)),
        "dossiers": {
            "count": len(dossiers),
            "petitions": sum(d["size"] for d in dossiers),
            "largest": [{"id": d["id"], "label": d["label"], "size": d["size"]} for d in dossiers[:5]],
        },
        "year_terms": year_terms(P),
        "public_count": public_count,
    }


def load_public_count(path: Path) -> dict | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _table(headers: list[str], rows: list[list]) -> str:
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join(" --- " for _ in headers) + "|"]
    out += ["| " + " | ".join(str(c) for c in row) + " |" for row in rows]
    return "\n".join(out)


def render_markdown(a: dict, meta: dict, theme_labels: dict[str, str]) -> str:
    src = meta["source"]
    lines = [
        "# Audit du catalogue de pétitions",
        "",
        f"> Rapport généré automatiquement par `pipeline/` — ne pas modifier à la main. "
        f"Jeu de données du {(src.get('file_date') or src['resource_last_modified'])[:10]} (ressource « {src['resource_title']} »), "
        f"récupéré le {src['retrieved_at'][:10]}. Empreinte SHA-256 : `{src['sha256'][:16]}…`. "
        f"Version du moteur : `{meta['algorithm']['version']}`.",
        "",
        "## Volume et période",
        "",
        f"- **{a['total']}** pétitions, publiées entre **{a['published_min']}** et **{a['published_max']}**.",
        f"- Identifiants numériques de {a['ids']['min']} à {a['ids']['max']} ; "
        f"{a['ids']['absent_in_range']} numéros de cette plage n'apparaissent pas dans le fichier "
        "(pétitions non publiées, retirées ou jamais ouvertes : le fichier ne permet pas de le dire).",
        f"- Identifiants en double : {len(a['duplicate_ids'])}. Statuts inconnus : {a['unknown_statuses'] or 'aucun'}.",
        "",
        "### Écart avec le catalogue public ouvert",
        "",
    ]
    pc = a.get("public_count")
    if pc:
        gap = pc["count"] - a["total"]
        lines.append(
            f"Le site officiel affichait **{pc['count']}** initiatives le {pc['observed_on']} "
            f"({pc.get('note', 'relevé manuel')}) contre **{a['total']}** dans le fichier, soit un écart de **{gap:+d}**. "
            "L'écart peut venir du décalage de mise à jour, de pétitions non exportées ou d'un comptage différent : "
            "il n'est pas expliqué ici."
        )
    else:
        lines.append(
            "**Non vérifié automatiquement.** Le site officiel n'expose pas de comptage lisible par un script "
            "sans solliciter ses pages (la plateforme refuse les requêtes automatisées), et ce pipeline "
            "s'interdit d'aspirer le site pour reconstituer un corpus déjà publié en open data. Pour documenter "
            "l'écart, relever à la main le nombre affiché sur la page des initiatives puis le consigner dans "
            "`pipeline/curation/public-count.json` (`{\"count\": N, \"observed_on\": \"AAAA-MM-JJ\", \"note\": \"…\"}`) ; "
            "ce rapport l'intégrera à la prochaine exécution."
        )
    lines += ["", "## Statuts", "", _table(["Statut", "Pétitions"], [[k, v] for k, v in sorted(a["status"].items(), key=lambda kv: -kv[1])]), ""]
    statuses = sorted(a["status"])
    lines += [
        "### Par année de publication", "",
        _table(["Année"] + statuses + ["Total"],
               [[y] + [a["year_status"][y].get(s, 0) for s in statuses] + [a["years"][y]] for y in a["years"]]),
        "",
        "## Soutiens (nombre de votes à la date du fichier)",
        "",
        "Les signatures ne sont pas un compteur temps réel et ne mesurent ni la qualité ni la pertinence d'une proposition.",
        "",
        _table(["Statistique", "Valeur"], [[k, v] for k, v in a["votes"].items()]),
        "",
        _table(["Tranche de soutiens", "Pétitions"], [[b["label"], b["count"]] for b in a["vote_buckets"]]),
        "",
        f"La distribution est très asymétrique : médiane {a['votes'].get('median')}, maximum {a['votes'].get('max')}. "
        f"Valeur absente pour {a['missing']['votes']} pétitions.",
        "",
        "## Commissions et législatures",
        "",
        _table(["Commission", "Pétitions"], [[k, v] for k, v in a["commissions"].items()]),
        "",
        _table(["Législature", "Pétitions"], [[k, v] for k, v in a["legislatures"].items()]),
        "",
        "## Champs absents",
        "",
        _table(["Champ", "Valeurs absentes"], [[k, v] for k, v in a["missing"].items()]),
        "",
        f"Descriptions : longueur médiane {a['description_length']['median']} caractères, maximum "
        f"{a['description_length']['max']} ; {a['description_length']['at_cap']} sont proches du plafond de la "
        "colonne et peuvent être tronquées ; la description issue du jeu de données n'est donc pas toujours le texte intégral.",
        "",
        "## Doublons et rapprochements",
        "",
        f"- Titres identiques après normalisation : {a['title_duplicates']['groups']} groupes, "
        f"{a['title_duplicates']['petitions']} pétitions concernées.",
        "",
        _table(["Titre répété", "Occurrences"], [[x["title"][:90], x["count"]] for x in a["title_duplicates"]["largest"]]),
        "",
        f"- Relations calculées : {a['relations']}.",
        f"- Dossiers thématiques automatiques : {a['dossiers']['count']}, regroupant {a['dossiers']['petitions']} pétitions.",
        "",
        "## Familles thématiques (catégorisation automatique)",
        "",
        _table(["Famille", "Pétitions"], [[theme_labels.get(k, k), v] for k, v in a["themes"].items()]),
        "",
        f"{a['multi_theme']} pétitions ont plusieurs thèmes ; {a['unthemed']} n'en ont aucun.",
        "",
        "## Vocabulaire qui marque chaque année",
        "",
        _table(["Année", "Termes sur-représentés"], [[y, ", ".join(t)] for y, t in a["year_terms"].items()]),
        "",
        "## Incohérences et ambiguïtés repérées",
        "",
        f"- {len(a['votes_missing'])} pétitions sans nombre de soutiens ({Counter(v['status'] for v in a['votes_missing'])}).",
        "- Le champ `legislature` est vide pour la majorité des pétitions récentes.",
        "- Le champ `decision_commission` mêle des décisions individuelles et un texte-type de classement d'office.",
        "- Une même demande peut être déposée plusieurs fois : les soutiens ne s'additionnent pas.",
        "",
        "## Avertissements du chargement",
        "",
    ]
    lines += [f"- {w}" for w in a["warnings"]] or ["- aucun"]
    return "\n".join(lines) + "\n"
