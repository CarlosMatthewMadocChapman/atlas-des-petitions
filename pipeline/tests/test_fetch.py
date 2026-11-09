import io
import json
import urllib.error

import pytest

from atlas_pipeline.fetch import FetchError, fetch_dataset, file_date, pick_main_csv

META = {
    "id": "6889cc10e79a25f17ed69acb", "title": "Pétitions", "last_update": "2026-10-29T12:01:32+00:00", "license": "lov2",
    "resources": [
        {"id": "a", "format": "url", "type": "update", "url": "https://x/index", "last_modified": "2026-10-29"},
        {"id": "old", "format": "csv", "type": "main", "title": "ancien", "url": "https://x/old.csv", "last_modified": "2026-01-01"},
        {"id": "new", "format": "csv", "type": "main", "title": "récent", "url": "https://x/new.csv", "last_modified": "2026-10-26"},
        {"id": "doc", "format": "csv", "type": "documentation", "url": "https://x/doc.csv", "last_modified": "2026-12-01"},
    ],
}
CSV = ("titre;description;x\n" + "ligne;texte;1\n" * 200).encode()


class FakeResponse(io.BytesIO):
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def opener_for(mapping):
    def opener(request, timeout=0):
        value = mapping[request.full_url]
        if isinstance(value, Exception):
            raise value
        return FakeResponse(value)

    return opener


def test_latest_main_csv_is_picked_from_metadata():
    assert pick_main_csv(META)["id"] == "new"


def test_no_csv_resource_raises():
    with pytest.raises(FetchError):
        pick_main_csv({"resources": [{"format": "url", "url": "https://x"}]})


def test_download_writes_file_and_provenance(tmp_path):
    opener = opener_for({"https://api/": json.dumps(META).encode(), "https://x/new.csv": CSV})
    info = fetch_dataset(tmp_path, api_url="https://api/", opener=opener)
    assert (tmp_path / "petitions.csv").read_bytes() == CSV
    saved = json.loads((tmp_path / "source.json").read_text(encoding="utf-8"))
    assert saved["sha256"] == info["sha256"] and saved["resource_id"] == "new"


def test_file_date_prefers_the_http_header_over_stale_metadata():
    headers = {"Last-Modified": "Mon, 02 Nov 2026 02:11:48 GMT"}
    # Cas réel du 2 novembre 2026 : métadonnée restée au 26 octobre, titre « au 02-11-2026 ».
    assert file_date(headers, "Pétitions au 02-11-2026", "2026-11-03T08:00:00+00:00") == (
        "2026-11-02T02:11:48+00:00", "en-tete-http")


def test_file_date_falls_back_to_title_then_retrieval():
    assert file_date(None, "Pétitions au 02-11-2026", "2026-11-03T08:00:00+00:00") == (
        "2026-11-02T00:00:00+00:00", "titre-ressource")
    assert file_date({}, "Pétitions au 31-02-2026", "2026-11-03T08:00:00+00:00") == (
        "2026-11-03T08:00:00+00:00", "recuperation")
    assert file_date({"Last-Modified": "pas une date"}, None, "2026-11-03T08:00:00+00:00")[1] == "recuperation"


def test_download_records_the_date_of_the_file_not_the_metadata(tmp_path):
    class Dated(FakeResponse):
        headers = {"Last-Modified": "Mon, 02 Nov 2026 02:11:48 GMT"}

    def opener(request, timeout=0):
        return Dated(CSV) if request.full_url == "https://x/new.csv" else FakeResponse(json.dumps(META).encode())

    info = fetch_dataset(tmp_path, api_url="https://api/", opener=opener)
    assert info["file_date"] == "2026-11-02T02:11:48+00:00" and info["file_date_origin"] == "en-tete-http"
    assert info["resource_last_modified"] == "2026-10-26"


def test_network_error_keeps_previous_files(tmp_path):
    (tmp_path / "petitions.csv").write_bytes(b"ancien")
    opener = opener_for({"https://api/": json.dumps(META).encode(), "https://x/new.csv": urllib.error.URLError("boom")})
    with pytest.raises(FetchError):
        fetch_dataset(tmp_path, api_url="https://api/", opener=opener)
    assert (tmp_path / "petitions.csv").read_bytes() == b"ancien"


def test_bad_metadata_raises(tmp_path):
    opener = opener_for({"https://api/": b"<html>pas du json</html>"})
    with pytest.raises(FetchError):
        fetch_dataset(tmp_path, api_url="https://api/", opener=opener)


def test_html_page_instead_of_csv_is_rejected(tmp_path):
    opener = opener_for({"https://api/": json.dumps(META).encode(), "https://x/new.csv": b"<html>erreur</html>"})
    with pytest.raises(FetchError):
        fetch_dataset(tmp_path, api_url="https://api/", opener=opener)
    assert not (tmp_path / "petitions.csv").exists()
