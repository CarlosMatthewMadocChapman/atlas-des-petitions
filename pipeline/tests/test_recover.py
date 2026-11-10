import json

import pytest

from atlas_pipeline.fetch import FetchError
from atlas_pipeline.ingest import Petition
from atlas_pipeline.recover import fetch_page, holes, load_recovered, parse_page, recover

PAGE = """
<meta property="og:description" content="Un texte &amp; ses mots">
<h2 class="heading2"> Supprimer une chaîne </h2>
<div class="publish-date">
  10/06/2026
</div>
<span class="progress__bar__number">1 057 519</span>
<span class="phase-date">19/06/2029</span>
<a href="/initiatives?filter[a]=1">Commission des affaires culturelles</a>
<a href="/initiatives?filter[b]=2">Législature 17</a>
<p class="author">Prénom NOM</p>
"""


def test_lit_les_champs_du_fichier_sans_le_nom_de_l_auteur():
    row = parse_page(PAGE, "5820", "2026-11-10")
    assert row["title"] == "Supprimer une chaîne"
    assert row["votes"] == 1057519
    assert row["published"] == "2026-06-10"
    assert row["deadline"] == "2029-06-19"
    assert row["status"] == "ouverte"
    assert row["commission"] == "Commission des affaires culturelles"
    assert row["legislature"] == "17"
    assert row["description"] == "Un texte & ses mots"
    assert row["read_on"] == "2026-11-10"
    assert "NOM" not in json.dumps(row)


def test_une_page_inconnue_est_refusee_et_ne_fabrique_rien():
    with pytest.raises(FetchError):
        parse_page("<html>accueil</html>", "1", "2026-11-10")


def test_statut_classee():
    page = PAGE + '<span class="alert label initiative-status">Classée</span>'
    assert parse_page(page, "1", "2026-11-10")["status"] == "classee"


def test_les_trous_vont_du_plus_petit_au_plus_grand_numero():
    assert holes(["9", "12", "10"]) == ["11"]


@pytest.mark.parametrize("status", [302, 404])
def test_un_numero_non_publie_est_ignore(status):
    assert fetch_page("5", lambda url, method: (status, b"")) is None


def test_une_erreur_du_site_n_est_pas_prise_pour_un_numero_vide():
    with pytest.raises(FetchError):
        fetch_page("5", lambda url, method: (503, b""))


def test_rattrape_seulement_les_numeros_publies():
    result = recover(["1", "4"], fetch=lambda i: PAGE if i == "2" else None, read_on="2026-11-10", pause=0)
    assert [p["id"] for p in result["petitions"]] == ["2"]
    assert result["checked"] == 2


def test_trop_d_erreurs_interrompt_sans_resultat():
    def broken(identifier):
        raise FetchError("non")

    with pytest.raises(FetchError):
        recover(["1", "40"], fetch=broken, pause=0)


def test_le_fichier_prime_si_la_petition_y_revient(tmp_path):
    path = tmp_path / "hors-fichier.json"
    row = parse_page(PAGE, "5820", "2026-11-10")
    path.write_text(json.dumps({"read_on": "2026-11-10", "petitions": [row]}), encoding="utf-8")
    extra, info = load_recovered(path, set())
    assert isinstance(extra[0], Petition) and extra[0].read_on == "2026-11-10"
    assert info == {"count": 1, "read_on": "2026-11-10"}
    assert load_recovered(path, {"5820"})[0] == []


def test_sans_fichier_rien_n_est_ajoute(tmp_path):
    assert load_recovered(tmp_path / "absent.json", set()) == ([], None)
