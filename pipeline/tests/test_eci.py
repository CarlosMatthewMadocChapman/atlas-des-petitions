"""Registre de l'Initiative citoyenne européenne : une initiative devient une ligne du CSV commun, sans donnée personnelle."""

import json

from atlas_pipeline.eci import fetch_register, plain, to_row
from atlas_pipeline.ingest import load_csv

ENTRY = {"id": 1979, "pubRegNum": "ECI(2022)000002", "year": "2022", "number": "000002", "status": "ANSWERED",
         "title": "Fur Free Europe", "totalSupporters": 1502319}
DETAIL = {
    "registrationDate": "16/03/2022", "deadline": "", "startCollectionDate": "18/05/2022",
    "linguisticVersions": [
        {"original": True, "languageCode": "EN", "title": "Fur Free Europe", "objectives": "Fur farming is cruel.", "treaties": "Art. 114 TFEU"},
        {"original": False, "languageCode": "FR", "title": "Fur Free Europe («Pas de fourrure en Europe»)",
         "objectives": "L’élevage est cruel.<br /><br />Il faut l&#39;interdire.", "treaties": "Art. 114 TFUE"},
    ],
    "members": [{"type": "REPRESENTATIVE", "fullName": "Prénom NOM", "email": "organisateur@example.org"}],
    "funding": {"sponsors": [{"name": "Financeur", "amount": 45508}]},
    "submission": {"totalSignatures": 1502319, "entry": [{"countryCodeType": "RO", "total": 23160}, {"countryCodeType": "FR", "total": 107672}]},
    "answer": {"decisionDate": "07/12/2023", "links": [{"defaultLink": "https://example.eu/EN.pdf ",
                                                       "link": [{"languageCode": "FR", "link": "https://example.eu/FR"}]}]},
}


def test_une_initiative_devient_une_ligne_en_francais():
    row, extra = to_row(ENTRY, DETAIL)
    assert row["identifiant"] == "1979"
    assert row["titre"] == "Fur Free Europe («Pas de fourrure en Europe»)"
    assert row["description"] == "L’élevage est cruel. Il faut l'interdire."
    assert row["date_publication"] == "2022-03-16" and row["date_limite_vote"] == ""
    assert row["nb_votes"] == "1502319" and row["statut"] == "answered"
    assert row["url"].endswith("/2022/000002_fr")
    assert extra["regnum"] == "ECI(2022)000002" and extra["language"] is None
    assert extra["countries"] == [["FR", 107672], ["RO", 23160]]
    assert extra["answer"] == {"date": "2023-12-07", "url": "https://example.eu/FR"}


def test_aucune_donnee_personnelle():
    row, extra = to_row(ENTRY, DETAIL)
    text = json.dumps([row, extra], ensure_ascii=False)
    assert "organisateur@example.org" not in text and "NOM" not in text and "Financeur" not in text


def test_sans_version_francaise_la_langue_d_origine_est_signalee():
    detail = {**DETAIL, "linguisticVersions": DETAIL["linguisticVersions"][:1]}
    row, extra = to_row(ENTRY, detail)
    assert row["titre"] == "Fur Free Europe" and extra["language"] == "EN" and row["url"].endswith("_en")


def test_le_registre_lu_se_relit_comme_un_fichier(tmp_path):
    def get_json(url):
        return {"recordsFound": 1, "entries": [ENTRY]} if "/search/" in url else DETAIL

    provenance = fetch_register(tmp_path, get_json=get_json, pause=0)
    assert provenance["license"] == "cc-by-4.0"
    result = load_csv(tmp_path / "petitions.csv")
    assert [p.status for p in result.petitions] == ["repondue"]
    assert result.petitions[0].votes == 1502319
    assert json.loads((tmp_path / "extra.json").read_text(encoding="utf-8"))["1979"]["regnum"] == "ECI(2022)000002"


def test_texte_brut():
    assert plain("<p>a&amp;b<br/>c</p>") == "a&b c"
