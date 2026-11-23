"""Le Sénat dans son espace à part : son fichier se lit avec le même pipeline, ses statuts sont traduits."""

from pathlib import Path

from atlas_pipeline.ingest import parse_csv
from atlas_pipeline.sources import AN, EUROPE, SENAT, SOURCES

HEADER = "titre;description;date_publication;nb_votes;statut;date_limite_vote;type;url;identifiant\n"


def row(identifier: int, status: str, votes: int = 10) -> str:
    return (f"Titre {identifier};Texte de la pétition {identifier};2025-01-0{identifier};{votes};{status};2025-07-01;"
            f"Texte législatif;https://petitions.senat.fr/initiatives/i-{identifier};{identifier}\n")


def test_le_fichier_du_senat_se_lit_et_ses_statuts_sont_traduits():
    result = parse_csv(HEADER + row(1, "Seuil non atteint") + row(2, "Seuil atteint", 122_484) + row(3, "Ouverte"))
    assert [p.status for p in result.petitions] == ["expiree", "seuil", "ouverte"]
    assert result.unknown_statuses == {}
    # La colonne « type » est connue : elle ne déclenche pas d'avertissement de colonne inattendue.
    assert not any("inattendue" in w for w in result.warnings)


def test_chaque_chambre_a_son_espace():
    assert set(SOURCES) == {"an", "senat", "europe"}
    assert EUROPE.register and EUROPE.snapshots is None and EUROPE.root(Path("app")) == Path("app") / "europe"
    assert AN.root(Path("app")) == Path("app")
    assert SENAT.root(Path("app")) == Path("app") / "senat"
    assert SENAT.recover is False and AN.recover is True
    assert SENAT.public()["thresholds"] == [100_000]
    assert SENAT.dataset_api.endswith("/69b04b33b623541cb04aabde/")
