import { useEffect, useState } from 'react';
import { chamber } from '../lib/chamber';
import { formatDate, formatNumber } from '../lib/format';
import { chartGeometry, loadReadings, weeklyGain, type Reading } from '../lib/history';
import { useCore } from '../state/DataContext';

const W = 640;
const H = 220;

/** L'évolution des signatures d'une pétition, relevé après relevé. */
export function SignatureChart({ id, published }: { id: string; published: string | null }) {
  const core = useCore();
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const history = core.meta.history;

  useEffect(() => {
    let cancelled = false;
    setReadings(null);
    loadReadings(id, core.meta.detail_shard).then((r) => !cancelled && setReadings(r));
    return () => {
      cancelled = true;
    };
  }, [id, core.meta.detail_shard]);

  if (!history) return null;
  if (readings === null) return <p className="muted">Chargement de l'historique…</p>;
  if (readings.length < 2) {
    return (
      <p className="muted">
        Pas encore assez de relevés pour une courbe. L'Atlas suit les pétitions à partir de {formatNumber(history.min_votes)} signatures.
      </p>
    );
  }

  const g = chartGeometry(readings, W, H, undefined, chamber.thresholds);
  const gain = weeklyGain(readings);
  const first = readings[0];
  const last = readings[readings.length - 1];
  const before = published && published < history.first && first.date === history.first;

  return (
    <figure className="signature-chart">
      <p className="signature-chart__summary">
        {gain && gain.gain > 0 ? (
          <><strong className="num">+{formatNumber(gain.gain)}</strong> signatures depuis le {formatDate(gain.since)}</>
        ) : gain ? (
          <>Stable depuis le {formatDate(gain.since)}</>
        ) : null}
        <span className="muted"> · dernier relevé le {formatDate(last.date)}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Signatures de ${formatNumber(first.votes)} le ${formatDate(first.date)} à ${formatNumber(last.votes)} le ${formatDate(last.date)}.`}>
        {g.thresholds.map((t) => (
          <g key={t.value} className="signature-chart__threshold">
            <line x1="8" x2={W - 8} y1={t.y} y2={t.y} />
            <text x={W - 10} y={t.y - 5} textAnchor="end">{t.label}</text>
          </g>
        ))}
        {g.ticks.map((t) => (
          <text key={t.label} x={t.x} y={H - 6} className="signature-chart__tick" textAnchor="middle">{t.label}</text>
        ))}
        {g.segments.map((s, i) => (
          <polyline key={i} className="signature-chart__line" points={s.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
        ))}
        {(() => {
          const end = g.points[g.points.length - 1];
          return <text x={Math.min(end.x, W - 10)} y={Math.max(end.y - 9, 12)} textAnchor="end" className="signature-chart__value">{formatNumber(end.reading.votes)}</text>;
        })()}
        {g.points.map((p) => (
          <circle key={p.reading.date} cx={p.x} cy={p.y} r={p.reading.source === 'site officiel' ? 3 : 2.2} className={p.reading.source === 'site officiel' ? 'signature-chart__point signature-chart__point--site' : 'signature-chart__point'} />
        ))}
      </svg>
      <figcaption className="muted">
        Relevés hebdomadaires publiés par data.gouv.fr{readings.some((r) => r.source === 'site officiel') ? ', et relevés de l\'Atlas sur le site officiel (ronds creux)' : ''}. Rien n'est tracé
        entre deux relevés espacés de plus de quinze jours.{before ? ` Aucun relevé public avant le ${formatDate(history.first)} : la pétition, déposée le ${formatDate(published)}, avait alors déjà ${formatNumber(first.votes)} signatures.` : ''}
      </figcaption>
      <details className="signature-chart__table">
        <summary>Les relevés en tableau</summary>
        <table>
          <thead><tr><th scope="col">Date</th><th scope="col">Signatures</th><th scope="col">Source</th></tr></thead>
          <tbody>
            {[...readings].reverse().map((r) => (
              <tr key={r.date}><td>{formatDate(r.date)}</td><td className="num">{formatNumber(r.votes)}</td><td>{r.source}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
