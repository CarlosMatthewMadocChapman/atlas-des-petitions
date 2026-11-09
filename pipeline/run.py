"""Point d'entrée : python pipeline/run.py {fetch|build|all} [--force] [--from-csv FICHIER]"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from atlas_pipeline.__main__ import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
