"""Normalisation du français : la même logique existe côté navigateur (src/lib/text.ts).

Le texte original n'est jamais modifié : ces fonctions ne produisent que des
formes dérivées (jetons, radicaux) servant à l'indexation et au rapprochement.
La parité avec le TypeScript est vérifiée par `fixtures/stem_cases.json`.
"""

from __future__ import annotations

import html
import re
import unicodedata

_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_WORD_RE = re.compile(r"[a-z]{3,}")

# Mots-outils français usuels.
_STOP_BASE = """
alors apres assez aucun aussi autre autres avant avec avoir avons avez avait avaient
beaucoup bien car cela celle celles celui ceux chaque chez comme comment contre dans
dans dont donc depuis des deux devrait doit doivent dont elle elles encore enfin entre
est etait etre faire fait faut fois font hors ils ici jamais jusqu leur leurs lors
lorsque mais meme memes moins mon mes nos notre notres nous nouveau nouvelle ont
par parce pas pendant peu peut peuvent plus plusieurs pour pourquoi pourtant puis
quand que quel quelle quelles quels quelque quelques qui quoi sans selon sera seront
ses seulement sinon soit sont sous sur tous tout toute toutes tres une uns votre vos
vous aux ces cet cette son sa ses notamment ainsi afin face lieu cas part
quil quelle ils elles nest cest sest dune dun etc
""".split()

# Vocabulaire de formulation des pétitions : il décrit le genre, pas le sujet.
_STOP_PETITION = """
petition petitions petitionnaire signer signez signature signatures signataire signataires
demande demander demandons souhaite souhaitons souhaiter proposition proposer propose
assemblee nationale gouvernement francais francaise france pays citoyen citoyens
monsieur madame deputes depute loi lois article articles mettre mise
cordialement bonjour merci salutations sinceres ete etes sommes voit voir devons pouvoir permettre
permettrait besoin tant doivent ceux ceci toujours rien beaucoup
situation actuellement aujourd hui
les non ait instar considerant souvent signant appelons tendance gouv valide crucial
""".split()


def strip_accents(text: str) -> str:
    text = text.replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE")
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def clean_text(text: str) -> str:
    """Retire balises, entités HTML et URL, sans toucher au sens."""
    text = html.unescape(text or "")
    text = _TAG_RE.sub(" ", text)
    text = _URL_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


STOPWORDS: frozenset[str] = frozenset(strip_accents(w) for w in _STOP_BASE + _STOP_PETITION)

# Terminaisons, de la plus longue à la plus courte : un seul retrait par mot.
_SUFFIXES = (
    "issements", "issement", "ations", "ation", "ateurs", "ateur", "atrices", "atrice",
    "ements", "ement", "ences", "ence", "ances", "ance", "elles", "elle", "iennes",
    "ienne", "euses", "euse", "ments", "ment", "ites", "ite", "ives", "ive", "ions",
    "ion", "eurs", "eur", "ales", "ale", "aux", "ees", "ee", "es", "s", "x", "e",
)
_MIN_STEM = 4


def stem(word: str) -> str:
    """Radical léger : retire la terminaison la plus longue sans descendre sous 4 lettres."""
    if len(word) <= _MIN_STEM:
        return word
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= _MIN_STEM:
            if suffix == "aux":
                return word[: -len(suffix)] + "al"
            if suffix in ("elles", "elle"):
                return word[: -len(suffix)] + "el"
            if suffix in ("iennes", "ienne"):
                return word[: -len(suffix)] + "ien"
            return word[: -len(suffix)]
    return word


def tokens(text: str) -> list[str]:
    """Jetons en minuscules sans accents, sans mots-outils, ni radicalisation."""
    folded = strip_accents(clean_text(text).lower().replace("’", "'"))
    return [w for w in _WORD_RE.findall(folded) if w not in STOPWORDS]


def stems(text: str) -> list[str]:
    return [stem(w) for w in tokens(text)]


def fold(text: str) -> str:
    """Forme repliée (minuscules, sans accents) pour l'affichage de recherche."""
    return strip_accents((text or "").lower().replace("’", "'"))
