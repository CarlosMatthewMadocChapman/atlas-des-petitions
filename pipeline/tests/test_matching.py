import pytest

from atlas_pipeline.ingest import parse_csv
from atlas_pipeline.matching import (
    TYPE_NEAR, TYPE_OPPOSED, TYPE_RELATED, Thresholds, build_corpus, build_engine, candidate_edges,
    classify_pair, cluster_dossiers, opposed_cues,
)
from atlas_pipeline.textnorm import stems
from sample import csv_text

# Petit corpus d'essai : on desserre les seuils de fréquence documentaire, pas ceux de typage.
SMALL = Thresholds(dossier_min_size=2)


@pytest.fixture(scope="module")
def engine():
    petitions = parse_csv(csv_text()).petitions
    corpus = build_corpus([p.id for p in petitions], [p.title for p in petitions], [p.description for p in petitions])
    return build_engine(corpus, [p.description for p in petitions], SMALL)


def idx(engine, pid):
    return engine.corpus.ids.index(pid)


def test_nearly_identical_texts_are_flagged_close(engine):
    edge = classify_pair(engine, idx(engine, "1"), idx(engine, "2"))
    assert edge and edge["type"] == TYPE_NEAR


def test_same_subject_different_demands_are_related_not_identical(engine):
    edge = classify_pair(engine, idx(engine, "3"), idx(engine, "4"))
    assert edge is not None and edge["type"] == TYPE_RELATED
    assert len(edge["terms"]) >= SMALL.min_shared_terms
    assert edge["score"] < SMALL.near_score


def test_antonym_titles_on_same_subject_become_comparison(engine):
    edge = classify_pair(engine, idx(engine, "6"), idx(engine, "7"))
    assert edge is not None and edge["type"] == TYPE_OPPOSED
    assert "interdire" in edge["cues"] or "interdiction" in edge["cues"]


def test_unrelated_petitions_get_no_relation(engine):
    assert classify_pair(engine, idx(engine, "9"), idx(engine, "10")) is None
    assert classify_pair(engine, idx(engine, "14"), idx(engine, "18")) is None


def test_lexical_proximity_alone_does_not_create_disagreement():
    assert opposed_cues(stems("Cannabis récréatif encadré"), stems("Cannabis récréatif contrôlé")) == []


def test_antonym_must_be_split_between_the_two_titles():
    assert opposed_cues(stems("Interdire ou autoriser le cannabis"), stems("Interdire le cannabis")) == []


def test_edges_are_unique_and_deterministic(engine):
    first = candidate_edges(engine)
    assert first == candidate_edges(engine)
    keys = {frozenset((e["a"], e["b"])) for e in first}
    assert len(keys) == len(first)


def test_audiovisual_family_is_grouped_without_unrelated_members(engine):
    groups = [{engine.corpus.ids[i] for i in members} for members in cluster_dossiers(engine)]
    audio = next(g for g in groups if "1" in g)
    assert {"1", "2"} <= audio
    assert not audio & {"9", "10", "14", "18"}


def test_chain_effect_is_avoided():
    # A~B et B~C ne suffisent pas à réunir A et C quand A et C n'ont rien en commun.
    docs = [
        ("1", "Interdire les pesticides dangereux pour les abeilles", "pesticides abeilles colonies disparition biodiversité insecticides"),
        ("2", "Pesticides et pollution des rivières", "pesticides rivières pollution eau nitrates agriculture biodiversité"),
        ("3", "Pollution des rivières par les rejets industriels", "rivières pollution eau rejets industriels usines contrôle"),
        ("4", "Contrôle des rejets industriels des usines", "usines rejets industriels contrôle inspections sanctions environnement"),
        ("5", "Sanctions pour les usines polluantes", "usines inspections sanctions environnement amendes pollution"),
        ("6", "Maternelle et lecture", "classes lecture élèves maternelle apprentissage"),
        ("7", "Lecture à l'école maternelle", "classes lecture élèves maternelle enseignants"),
    ]
    corpus = build_corpus([d[0] for d in docs], [d[1] for d in docs], [d[2] for d in docs])
    engine = build_engine(corpus, [d[2] for d in docs], Thresholds(dossier_min_size=2))
    for members in cluster_dossiers(engine):
        group = {corpus.ids[i] for i in members}
        assert not {"1", "5"} <= group
        assert not (group & {"6", "7"} and group & {"1", "2", "3", "4", "5"})
