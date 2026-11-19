import json

from atlas_pipeline.history import add_reading, empty, load, rising, save, series_for, snapshot_dates, update

CSV = "identifiant;titre;description;date_publication;nb_votes;statut;url\n"


def csv(rows):
    return (CSV + "".join(f"{i};T{i};D;2026-01-01;{v};ouverte;https://x/i-{i}\n" for i, v in rows)).encode()


def test_lit_les_dates_des_instantanes():
    listing = '<a href="2026-11-09_petitions.csv">x</a> <a href="2025-07-30_petitions.csv">y</a> 2026-11-09_petitions.csv'
    assert snapshot_dates(listing) == ["2025-07-30", "2026-11-09"]


def test_ne_suit_que_les_petitions_au_dessus_du_seuil_et_n_interpole_rien():
    history = empty()
    add_reading(history, "2026-01-07", "data.gouv.fr", {"1": 50, "2": 400})
    add_reading(history, "2026-01-21", "data.gouv.fr", {"1": 350, "2": 900})
    assert "1" in history["series"] and history["series"]["1"] == [None, 350]
    assert series_for(history, "2") == [("2026-01-07", 400), ("2026-01-21", 900)]


def test_un_releve_ancien_s_insere_a_sa_place():
    history = empty()
    add_reading(history, "2026-01-21", "data.gouv.fr", {"2": 900})
    add_reading(history, "2026-01-07", "data.gouv.fr", {"2": 400})
    assert history["dates"] == ["2026-01-07", "2026-01-21"]
    assert series_for(history, "2") == [("2026-01-07", 400), ("2026-01-21", 900)]


def test_la_hausse_se_mesure_sur_au_moins_six_jours():
    history = empty()
    add_reading(history, "2026-01-01", "data.gouv.fr", {"7": 1000, "8": 1000})
    add_reading(history, "2026-01-08", "data.gouv.fr", {"7": 5000, "8": 1200})
    add_reading(history, "2026-01-10", "site officiel", {"7": 6000})
    top = rising(history, {"7", "8"})
    assert top[0] == {"id": "7", "gain": 5000, "from": "2026-01-01", "to": "2026-01-10"}
    assert [r["id"] for r in top] == ["7", "8"]


def test_mise_a_jour_ajoute_seulement_les_instantanes_manquants(tmp_path):
    calls = []

    def get(url):
        calls.append(url)
        if url.endswith("/"):
            return b"2026-01-07_petitions.csv 2026-01-14_petitions.csv"
        return csv([("5", 500)]) if "01-07" in url else csv([("5", 800)])

    path = tmp_path / "signatures.json"
    recovered = tmp_path / "hors-fichier.json"
    recovered.write_text(json.dumps({"read_on": "2026-01-15", "petitions": [{"id": "9", "votes": 70000}]}), encoding="utf-8")
    first = update(path, recovered, get=get)
    assert first["dates"] == 3 and first["petitions"] == 2
    again = update(path, None, get=get)
    assert again["added"] == [] and sum(1 for c in calls if c.endswith(".csv")) == 2
    history = load(path)
    assert history["sources"] == ["data.gouv.fr", "data.gouv.fr", "site officiel"]
    assert series_for(history, "9") == [("2026-01-15", 70000)]


def test_le_fichier_reste_relisible(tmp_path):
    history = empty()
    add_reading(history, "2026-01-07", "data.gouv.fr", {"12": 400, "3": 500})
    path = tmp_path / "s.json"
    save(path, history)
    assert load(path) == history
