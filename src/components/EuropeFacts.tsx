import { useEffect, useState } from 'react';
import { fetchJson } from '../lib/data';
import { formatDate, formatNumber } from '../lib/format';

/** Ce que le registre de l'ICE donne en plus du catalogue commun (pipeline/atlas_pipeline/eci.py). */
export interface EuropeExtra {
  regnum: string | null;
  language: string | null;
  collection_start: string | null;
  countries: [string, number][];
  answer: { date: string | null; url: string | null } | null;
  treaties: string | null;
}

let cache: Promise<Record<string, EuropeExtra>> | null = null;
export function loadEuropeExtra(): Promise<Record<string, EuropeExtra>> {
  cache ??= (fetchJson('extra.json') as Promise<Record<string, EuropeExtra>>).catch(() => ({}));
  return cache;
}

export function useEuropeExtra(id: string): EuropeExtra | null {
  const [extra, setExtra] = useState<EuropeExtra | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    loadEuropeExtra().then((all) => !cancelled && setExtra(all[id] ?? null));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return extra;
}

const REGION = (() => {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' });
  } catch {
    return null;
  }
})();
const LANGUAGE = (() => {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'language' });
  } catch {
    return null;
  }
})();

/** Code du registre (« EL » pour la Grèce) → nom du pays en français. */
export function countryName(code: string): string {
  const iso = code === 'EL' ? 'GR' : code === 'UK' ? 'GB' : code;
  return REGION?.of(iso) ?? code;
}

export function languageName(code: string): string {
  return LANGUAGE?.of(code.toLowerCase()) ?? code;
}

/** Signatures pays par pays et réponse de la Commission, pour une initiative citoyenne européenne. */
export function EuropeFacts({ extra }: { extra: EuropeExtra }) {
  const total = extra.countries.reduce((sum, [, n]) => sum + n, 0);
  const france = extra.countries.find(([c]) => c === 'FR');
  return (
    <section aria-labelledby="europe" className="europe-facts">
      <h2 id="europe" className="section-title">À l'échelle européenne</h2>
      {extra.answer && (
        <p>
          <strong>Réponse de la Commission</strong>{extra.answer.date ? ` le ${formatDate(extra.answer.date)}` : ''}
          {extra.answer.url && <> : <a href={extra.answer.url} target="_blank" rel="noopener noreferrer">lire la communication officielle</a></>}.
        </p>
      )}
      {extra.treaties && <p className="muted">Base juridique invoquée : {extra.treaties}.</p>}
      {extra.countries.length > 0 ? (
        <>
          <p>
            {formatNumber(total)} signatures validées dans {extra.countries.length} pays
            {france ? <>, dont <strong className="num">{formatNumber(france[1])}</strong> en France</> : ''}.
          </p>
          <details className="europe-facts__countries">
            <summary>Les signatures pays par pays</summary>
            <table>
              <thead><tr><th scope="col">Pays</th><th scope="col">Signatures</th></tr></thead>
              <tbody>
                {extra.countries.map(([code, n]) => (
                  <tr key={code}><td>{countryName(code)}</td><td className="num">{formatNumber(n)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="muted">Le registre ne publie la répartition par pays qu'après la vérification des signatures.</p>
      )}
    </section>
  );
}
