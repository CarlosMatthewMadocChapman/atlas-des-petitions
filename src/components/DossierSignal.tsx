import { Link } from 'react-router-dom';
import { formatDate, formatNumber } from '../lib/format';
import { depositWave, topOfDossier } from '../lib/ranking';
import type { Dossier } from '../lib/types';
import { useCore } from '../state/DataContext';

/** Ce qui pèse dans une constellation : sa pétition la plus signée, et une éventuelle vague de dépôts. */
export function DossierSignal({ dossier }: { dossier: Dossier }) {
  const core = useCore();
  const top = topOfDossier(dossier, core.byId);
  const wave = depositWave(dossier, core.byId);
  if (!top) return null;
  return (
    <>
      <p className="dossier-signal">
        <span className="muted">La plus signée : </span>
        <Link to={`/petition/${top.id}`}>{top.title}</Link>
        {top.votes !== null && <strong className="num"> — {formatNumber(top.votes)}</strong>}
      </p>
      {wave && (
        <p className="dossier-signal dossier-signal--wave">
          Vague de dépôts : {wave.count} pétitions en {wave.days} jours, du {formatDate(wave.from)} au {formatDate(wave.to)}.
          {' '}La moitié d'entre elles ont moins de <span className="num">{formatNumber(wave.medianVotes)}</span> signatures.
        </p>
      )}
    </>
  );
}
