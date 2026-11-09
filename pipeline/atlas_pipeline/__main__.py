"""Usage : python -m atlas_pipeline {fetch|build|all} [--force] [--from-csv FICHIER]"""

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

APP_ROOT = Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="atlas_pipeline")
    parser.add_argument("command", choices=["fetch", "build", "all"])
    parser.add_argument("--force", action="store_true", help="ne pas comparer au catalogue précédent")
    parser.add_argument("--no-semantic", action="store_true", help="moteur lexical seul (sans la couche sémantique)")
    parser.add_argument("--from-csv", type=Path, help="utiliser un CSV local déjà téléchargé (provenance déclarée « locale »)")
    args = parser.parse_args(argv)
    raw = APP_ROOT / "data" / "raw"

    try:
        if args.command in ("fetch", "all"):
            if args.from_csv:
                raw.mkdir(parents=True, exist_ok=True)
                payload = args.from_csv.read_bytes()
                shutil.copyfile(args.from_csv, raw / "petitions.csv")
                (raw / "source.json").write_text(json.dumps({
                    "dataset_id": "6889cc10e79a25f17ed69acb", "dataset_title": "Pétitions de l'Assemblée Nationale",
                    "dataset_last_update": None, "license": "lov2", "resource_id": None,
                    "resource_title": f"Copie locale ({args.from_csv.name})", "resource_url": str(args.from_csv),
                    "resource_last_modified": datetime.fromtimestamp(args.from_csv.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
                    "file_date": datetime.fromtimestamp(args.from_csv.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
                    "file_date_origin": "copie-locale",
                    "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload),
                    "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                info = fetch_dataset(raw)
                print(f"Téléchargé : {info['resource_title']} ({info['bytes']} octets, {info['sha256'][:12]}…)")
        if args.command in ("build", "all"):
            meta = run_build(APP_ROOT, force=args.force, semantic=not args.no_semantic)
            print("Catalogue construit :", meta["counts"])
    except (FetchError, BuildError) as error:
        print(f"ÉCHEC : {error}", file=sys.stderr)
        print("Le dernier catalogue fiable est conservé.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
