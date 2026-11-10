import { Link } from 'react-router-dom';
import { fileDate, formatDate } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import type { SourceInfo } from '../lib/types';
import { useCore } from '../state/DataContext';

const FILE_DATE_ORIGIN: Record<NonNullable<SourceInfo['file_date_origin']>, string> = {
  'en-tete-http': "lue sur le fichier lui-même, à son téléchargement",
  'titre-ressource': 'lue dans le titre de la ressource',
  recuperation: 'date de récupération, faute de mieux',
  'copie-locale': 'copie locale',
  'metadonnee-data-gouv': 'métadonnée data.gouv.fr',
};

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bars__label num">{r.label}</span>
          <span className="bars__track" aria-hidden="true"><span className="bars__fill" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="bars__value num">{r.value.toLocaleString('fr-FR')}</span>
        </li>
      ))}
    </ul>
  );
}

export function Method() {
  const core = useCore();
  useDocumentTitle('Méthode et données');
  const { meta, stats, provenance } = core;
  const th = meta.algorithm.thresholds;
  const total = meta.counts.petitions;

  return (
    <div className="container page method">
      <header className="page-head">
        <p className="eyebrow">Méthode et données</p>
        <h1>Ce que l'Atlas sait, ce qu'il calcule, ce qu'il ignore</h1>
        <p className="lede">
          L'Atlas des pétitions est une <strong>expérimentation indépendante</strong> créée par Carlos Chapman pour{' '}
          <a href="https://radiodufutur.com/">Radio du Futur</a>. Il n'est affilié ni à l'Assemblée nationale ni à aucune institution, ne permet pas de signer, et ne prend
          aucune position sur le fond des pétitions.
        </p>
      </header>

      <div className="method__layout">
        <nav className="method__toc" aria-label="Sommaire de la page">
          <ol>
            <li><a href="#sources">D'où viennent les informations</a></li>
            <li><a href="#autres-projets">Autres observatoires citoyens</a></li>
            <li><a href="#mesure">Ce qui est mesuré, ce qui reste inconnu</a></li>
            <li><a href="#classement">Comment les pétitions sont classées</a></li>
            <li><a href="#rapprochements">Comment on les rapproche</a></li>
            <li><a href="#erreurs">Pourquoi le moteur peut se tromper</a></li>
            <li><a href="#signaler">Signaler une erreur</a></li>
            <li><a href="#fraicheur">Fraîcheur et historique</a></li>
            <li><a href="#limites">Limites</a></li>
          </ol>
        </nav>

        <div className="method__body prose">
          <section id="sources">
            <h2>D'où viennent les informations</h2>
            <p>
              Le catalogue s'appuie principalement sur le jeu de données ouvert{' '}
              <a href={meta.dataset_page} target="_blank" rel="noopener noreferrer">« Pétitions de l'Assemblée nationale »</a> publié sur data.gouv.fr, sous{' '}
              <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/" target="_blank" rel="noopener noreferrer">Licence Ouverte / Open Licence 2.0</a>. Le fichier est actualisé
              chaque lundi par ses producteurs. Lorsque ce fichier omet des pétitions publiées, un rattrapage distinct lit leurs fiches sur la plateforme officielle ; ces entrées sont identifiées et datées dans l'Atlas.
            </p>
            <p>
              Les titres, descriptions, dates, nombres de soutiens, statuts, commissions, décisions et liens officiels sont repris <strong>tels quels</strong>. Chaque fiche renvoie vers la
              pétition sur <a href={meta.official_site} target="_blank" rel="noopener noreferrer">le site officiel</a>, seul endroit où l'on peut la signer.
            </p>
            <p className="note">
              Attention : la colonne « description » du fichier est issue d'une extraction de métadonnées. Elle peut être plus courte que le texte intégral de la pétition.
            </p>
          </section>

          <section id="autres-projets">
            <h2>Autres observatoires citoyens</h2>
            <p>
              <a href="https://suiteadonner.nucom.fr/" target="_blank" rel="noopener noreferrer">« Suite à donner »</a>{' '}
              est un observatoire indépendant qui suit le devenir des pétitions à l'Assemblée nationale, notamment
              les décisions des commissions. L'Atlas permet de découvrir et de rapprocher les demandes ; les deux approches
              se prolongent. Chaque fiche de pétition de l'Atlas propose un lien direct vers le numéro correspondant dans cet observatoire.
            </p>
            <p>
              L'observatoire a également publié un{' '}
              <a href="https://suiteadonner.nucom.fr/absentes-du-fichier" target="_blank" rel="noopener noreferrer">relevé des pétitions absentes du fichier ouvert</a>,
              en réponse à un{' '}
              <a href="https://github.com/datagouv/datagouvfr_data_pipelines/issues/839" target="_blank" rel="noopener noreferrer">signalement technique public</a>.
              Ce travail permet de comparer les relevés et d'améliorer les données disponibles.
            </p>
          </section>

          <section id="mesure">
            <h2>Ce qui est mesuré, ce qui reste inconnu</h2>
            <p>
              <strong>Mesuré</strong> : le nombre de pétitions du catalogue ({total.toLocaleString('fr-FR')}), leurs dates de dépôt, le nombre de soutiens <em>à la date du fichier</em>, le statut et la commission.
            </p>
            <p>
              <strong>Inconnu ou non fiable</strong> : les soutiens ne sont pas un compteur en temps réel ; le fichier ne dit pas pourquoi une pétition est absente ; la législature est vide pour
              la plupart des pétitions récentes ; rien n'indique si une pétition a eu des suites parlementaires au-delà de la « décision » publiée dans le fichier. L'Atlas n'invente aucune
              décision ni aucune évolution de soutiens.
            </p>
            <p>
              L'écart entre ce fichier et le catalogue public actuellement ouvert est documenté dans le{' '}
              <a href={`${import.meta.env.BASE_URL}audit/`}>rapport d'audit</a>
              {meta.public_count
                ? ` : ${meta.public_count.count.toLocaleString('fr-FR')} initiatives relevées sur le site officiel le ${formatDate(meta.public_count.observed_on)}.`
                : ' ; à ce jour, le comptage public n\'a pas encore été relevé et l\'écart n\'est donc pas chiffré.'}
            </p>
            <h3>Répartition des statuts</h3>
            <Bars rows={Object.entries(stats.status).map(([label, value]) => ({ label, value }))} />
            <h3>Dépôts par année</h3>
            <Bars rows={Object.entries(stats.years).map(([label, value]) => ({ label, value }))} />
          </section>

          <section id="classement">
            <h2>Comment les pétitions sont classées</h2>
            <p>
              Vingt familles thématiques (démocratie, santé, logement, médias…) sont attribuées <strong>automatiquement</strong> par repérage de vocabulaire, avec plus de poids pour le titre.
              Une pétition peut recevoir jusqu'à trois familles ; {(total - meta.counts.themed).toLocaleString('fr-FR')} n'en ont aucune. Ce n'est <strong>pas une classification officielle</strong> de
              l'Assemblée nationale, et une famille n'est jamais une position politique.
            </p>
            <Bars rows={core.taxonomy.map((t) => ({ label: t.label, value: stats.themes[t.id] ?? 0 })).sort((a, b) => b.value - a.value)} />
            <p>La popularité est un filtre parmi d'autres ; elle n'est jamais le seul mécanisme de visibilité.</p>
          </section>

          <section id="rapprochements">
            <h2>Comment on les rapproche</h2>
            <p>
              Le moteur ({meta.algorithm.version}) tourne hors du navigateur, sans service d'IA externe, et donne toujours les mêmes résultats pour les mêmes données :
            </p>
            <ol>
              <li>Le texte est nettoyé (balises, accents, mots-outils, formes plurielles) ; le texte original n'est jamais modifié.</li>
              <li>Trois proximités sont mesurées : mots et expressions du titre, mots et expressions du texte (TF-IDF), et suites de lettres (n-grammes de caractères), qui absorbent fautes et variantes.</li>
              <li>Elles sont combinées (titre {th.w_title}, texte {th.w_body}, caractères {th.w_chars}) en un <em>indice technique</em> qui sert uniquement à classer des résultats.</li>
              <li>Pour chaque pétition, ses voisines les plus proches sont typées :
                <ul>
                  <li><strong>Textes très proches</strong> : indice ≥ {th.near_score}, ou titres presque identiques ;</li>
                  <li><strong>Propositions complémentaires</strong> : indice ≥ {th.related_score} et au moins {th.min_shared_terms} termes caractéristiques en commun ;</li>
                  <li><strong>Pistes de comparaison</strong> : même sujet <em>et</em> couple d'antonymes explicites dans les titres (interdire/autoriser, supprimer/rétablir, obligatoire/refuser, augmenter/baisser). Sans indice explicite, jamais de désaccord supposé.</li>
                </ul>
              </li>
              {meta.algorithm.semantic && (
                <li>
                  <strong>Une couche de sens</strong> complète les mots : un modèle de langue open source ({meta.algorithm.semantic.model}, licence MIT, révision figée), exécuté hors du navigateur,
                  transforme chaque texte en vecteur. Une paire de plus n'est retenue que si les deux textes sont parmi les plus proches l'un de l'autre <em>et</em> si leur vocabulaire se recoupe : le sens
                  propose, les mots confirment. {(meta.counts.semantic_relations ?? 0).toLocaleString('fr-FR')} relations viennent de cette couche ; elles sont signalées sur les fiches. Un modèle de langue rapproche
                  des idées voisines, mais ne distingue pas le pour du contre.
                </li>
              )}
              <li>Les constellations regroupent des pétitions par classification hiérarchique à liage moyen : une pétition n'entre pas dans un groupe seulement parce qu'elle partage un voisin intermédiaire.</li>
              <li>Une relecture humaine peut confirmer, corriger, ajouter ou rejeter un rapprochement via un fichier versionné ; ces cas sont signalés sur les fiches.</li>
            </ol>
            <p>
              {meta.counts.relations.toLocaleString('fr-FR')} relations et {meta.counts.dossiers} constellations ont été calculées pour ce catalogue. Les soutiens de pétitions rapprochées
              <strong> ne sont jamais additionnés</strong> : une même personne peut en avoir signé plusieurs.
            </p>
          </section>

          <section id="erreurs">
            <h2>Pourquoi deux pétitions proches peuvent avoir des demandes différentes — et pourquoi le moteur peut se tromper</h2>
            <ul>
              <li>Deux textes qui parlent du même sujet partagent du vocabulaire, même s'ils demandent l'inverse : la proximité n'est pas l'identité d'une revendication.</li>
              <li>Un titre court (« Éducation ») ressemble à beaucoup de textes sans vraiment leur être lié.</li>
              <li>La radicalisation du français est volontairement légère : des variantes peuvent échapper au rapprochement.</li>
              <li>Un rapprochement « par le sens » peut réunir deux textes qui parlent de la même chose en des termes opposés : c'est voulu (la multiperspective), mais seul un couple de mots contraires explicites le signale comme piste de comparaison.</li>
              <li>La détection des divergences ne repère que des couples de mots explicites ; elle en manque beaucoup et peut en voir un dans une négation ou une citation.</li>
              <li>Les familles thématiques se trompent sur les textes ambigus ou très courts.</li>
            </ul>
            <p>Lorsque c'est possible, chaque rapprochement indique les mots communs qui l'expliquent, pour que vous puissiez le vérifier vous-même.</p>
          </section>

          {meta.recovered && meta.recovered.count > 0 && (
            <section id="absentes">
              <h2>Les pétitions absentes du fichier public</h2>
              <p>
                Le fichier de data.gouv.fr omet des pétitions pourtant publiées, dont certaines parmi les plus signées. Le programme qui le fabrique classe comme inutilisé tout numéro
                inférieur au plus grand numéro déjà vu : une pétition encore en modération à ce moment n'y entre plus jamais. L'Atlas relit donc ces numéros sur le site officiel :{' '}
                <strong>{meta.recovered.count.toLocaleString('fr-FR')} pétitions</strong> ont été ajoutées ainsi le {formatDate(meta.recovered.read_on)}, et sont marquées comme telles.
              </p>
            </section>
          )}

          <section id="signaler">
            <h2>Signaler une erreur</h2>
            <p>
              Un rapprochement absurde, une famille erronée, une donnée mal reprise ? Écrivez à{' '}
              <a href="mailto:radiodufutur@protonmail.com?subject=Atlas%20des%20p%C3%A9titions%20%3A%20signalement">radiodufutur@protonmail.com</a>
              {' '}en indiquant les numéros de pétitions concernés. Les corrections retenues sont appliquées à chaque mise à jour de l'Atlas. Pour une
              erreur dans le texte d'une pétition elle-même, la source est le site officiel.
            </p>
            <p>
              Le code et les données de l'Atlas sont publics :{' '}
              <a href="https://github.com/CarlosMatthewMadocChapman/atlas-des-petitions" target="_blank" rel="noopener noreferrer">dépôt atlas-des-petitions</a>.
              {' '}Chacun peut voir comment il fonctionne, le vérifier et en faire sa propre copie ; seul Radio du Futur peut modifier ce dépôt et ce site.
            </p>
          </section>

          <section id="fraicheur">
            <h2>Fraîcheur et historique</h2>
            <dl className="facts facts--compact">
              <div><dt>Fichier source</dt><dd>{meta.source.resource_title}</dd></div>
              <div><dt>Date du fichier</dt><dd>{formatDate(fileDate(meta.source))}{meta.source.file_date_origin ? <span className="muted"> ({FILE_DATE_ORIGIN[meta.source.file_date_origin]})</span> : null}</dd></div>
              {meta.source.file_date && meta.source.resource_last_modified.slice(0, 10) !== meta.source.file_date.slice(0, 10) && (
                <div><dt>Métadonnée data.gouv.fr</dt><dd>{formatDate(meta.source.resource_last_modified)} <span className="muted">(non renouvelée quand le fichier change : elle n'est pas utilisée)</span></dd></div>
              )}
              <div><dt>Récupéré le</dt><dd>{formatDate(meta.source.retrieved_at)}</dd></div>
              <div><dt>Empreinte SHA-256</dt><dd><code>{meta.source.sha256.slice(0, 24)}…</code></dd></div>
              <div><dt>Version du moteur</dt><dd><code>{meta.algorithm.version}</code></dd></div>
            </dl>
            <h3>Historique de provenance</h3>
            <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Récupéré le</th><th>Fichier du</th><th>Pétitions</th><th>Moteur</th></tr></thead>
              <tbody>
                {[...provenance].reverse().map((p) => (
                  <tr key={p.retrieved_at + p.sha256}>
                    <td>{formatDate(p.retrieved_at)}</td><td>{formatDate(fileDate(p))}</td><td className="num">{p.petitions.toLocaleString('fr-FR')}</td><td><code>{p.algorithm}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          <section id="limites">
            <h2>Limites</h2>
            <ul>
              <li>Un seul fichier à la fois : l'Atlas ne conserve pas l'évolution des soutiens d'une semaine à l'autre (prévu comme amélioration).</li>
              <li>Pas de texte intégral des pétitions : seulement la description du fichier.</li>
              <li>Pas de dossiers éditoriaux ni de contributions volontaires dans cette première version.</li>
              <li>Vie privée : aucun compte, aucun suivi, aucun cookie. Les favoris restent dans votre navigateur.</li>
            </ul>
            <p><Link to="/">Retour à l'accueil</Link></p>
          </section>
        </div>
      </div>
    </div>
  );
}
