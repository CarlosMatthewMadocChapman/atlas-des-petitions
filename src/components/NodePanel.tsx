import { Link } from 'react-router-dom';
import type { Core } from '../lib/data';
import { RELATION_HELP, RELATION_LABEL, formatMonth, formatVotes } from '../lib/format';
import type { Relation } from '../lib/types';
import { CompareButton, FavoriteButton } from './Actions';
import { RelationBadge, StatusBadge } from './Badges';

export function RelationReason({ relation, showScore = true }: { relation: Relation; showScore?: boolean }) {
  return (
    <div className="reason">
      <RelationBadge type={relation.type} />
      {relation.terms.length > 0 && (
        <p>
          <span className="muted">Mots et expressions en commun : </span>
          {relation.terms.map((t) => `« ${t} »`).join(', ')}
        </p>
      )}
      {relation.cues.length > 0 && (
        <p>
          <span className="muted">Indices de divergence : </span>
          {relation.cues.map((t) => `« ${t} »`).join(' / ')}. Une piste de comparaison, pas un verdict.
        </p>
      )}
      {relation.origin === 'semantique' && (
        <p>
          <span className="muted">Rapprochement par le sens : </span>
          un modèle de langue juge ces deux textes très proches, et leur vocabulaire se recoupe. Une piste à lire, pas un verdict.
        </p>
      )}
      {relation.human && (
        <p className="muted">
          Relation {relation.human} par une relecture humaine{relation.note ? ` — ${relation.note}` : ''}.
        </p>
      )}
      {showScore && relation.score > 0 && (
        <details className="reason__tech">
          <summary>Indice technique</summary>
          <p>
            Proximité de texte calculée : <span className="num">{relation.score.toFixed(2)}</span>
            {relation.sem ? <>, proximité de sens : <span className="num">{relation.sem.toFixed(2)}</span></> : null}. Ces indices servent uniquement à classer des résultats ; ils ne mesurent ni la valeur ni l'orientation
            d'une pétition.
          </p>
          <p className="muted">{RELATION_HELP[relation.type]}</p>
        </details>
      )}
    </div>
  );
}

interface Props {
  core: Core;
  id: string;
  from?: string;
}

/** Panneau de détail d'une pétition sélectionnée dans une carte. */
export function NodePanel({ core, id, from }: Props) {
  const petition = core.byId.get(id);
  if (!petition) return null;
  const relation = from ? core.adjacency.get(from)?.find((n) => n.id === id)?.relation : undefined;
  return (
    <section className="panel" aria-label={`Pétition sélectionnée : ${petition.title}`}>
      <p className="eyebrow num">n° {petition.id} · {formatMonth(petition.published)}</p>
      <h3>
        <Link to={`/petition/${petition.id}`}>{petition.title}</Link>
      </h3>
      <p className="panel__excerpt">{petition.excerpt}</p>
      <div className="row__tags">
        <StatusBadge status={petition.status} />
        <span className="row__fact num">{formatVotes(petition.votes)}</span>
      </div>
      {relation && (
        <div className="panel__relation">
          <p className="eyebrow">{RELATION_LABEL[relation.type]}</p>
          <RelationReason relation={relation} />
        </div>
      )}
      <div className="panel__actions">
        <Link className="btn btn--primary" to={`/petition/${petition.id}`}>Ouvrir la fiche</Link>
        <FavoriteButton id={petition.id} title={petition.title} compact />
        <CompareButton id={petition.id} title={petition.title} compact />
      </div>
    </section>
  );
}
