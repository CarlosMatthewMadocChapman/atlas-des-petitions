import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CompareButton, FavoriteButton, OfficialLink, ShareButton } from '../components/Actions';
import { StatusBadge } from '../components/Badges';
import { ConstellationMap, Legend } from '../components/ConstellationMap';
import { NodePanel, RelationReason } from '../components/NodePanel';
import { EmptyState, Loading } from '../components/States';
import { loadDetail } from '../lib/data';
import { RELATION_HELP, RELATION_LABEL, STATUS_HELP, fileDate, formatDate, formatMonth, formatNumber, shortCommission } from '../lib/format';
import { egoGraph, groupNeighbors } from '../lib/graph';
import { useDocumentTitle } from '../lib/hooks';
import type { PetitionDetail, RelationType } from '../lib/types';
import { useCore } from '../state/DataContext';

const GROUP_ORDER: RelationType[] = ['proche', 'comparaison', 'complementaire', 'thematique'];

export function PetitionView() {
  const { id = '' } = useParams();
  const core = useCore();
  const navigate = useNavigate();
  const petition = core.byId.get(id);
  const [detail, setDetail] = useState<PetitionDetail | null | 'erreur'>(null);
  const [selected, setSelected] = useState<string | null>(null);
  useDocumentTitle(petition ? petition.title : 'Pétition introuvable');

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setSelected(null);
    loadDetail(id, core.meta.detail_shard)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setDetail('erreur'));
    return () => {
      cancelled = true;
    };
  }, [id, core.meta.detail_shard]);

  const neighbors = useMemo(() => (petition ? core.adjacency.get(petition.id) ?? [] : []), [core, petition]);
  const groups = useMemo(() => groupNeighbors(neighbors), [neighbors]);
  const graph = useMemo(() => (petition ? egoGraph(core, petition.id) : null), [core, petition]);
  const dossier = petition?.dossier ? core.dossierById.get(petition.dossier) : undefined;

  if (!petition) {
    return (
      <div className="container page">
        <EmptyState
          title="Cette pétition n'est pas dans le catalogue"
          action={<Link className="btn btn--primary" to="/recherche">Explorer le catalogue</Link>}
        >
          <p>Le numéro « {id} » ne figure pas dans le fichier de données intégré. Il peut s'agir d'une pétition non publiée ou plus récente que le dernier jeu de données.</p>
        </EmptyState>
      </div>
    );
  }

  const text = detail && detail !== 'erreur' ? detail : null;
  const isLong = text ? text.description.length > 9500 : false;
  const present = new Set(graph?.links.map((l) => l.relation.type));
  const othersInDossier = dossier ? dossier.members.filter((m) => m !== petition.id) : [];

  return (
    <article className="container page petition">
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link to="/recherche">Explorer</Link>
        {dossier && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/constellations/${dossier.id}`}>Dossier « {dossier.terms.slice(0, 2).join(' · ')} »</Link>
          </>
        )}
        <button type="button" className="crumbs__back" onClick={() => navigate(-1)}>Retour au contexte précédent</button>
      </nav>

      <header className="petition__head">
        <p className="eyebrow num">Pétition n° {petition.id}</p>
        <h1>{petition.title}</h1>
        <div className="petition__cta">
          <OfficialLink id={petition.id} meta={core.meta} prominent />
          <FavoriteButton id={petition.id} title={petition.title} />
          <CompareButton id={petition.id} title={petition.title} />
          <ShareButton path={`/petition/${petition.id}`} title={petition.title} />
        </div>
        <p className="petition__warning">
          L'Atlas est un site indépendant : <strong>on ne peut pas y signer</strong>. La signature se fait uniquement sur le site officiel de l'Assemblée nationale.
        </p>
      </header>

      <div className="petition__layout">
        <div className="petition__main">
          <section aria-labelledby="faits">
            <h2 id="faits" className="section-title">Les faits du jeu de données</h2>
            <dl className="facts">
              <div><dt>Statut</dt><dd><StatusBadge status={petition.status} /> <span className="muted">{STATUS_HELP[petition.status]}</span></dd></div>
              <div><dt>Mise en ligne</dt><dd>{formatDate(petition.published)}</dd></div>
              <div>
                <dt>Soutiens</dt>
                <dd>
                  <span className="num facts__big">{formatNumber(petition.votes)}</span>
                  <span className="muted"> au {formatDate(fileDate(core.meta.source))} — pas un compteur en direct</span>
                </dd>
              </div>
              <div><dt>Date limite de vote</dt><dd>{formatDate(text?.deadline ?? null)}</dd></div>
              <div><dt>Commission</dt><dd>{petition.commission ?? 'non renseignée'}</dd></div>
              <div><dt>Législature</dt><dd>{petition.legislature || 'non renseignée'}</dd></div>
            </dl>
            {text?.decision && (
              <div className="decision">
                <h3>Décision publiée dans le jeu de données</h3>
                <blockquote>{text.decision}</blockquote>
              </div>
            )}
          </section>

          <section aria-labelledby="texte">
            <h2 id="texte" className="section-title">Texte de la pétition</h2>
            <p className="source-note">
              Description telle que publiée dans le jeu de données, sans modification. Elle est issue d'une extraction de métadonnées et peut être plus courte que le texte intégral
              {isLong && ' (celle-ci atteint la limite de la colonne et semble tronquée)'}. Le texte complet est sur le site officiel.
            </p>
            {detail === null && <Loading label="Chargement du texte…" />}
            {detail === 'erreur' && <p className="note note--warn" role="alert">Le texte n'a pas pu être chargé. Le titre et les faits restent valables.</p>}
            {text && (
              <div className="prose" lang="fr">
                {text.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
              </div>
            )}
          </section>

          <section aria-labelledby="voisines">
            <h2 id="voisines" className="section-title">Pétitions proches</h2>
            {neighbors.length === 0 ? (
              <p className="muted">Aucune pétition suffisamment proche n'a été trouvée par le moteur. Cela ne signifie pas que le sujet est isolé : le moteur reste prudent.</p>
            ) : (
              <>
                <p className="source-note">
                  Rapprochements calculés par le moteur ({core.meta.algorithm.version}), classés par type. Deux pétitions proches peuvent défendre des demandes différentes, voire contraires.
                  Leurs soutiens ne s'additionnent pas.
                </p>
                {GROUP_ORDER.filter((type) => groups[type].length > 0).map((type) => (
                  <div key={type} className="neighbors">
                    <h3>{RELATION_LABEL[type]} <span className="muted num">({groups[type].length})</span></h3>
                    <p className="muted neighbors__help">{RELATION_HELP[type]}</p>
                    <ul className="rows rows--tight">
                      {groups[type].slice(0, type === 'thematique' ? 6 : 12).map((n) => {
                        const other = core.byId.get(n.id);
                        if (!other) return null;
                        return (
                          <li className="row row--tight" key={n.id}>
                            <div className="row__meta num"><span>n° {other.id}</span><span>{formatMonth(other.published)}</span></div>
                            <div className="row__body">
                              <h4 className="row__title"><Link to={`/petition/${other.id}`}>{other.title}</Link></h4>
                              <div className="row__tags">
                                <StatusBadge status={other.status} />
                                <span className="row__fact">{shortCommission(other.commission)}</span>
                              </div>
                              <RelationReason relation={n.relation} />
                            </div>
                            <div className="row__actions"><CompareButton id={other.id} title={other.title} compact /></div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>

        <aside className="petition__side" aria-label="Contexte de la pétition">
          <section>
            <h2 className="section-title">Familles thématiques</h2>
            <p className="muted">Catégorisation automatique par vocabulaire — pas une classification officielle.</p>
            <div className="row__themes">
              {petition.themes.length === 0 && <span className="muted">Aucune famille identifiée.</span>}
              {petition.themes.map((tid) => {
                const theme = core.themeById.get(tid);
                return theme ? (
                  <Link key={tid} to={`/recherche?theme=${tid}`} className="chip chip--link">
                    <span className="dot" style={{ background: theme.color }} aria-hidden="true" />
                    {theme.label}
                  </Link>
                ) : null;
              })}
            </div>
          </section>

          {graph && graph.nodes.length > 1 && (
            <section aria-labelledby="carte-voisinage">
              <h2 id="carte-voisinage" className="section-title">Voisinage</h2>
              <ConstellationMap
                core={core}
                graph={graph}
                selectedId={selected}
                onSelect={setSelected}
                label={`Carte du voisinage de la pétition ${petition.id} : ${graph.nodes.length - 1} pétitions reliées. La liste des pétitions proches est donnée en texte dans la section « Pétitions proches ».`}
              />
              <Legend present={present} />
              {selected && selected !== petition.id && <NodePanel core={core} id={selected} from={petition.id} />}
            </section>
          )}

          {dossier && (
            <section aria-labelledby="dossier">
              <h2 id="dossier" className="section-title">Son dossier thématique</h2>
              <p>
                <strong>{dossier.terms.slice(0, 3).join(' · ')}</strong>
                <span className="muted"> — {dossier.size} pétitions regroupées automatiquement, du {dossier.years[0]} au {dossier.years[1]}.</span>
              </p>
              <ul className="plain-list">
                {othersInDossier.slice(0, 6).map((m) => {
                  const other = core.byId.get(m);
                  return other ? <li key={m}><Link to={`/petition/${m}`}>{other.title}</Link></li> : null;
                })}
              </ul>
              <div className="panel__actions">
                <Link className="btn btn--ghost" to={`/constellations/${dossier.id}`}>Voir la constellation</Link>
                <Link className="btn btn--ghost" to={`/recherche?dossier=${dossier.id}`}>Voir en liste</Link>
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
