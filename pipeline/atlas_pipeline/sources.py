"""Les sources de l'Atlas : une chambre, un jeu de données ouvert, un espace à part.

L'Assemblée nationale garde ses chemins historiques (racine de l'application). Le Sénat vit dans `senat/`, avec ses
propres données brutes, catalogue publié, historique et relectures : aucun mélange de numéros ni de rapprochements.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Source:
    id: str
    name: str  # « Assemblée nationale »
    of: str  # « de l'Assemblée nationale », pour composer les phrases
    dataset_id: str
    dataset_title: str
    dataset_page: str
    official_site: str
    snapshots: str | None  # dossier des fichiers hebdomadaires archivés par data.gouv.fr ; None : relevés de l'Atlas seulement
    subdir: str  # "" = racine de l'application
    recover: bool  # relire sur le site officiel les numéros absents du fichier
    thresholds: tuple[int, ...]  # seuils officiels de signatures, tracés sur les courbes
    register: bool = False  # données lues dans un registre (interface publique) plutôt que dans un CSV

    @property
    def dataset_api(self) -> str:
        return f"https://www.data.gouv.fr/api/1/datasets/{self.dataset_id}/"

    def root(self, app_root: Path) -> Path:
        return app_root / self.subdir if self.subdir else app_root

    def public(self) -> dict:
        """Ce que l'interface a besoin de savoir (meta.json)."""
        return {
            "id": self.id, "name": self.name, "of": self.of, "official_site": self.official_site,
            "thresholds": list(self.thresholds),
        }


AN = Source(
    id="an",
    name="Assemblée nationale",
    of="de l'Assemblée nationale",
    dataset_id="6889cc10e79a25f17ed69acb",
    dataset_title="Pétitions de l'Assemblée Nationale",
    dataset_page="https://www.data.gouv.fr/datasets/petitions-de-lassemblee-nationale",
    official_site="https://petitions.assemblee-nationale.fr/initiatives",
    snapshots="https://files.data.gouv.fr/data-pipeline-open/an_petitions/",
    subdir="",
    recover=True,
    thresholds=(100_000, 500_000),
)

SENAT = Source(
    id="senat",
    name="Sénat",
    of="du Sénat",
    dataset_id="69b04b33b623541cb04aabde",
    dataset_title="Pétitions du Sénat",
    dataset_page="https://www.data.gouv.fr/datasets/petitions-du-senat",
    official_site="https://petitions.senat.fr/initiatives",
    snapshots="https://files.data.gouv.fr/data-pipeline-open/senat_petitions/",
    subdir="senat",
    # Le programme de data.gouv.fr relit chaque semaine tous les numéros du Sénat, de 0 au dernier : pas d'oubli connu.
    recover=False,
    thresholds=(100_000,),  # en six mois : la conférence des présidents peut l'inscrire à l'ordre du jour
)

EUROPE = Source(
    id="europe",
    name="Initiative citoyenne européenne",
    of="de l'Initiative citoyenne européenne",
    dataset_id="registre-ice",
    dataset_title="Registre de l'Initiative citoyenne européenne",
    dataset_page="https://citizens-initiative.europa.eu/find-initiative_fr",
    official_site="https://citizens-initiative.europa.eu/initiatives/details",
    snapshots=None,
    subdir="europe",
    recover=False,
    # Un million de signatures, avec un minimum atteint dans au moins sept pays de l'Union.
    thresholds=(1_000_000,),
    register=True,
)

SOURCES = {s.id: s for s in (AN, SENAT, EUROPE)}
