import json
from pathlib import Path

from atlas_pipeline.textnorm import clean_text, fold, stem, stems, strip_accents, tokens


def test_accents_are_folded():
    assert strip_accents("Éléphant œuvre à l'île") == "Elephant oeuvre a l'ile"
    assert fold("RÉFÉRENDUM d’initiative") == "referendum d'initiative"


def test_html_and_urls_are_removed_but_text_is_kept():
    assert clean_text("<p>Bonjour &amp; merci</p> https://exemple.fr/x fin") == "Bonjour & merci fin"


def test_stopwords_and_petition_boilerplate_are_dropped():
    assert tokens("Nous demandons la signature de cette pétition pour le pluralisme") == ["pluralisme"]


def test_plurals_and_feminines_share_a_stem():
    assert stem("medias") == stem("media")
    assert stem("audiovisuelle") == stem("audiovisuel")
    assert stem("travailleurs") == stem("travailleur")
    assert stem("nationaux") == "national"


def test_short_words_are_left_alone():
    assert stem("eau") == "eau"
    assert stem("gaz") == "gaz"


def test_stems_pipeline():
    assert stems("Les chaînes audiovisuelles") == [stem("chaines"), stem("audiovisuelles")]


def test_shared_fixture_matches_current_implementation():
    """Le même fichier est relu par les tests TypeScript : les deux radicalisations doivent coïncider."""
    path = Path(__file__).resolve().parents[1] / "fixtures" / "stem_cases.json"
    cases = json.loads(path.read_text(encoding="utf-8"))["cases"]
    assert cases
    for word, expected in cases:
        assert stem(strip_accents(word.lower())) == expected, word
