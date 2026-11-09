"""Taxonomie publique initiale, révisable, et affectation multi-thèmes.

Ce n'est pas une classification officielle de l'Assemblée nationale : c'est une
catégorisation automatique par vocabulaire, qui peut se tromper. Une pétition
peut recevoir jusqu'à trois thèmes ; un thème n'est jamais une position.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from .textnorm import stem, tokens

# Couleur (teinte vive pour les repères) et encre (variante sombre lisible sur ivoire).
THEMES: list[dict] = [
    {"id": "democratie", "label": "Démocratie et institutions", "color": "#8c3f6e", "ink": "#6e2b55",
     "words": "democratie election electeur electoral referendum vote voter constitution institution parlement senat parlementaire depute citoyenne representation proportionnelle abstention bulletin scrutin mandat transparence corruption lobby lobbying republique initiative citoyenne tirage sort"},
    {"id": "medias", "label": "Médias et information", "color": "#b5651d", "ink": "#8a4b12",
     "words": "media medias audiovisuel television chaine presse journal journaliste journalisme radio information pluralisme desinformation propagande tnt frequence arcom csa diffusion telediffusion publicite redevance audiovisuelle"},
    {"id": "sante", "label": "Santé", "color": "#2f7d6d", "ink": "#1f5c4f",
     "words": "sante medecin hopital hospitalier maladie patient soin medicament vaccin vaccination infirmier pharmacie pharmacien urgence cancer handicap psychiatrie dentiste sage-femme medical secu securite-sociale mutuelle remboursement covid sanitaire epidemie"},
    {"id": "solidarites", "label": "Solidarités et social", "color": "#c0583a", "ink": "#93402a",
     "words": "retraite retraite pension allocation aide social pauvrete precarite rsa famille parent enfant naissance dependance autonomie senior ainee handicape invalidite minima solidarite chomage prestation caf apl"},
    {"id": "agriculture", "label": "Agriculture et alimentation", "color": "#6b8e23", "ink": "#4a6318",
     "words": "agriculture agriculteur agricole paysan elevage eleveur alimentation alimentaire pesticide glyphosate duplomb neonicotinoide acetamipride phytosanitaire bio culture recolte ferme paturage lait viande cereale vigne viticulture peche pecheur"},
    {"id": "environnement", "label": "Environnement et climat", "color": "#3a8f57", "ink": "#256b3d",
     "words": "environnement climat climatique ecologie ecologique biodiversite pollution dechet recyclage plastique foret eau rivier ocean mer littoral carbone emission espece nature protection ecosysteme rechauffement"},
    {"id": "energie", "label": "Énergie", "color": "#d4a017", "ink": "#7d5f06",
     "words": "energie nucleaire electricite renouvelable eolien eolienne solaire photovoltaique gaz petrole carburant essence edf centrale hydrogene biomasse electrique prix-energie"},
    {"id": "education", "label": "Éducation et jeunesse", "color": "#3b6fb6", "ink": "#2a5290",
     "words": "ecole education enseignant professeur eleve etudiant universite lycee college scolaire apprentissage formation jeunesse bac bourse diplome pedagogie instituteur maternelle creche periscolaire"},
    {"id": "logement", "label": "Logement", "color": "#a0522d", "ink": "#7c3d1f",
     "words": "logement loyer locataire proprietaire hlm immobilier habitat sans-abri hebergement expulsion copropriete bail caution foncier construction habitation"},
    {"id": "travail", "label": "Travail et emploi", "color": "#5b5ea6", "ink": "#424583",
     "words": "travail salarie salaire emploi employeur chomage syndicat licenciement entreprise contrat cdi cdd smic heure temps-de-travail teletravail independant artisan fonctionnaire profession metier"},
    {"id": "economie", "label": "Économie et fiscalité", "color": "#7a6a2b", "ink": "#5a4d17",
     "words": "impot fiscal fiscalite taxe tva budget dette economie economique banque pouvoir-achat inflation prix capital entreprise commerce pme douane investissement cotisation charge"},
    {"id": "transports", "label": "Transports et mobilités", "color": "#2a8fa8", "ink": "#1d6a7d",
     "words": "transport train sncf route autoroute voiture automobile velo mobilite vitesse permis conducteur circulation bus aerien avion aeroport ferroviaire peage camion"},
    {"id": "justice", "label": "Justice et sécurité", "color": "#7b3f3f", "ink": "#5c2c2c",
     "words": "justice tribunal juge penal peine prison condamnation procedure avocat victime delit crime police gendarmerie securite delinquance prescription magistrat judiciaire penal sanction"},
    {"id": "droits", "label": "Droits fondamentaux", "color": "#a23b72", "ink": "#7e2858",
     "words": "egalite discrimination fondamental dignite vie-privee consentement racisme homophobie genre femme violence harcelement laicite religion immigration migrant asile nationalite euthanasie fin-de-vie"},
    {"id": "numerique", "label": "Numérique et données", "color": "#3f5c99", "ink": "#2e4574",
     "words": "numerique internet donnee donnees algorithme intelligence-artificielle cyber reseau-social ordinateur logiciel plateforme surveillance fichage cnil telephone 5g application informatique"},
    {"id": "culture", "label": "Culture et patrimoine", "color": "#9a4dae", "ink": "#73378a",
     "words": "culture culturel patrimoine musee spectacle cinema theatre musique artiste livre bibliotheque edition langue histoire monument sport sportif festival creation"},
    {"id": "territoires", "label": "Territoires et services publics", "color": "#4f8a8b", "ink": "#376465",
     "words": "commune communal maire territoire rural ruralite departement region collectivite service-public poste fermeture desert urbanisme metropole outre-mer corse decentralisation intercommunalite"},
    {"id": "defense", "label": "Défense et sécurité nationale", "color": "#5d6d7e", "ink": "#3f4d5b",
     "words": "defense armee militaire soldat guerre veteran terrorisme conscription reserviste armement"},
    {"id": "international", "label": "Europe et international", "color": "#2d8f8f", "ink": "#1d6969",
     "words": "europe europeen union-europeenne international otan onu traite diplomatie etranger ukraine israel palestine russie chine accord frexit exterieur"},
    {"id": "animaux", "label": "Condition animale", "color": "#c47a2c", "ink": "#8c5415",
     "words": "animal animaux chien chat cheval corrida chasse chasseur zoo cirque maltraitance abattoir elevage-intensif fourrure experimentation-animale"},
]

TITLE_WEIGHT = 3
MIN_SCORE = 3
RELATIVE_FLOOR = 0.4
MAX_THEMES = 3


def _theme_stems() -> dict[str, set[str]]:
    mapping: dict[str, set[str]] = {}
    for theme in THEMES:
        keywords: set[str] = set()
        for word in theme["words"].split():
            for part in tokens(word.replace("-", " ")):
                keywords.add(stem(part))
        mapping[theme["id"]] = keywords
    return mapping


THEME_STEMS = _theme_stems()


@dataclass
class ThemeResult:
    themes: list[str]
    scores: dict[str, int]


def assign_themes(title_stems: list[str], body_stems: list[str]) -> ThemeResult:
    title_set = set(title_stems)
    body_counts = Counter(body_stems)
    scores: dict[str, int] = {}
    for theme_id, keywords in THEME_STEMS.items():
        score = 0
        for keyword in keywords:
            if keyword in title_set:
                score += TITLE_WEIGHT
            score += min(body_counts.get(keyword, 0), 2)
        if score >= MIN_SCORE:
            scores[theme_id] = score
    if not scores:
        return ThemeResult([], {})
    best = max(scores.values())
    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    chosen = [tid for tid, s in ranked if s >= best * RELATIVE_FLOOR][:MAX_THEMES]
    return ThemeResult(chosen, scores)


def public_taxonomy() -> list[dict]:
    return [{"id": t["id"], "label": t["label"], "color": t["color"], "ink": t["ink"]} for t in THEMES]
