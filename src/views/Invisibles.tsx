import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Dices } from 'lucide-react';
import { ShareButton } from '../components/Actions';
import { PetitionList, PetitionRow } from '../components/PetitionRow';
import { EmptyState } from '../components/States';
import { surprise } from '../lib/diversify';
import { plural } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import type { Status } from '../lib/types';
import { useCore } from '../state/DataContext';

const PRESETS = [10, 50, 100, 500];
const COUNT = 9;

function dailySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export function Invisibles() {
  const core = useCore();
  const [params, setParams] = useSearchParams();
  useDocumentTitle('Les invisibles');

  const threshold = Math.max(1, Number(params.get('moins')) || 50);
  const seed = Number(params.get('graine')) || dailySeed();
  const theme = params.get('theme') ?? '';
  const status = (params.get('statut') ?? '') as Status | '';

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const pool = useMemo(
    () =>
      core.petitions.filter(
        (p) => p.votes !== null && p.votes < threshold && (!theme || p.themes.includes(theme)) && (!status || p.status === status),
      ),
    [core, threshold, theme, status],
  );
  const picks = useMemo(() => surprise(pool, seed, COUNT), [pool, seed]);
  const withVotes = core.petitions.filter((p) => p.votes !== null).length;
  const underAll = core.petitions.filter((p) => p.votes !== null && p.votes < threshold).length;
  const share = withVotes ? Math.round((underAll / withVotes) * 100) : 0;
  const maxBucket = Math.max(...core.stats.vote_buckets.map((b) => b.count));

  const linkParams = new URLSearchParams({ max: String(threshold - 1), tri: 'hasard', graine: String(seed) });
  if (theme) linkParams.set('theme', theme);
  if (status) linkParams.set('statut', status);

  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow eyebrow--accent">Les invisibles</p>
        <h1>Ce que le classement par popularité laisse de côté</h1>
        <p className="lede">
          Dans le catalogue, {share} % des pétitions comptent moins de {threshold} soutiens. Peu de soutiens ne dit rien de la qualité ni de la justesse d'une proposition :
          ces textes sont simplement restés hors de vue. Les voici, au hasard et sans hiérarchie.
        </p>
      </header>

      <section className="invis-controls" aria-label="Réglages">
        <div className="presets" role="group" aria-label="Seuil de soutiens">
          <span className="field-label">Moins de</span>
          {PRESETS.map((n) => (
            <button key={n} type="button" className={`chip chip--button${threshold === n ? ' is-on' : ''}`} aria-pressed={threshold === n} onClick={() => set({ moins: String(n) })}>
              {n} soutiens
            </button>
          ))}
        </div>
        <label className="range">
          <span className="field-label">Seuil précis : <strong className="num">{threshold}</strong></span>
          <input type="range" min={5} max={1000} step={5} value={Math.min(threshold, 1000)} onChange={(e) => set({ moins: e.target.value })} aria-valuetext={`moins de ${threshold} soutiens`} />
        </label>
        <label className="select-inline">
          <span className="field-label">Famille</span>
          <select value={theme} onChange={(e) => set({ theme: e.target.value })}>
            <option value="">Toutes</option>
            {core.taxonomy.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="select-inline">
          <span className="field-label">Statut</span>
          <select value={status} onChange={(e) => set({ statut: e.target.value })}>
            <option value="">Tous</option>
            <option value="ouverte">Ouvertes</option>
            <option value="archivee">Archivées</option>
            <option value="classee">Classées</option>
          </select>
        </label>
      </section>

      <section aria-labelledby="surprise" className="invis-pick">
        <div className="toolbar">
          <h2 id="surprise" className="section-title">Surprenez-moi</h2>
          <div className="toolbar__tools">
            <button type="button" className="btn btn--primary" onClick={() => set({ graine: String(Math.floor(Math.random() * 99999) + 1) })}>
              <Dices size={16} aria-hidden="true" /> Un autre tirage
            </button>
            <ShareButton path={`/invisibles?${new URLSearchParams({ moins: String(threshold), graine: String(seed), ...(theme ? { theme } : {}), ...(status ? { statut: status } : {}) }).toString()}`} title="Pétitions peu visibles" label="Partager ce tirage" />
          </div>
        </div>
        <p className="source-note">
          Sélection variée parmi {plural(pool.length, 'pétition', 'pétitions')} sous le seuil, en alternant les familles thématiques et en évitant deux pétitions du même dossier. Tirage n° <span className="num">{seed}</span> : le même lien redonne la même sélection.
        </p>
        {picks.length === 0 ? (
          <EmptyState title="Aucune pétition sous ce seuil avec ces critères"><p>Augmentez le seuil ou retirez un filtre.</p></EmptyState>
        ) : (
          <PetitionList label="Sélection de pétitions peu soutenues">
            {picks.map((p) => <PetitionRow key={p.id} petition={p} />)}
          </PetitionList>
        )}
        <p>
          <Link className="btn btn--ghost" to={`/recherche?${linkParams.toString()}`}>
            Parcourir les {pool.length.toLocaleString('fr-FR')} pétitions sous le seuil
          </Link>
        </p>
      </section>

      <section aria-labelledby="repartition" className="invis-chart">
        <h2 id="repartition" className="section-title">Répartition des soutiens dans le catalogue</h2>
        <p className="source-note">Nombre de pétitions par tranche de soutiens, à la date du fichier. Une poignée de pétitions très soutenues concentre l'attention ; la grande majorité est restée discrète.</p>
        <ul className="bars">
          {core.stats.vote_buckets.map((b) => (
            <li key={b.label}>
              <span className="bars__label num">{b.label}</span>
              <span className="bars__track" aria-hidden="true"><span className="bars__fill" style={{ width: `${(b.count / maxBucket) * 100}%` }} /></span>
              <span className="bars__value num">{b.count.toLocaleString('fr-FR')}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
