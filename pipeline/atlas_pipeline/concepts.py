"""Groupes de termes voisins, utilisés par la recherche pour élargir une requête.

Un terme d'un groupe retrouve ses voisins avec un poids réduit. Les groupes sont
volontairement courts et lisibles : on peut les relire, les corriger, en ajouter.
"""

from __future__ import annotations

from .textnorm import stem, tokens

GROUPS: dict[str, str] = {
    "medias": "média audiovisuel télévision chaîne presse journalisme journaliste radio pluralisme tnt fréquence arcom csa information diffusion publicité redevance",
    "democratie": "démocratie référendum élection vote scrutin proportionnelle abstention constitution citoyenne tirage représentation",
    "retraites": "retraite pension réforme cotisation régime annuité",
    "sante": "santé hôpital médecin soin patient urgence déserts médical infirmier",
    "logement": "logement loyer locataire proprietaire hlm expulsion bail immobilier",
    "energie": "énergie nucléaire électricité renouvelable éolien solaire gaz carburant essence",
    "agriculture": "agriculture agriculteur paysan elevage pesticide glyphosate alimentation bio",
    "environnement": "environnement climat écologie biodiversité pollution déchet plastique forêt",
    "education": "école éducation enseignant professeur élève étudiant université lycée collège",
    "justice": "justice tribunal juge peine prison victime magistrat condamnation",
    "securite": "police gendarmerie sécurité délinquance violence",
    "numerique": "numérique internet donnée algorithme intelligence cyber réseaux plateforme",
    "transports": "transport train sncf route autoroute velo vitesse permis voiture",
    "fiscalite": "impôt fiscalité taxe tva fiscal budget dette",
    "travail": "travail salaire emploi chômage licenciement smic syndicat contrat",
    "animaux": "animal animaux chasse corrida chien chat maltraitance elevage",
    "handicap": "handicap handicapé autonomie accessibilité aesh dépendance",
    "immigration": "immigration migrant asile étranger nationalité réfugié",
    "fin-de-vie": "euthanasie suicide assisté vie soins palliatifs",
    "culture": "culture patrimoine spectacle cinéma théâtre musique artiste livre",
}


def groups_as_stems() -> list[list[list[str]]]:
    """Chaque groupe : liste de paires [radical, mot affiché]."""
    out: list[list[list[str]]] = []
    for words in GROUPS.values():
        pairs: dict[str, str] = {}
        for word in words.split():
            for token in tokens(word):
                pairs.setdefault(stem(token), word)
        out.append([[s, w] for s, w in sorted(pairs.items())])
    return out
