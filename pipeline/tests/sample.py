"""Pétitions d'essai (écrites pour les tests, jamais livrées à l'application)."""

HEADER = "titre;description;date_publication;nb_votes;statut;date_limite_vote;commission;legislature;decision_commission;url;identifiant"
BASE = "https://petitions.assemblee-nationale.fr/initiatives/i-"
CULT = "Commission des affaires culturelles"
SOC = "Commission des affaires sociales"
ECO = "Commission des affaires économiques"


def row(i, title, description, date, votes, status, commission, legislature=""):
    return (title, description, date, votes, status, "2025-12-01" if votes else "", commission, legislature, "", f"{BASE}{i}", str(i))


ROWS = [
    # Audiovisuel : deux textes presque identiques, deux demandes complémentaires.
    row(1, "Retirer la diffusion de la chaîne d'information", "Il faut retirer l'autorisation de diffusion de cette chaîne d'information qui désinforme les téléspectateurs et menace le pluralisme audiovisuel.", "2024-01-10", "120.0", "archivee", CULT, "2022-2024"),
    row(2, "Retirer l'autorisation de diffusion de la chaîne d'information", "Retirer l'autorisation de diffusion de cette chaîne d'information qui désinforme les téléspectateurs, au nom du pluralisme audiovisuel.", "2024-02-11", "35.0", "archivee", CULT, "2022-2024"),
    row(3, "Renforcer le pluralisme audiovisuel", "Le pluralisme audiovisuel doit être garanti par des quotas d'expression pour les opinions politiques et par un contrôle renforcé des chaînes de télévision d'information.", "2024-03-01", "80.0", "archivee", CULT, "2022-2024"),
    row(4, "Réformer l'attribution des fréquences de la TNT", "Les fréquences de la TNT sont attribuées sans transparence : réformer la procédure d'attribution des fréquences et le contrôle du pluralisme audiovisuel des chaînes de télévision d'information.", "2024-03-05", "12.0", "archivee", CULT, "2022-2024"),
    row(5, "Renforcer les pouvoirs de l'autorité de régulation audiovisuelle", "Donner à l'autorité de régulation de l'audiovisuel des pouvoirs de contrôle et de sanction contre les chaînes de télévision d'information qui trompent le public.", "2024-04-02", "44.0", "archivee", CULT, "2022-2024"),
    # Cannabis : deux orientations divergentes.
    row(6, "Interdire la vente de cannabis récréatif", "Maintenir l'interdiction et durcir la vente de cannabis récréatif pour protéger la santé des jeunes consommateurs.", "2023-05-01", "300.0", "archivee", SOC, "2022-2024"),
    row(7, "Autoriser la vente de cannabis récréatif", "Légaliser et encadrer la vente de cannabis récréatif pour assécher le marché noir et protéger la santé des jeunes consommateurs.", "2023-05-09", "410.0", "archivee", SOC, "2022-2024"),
    row(8, "Cannabis récréatif : une vente encadrée par l'État", "Mettre en place une vente de cannabis récréatif encadrée par l'État, avec contrôle sanitaire des produits pour les consommateurs.", "2023-06-01", "27.0", "archivee", SOC, "2022-2024"),
    # Sans rapport.
    row(9, "Pour des pistes cyclables sécurisées dans les villes", "Construire des pistes cyclables séparées de la chaussée dans toutes les villes de plus de dix mille habitants.", "2025-01-02", "90.0", "ouverte", "Commission du développement durable"),
    row(10, "Réduire la taille des classes en maternelle", "Limiter à vingt élèves par classe en école maternelle pour améliorer l'apprentissage de la lecture.", "2025-01-03", "15.0", "ouverte", CULT),
    row(11, "Protéger les abeilles des pesticides", "Interdire les pesticides néonicotinoïdes qui détruisent les colonies d'abeilles et la biodiversité.", "2025-02-02", "260.0", "ouverte", ECO),
    row(12, "Revaloriser les pensions de retraite agricoles", "Porter les retraites agricoles au niveau du SMIC pour les exploitants ayant cotisé toute leur carrière.", "2025-02-03", "75.0", "ouverte", SOC),
    row(13, "Rouvrir la maternité de la ville", "La fermeture de la maternité oblige les femmes à parcourir soixante kilomètres : rouvrir la maternité.", "2025-03-03", "", "ouverte", ""),
    row(14, "Taxer les transactions financières à haute fréquence", "Instaurer une taxe sur les transactions financières à haute fréquence afin de financer les services publics.", "2025-03-05", "50.0", "ouverte", "Commission des finances"),
    row(15, "Soutenir le cinéma indépendant dans les petites villes", "Créer un fonds pour maintenir les salles de cinéma indépendantes dans les petites villes.", "2025-04-01", "61.0", "ouverte", CULT),
    row(16, "Réglementer l'intelligence artificielle générative", "Encadrer l'usage de l'intelligence artificielle générative et protéger les données personnelles.", "2025-04-02", "88.0", "ouverte", "Commission des lois"),
    row(17, "Rénover les logements mal isolés", "Aider les propriétaires modestes à rénover leur logement mal isolé pour réduire les factures d'énergie.", "2025-05-02", "33.0", "ouverte", ECO),
    row(18, "Protéger les chats errants", "Mettre en place des campagnes de stérilisation des chats errants dans toutes les communes.", "2025-05-03", "22.0", "ouverte", ECO),
    row(19, "Améliorer l'accès aux soins dans les déserts médicaux", "Envoyer des médecins dans les déserts médicaux grâce à des incitations et des maisons de santé.", "2025-06-01", "140.0", "ouverte", SOC),
    row(20, "Mieux payer les accompagnants d'élèves handicapés", "Revaloriser le salaire et le statut des accompagnants des élèves en situation de handicap.", "2025-06-02", "58.0", "ouverte", CULT),
]


def csv_text(rows=ROWS) -> str:
    return "\n".join([HEADER] + [";".join(r) for r in rows]) + "\n"
