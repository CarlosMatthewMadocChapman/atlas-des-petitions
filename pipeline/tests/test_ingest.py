import pytest

from atlas_pipeline.ingest import SchemaError, parse_csv
from sample import HEADER, ROWS, csv_text


def test_semicolon_csv_is_parsed_with_original_text_preserved():
    result = parse_csv(csv_text().encode("utf-8"))
    assert len(result.petitions) == len(ROWS)
    first = result.petitions[0]
    assert first.id == "1"
    assert first.title == "Retirer la diffusion de la chaîne d'information"
    assert first.votes == 120
    assert first.url.endswith("/i-1")
    assert first.description.startswith("Il faut retirer")


def test_missing_values_become_none():
    result = parse_csv(csv_text())
    thirteenth = next(p for p in result.petitions if p.id == "13")
    assert thirteenth.votes is None
    assert thirteenth.commission is None
    assert thirteenth.deadline is None
    assert thirteenth.legislature is None


def test_comma_separated_file_is_rejected():
    with pytest.raises(SchemaError):
        parse_csv(HEADER.replace(";", ",") + "\n")


def test_missing_required_column_is_reported():
    broken = csv_text().replace("nb_votes", "soutiens", 1)
    with pytest.raises(SchemaError, match="nb_votes"):
        parse_csv(broken)


def test_optional_columns_may_disappear():
    header = "identifiant;titre;description;date_publication;nb_votes;statut;url"
    row = "5;Titre;Description;2025-01-01;10;ouverte;https://exemple.fr"
    result = parse_csv(f"{header}\n{row}\n")
    assert result.petitions[0].commission is None
    assert any("optionnelles" in w for w in result.warnings)


def test_duplicate_identifiers_keep_first_occurrence():
    rows = ROWS[:2] + [ROWS[0][:10] + ("2",)]
    result = parse_csv(csv_text(rows))
    assert result.duplicate_ids == ["2"]
    assert [p.id for p in result.petitions] == ["1", "2"]


def test_invalid_identifiers_are_skipped_with_warning():
    rows = [ROWS[0][:10] + ("abc",)] + ROWS[1:3]
    result = parse_csv(csv_text(rows))
    assert len(result.petitions) == 2
    assert any("invalide" in w for w in result.warnings)


def test_ids_are_stable_between_runs():
    a = [p.id for p in parse_csv(csv_text()).petitions]
    b = [p.id for p in parse_csv(csv_text().encode("utf-8")).petitions]
    assert a == b


def test_unknown_status_is_counted_not_hidden():
    rows = [ROWS[0][:4] + ("mystere",) + ROWS[0][5:]]
    result = parse_csv(csv_text(rows))
    assert result.unknown_statuses == {"mystere": 1}


def test_bad_numbers_and_dates_do_not_crash():
    rows = [ROWS[0][:2] + ("pas-une-date", "beaucoup") + ROWS[0][4:]]
    petition = parse_csv(csv_text(rows)).petitions[0]
    assert petition.votes is None and petition.published is None


def test_official_links_are_kept_as_given():
    result = parse_csv(csv_text())
    assert all(p.url.startswith("https://petitions.assemblee-nationale.fr/initiatives/i-") for p in result.petitions)
