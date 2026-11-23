"""Usage : python -m atlas_pipeline {fetch|recover|history|build|all} [--source an|senat] [--force] [--from-csv FICHIER]"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from .build import BuildError, run_build
from .fetch import FetchError, fetch_dataset
from .recover import RECOVERED_FILE, run_recover
from .history import HISTORY_FILE, update as update_history
from .sources import SOURCES
from .eci import fetch_register

APP_ROOT = Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="atlas_pipeline")
    parser.add_argument("command", choices=["fetch", "recover", "history", "build", "all"])
    parser.add_argument("--force", action="store_true", help="ne pas comparer au catalogue précédent")
    parser.add_argument("--no-semantic", action="store_true", help="moteur lexical seul (sans la couche sémantique)")
    parser.add_argument("--from-csv", type=Path, help="utiliser un CSV local déjà téléchargé (provenance déclarée « locale »)")
    parser.add_argument("--source", choices=sorted(SOURCES), default="an", help="source : an (Assemblée nationale), senat ou europe (Initiative citoyenne européenne)")
    args = parser.parse_args(argv)
    source = SOURCES[args.source]
    root = source.root(APP_ROOT)
    raw = root / "data" / "raw"

    try:
        if args.command in ("fetch", "all"):
            if args.from_csv:
                raw.mkdir(parents=True, exist_ok=True)
                payload = args.from_csv.read_bytes()
                shutil.copyfile(args.from_csv, raw / "petitions.csv")
                (raw / "source.json").write_text(json.dumps({
                    "dataset_id": source.dataset_id, "dataset_title": source.dataset_title,
                    "dataset_last_update": None, "license": "lov2", "resource_id": None,
                    "resource_title": f"Copie locale ({args.from_csv.name})", "resource_url": str(args.from_csv),
                    "resource_last_modified": datetime.fromtimestamp(args.from_csv.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
                    "file_date": datetime.fromtimestamp(args.from_csv.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
                    "file_date_origin": "copie-locale",
                    "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload),
                    "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                info = fetch_register(raw) if source.register else fetch_dataset(raw, api_url=source.dataset_api)
                print(f"Téléchargé : {info['resource_title']} ({info['bytes']} octets, {info['sha256'][:12]}…)")
        if args.command == "recover" and not source.recover:
            print(f"Rattrapage inutile pour {source.name} : le fichier relit tous les numéros.")
        elif args.command == "recover":
            result = run_recover(root)
            print(f"Rattrapage : {len(result['petitions'])} pétitions absentes du fichier, sur {result['checked']} numéros relus ({result['errors']} erreurs).")
        if args.command == "history":
            result = update_history(root / HISTORY_FILE, root / RECOVERED_FILE, snapshots=source.snapshots,
                                    current=raw if source.snapshots is None else None)
            print(f"Historique : {result['dates']} relevés, {result['petitions']} pétitions suivies ; ajoutés : {', '.join(result['added']) or 'aucun'}.")
        if args.command in ("build", "all"):
            meta = run_build(root, force=args.force, semantic=not args.no_semantic, chamber=source)
            print("Catalogue construit :", meta["counts"])
    except (FetchError, BuildError) as error:
        print(f"ÉCHEC : {error}", file=sys.stderr)
        print("Le dernier catalogue fiable est conservé.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
