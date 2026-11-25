import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Dices } from 'lucide-react';
import { PetitionList, PetitionRow } from '../components/PetitionRow';
import { chamber, overviewHref } from '../lib/chamber';
import { surprise } from '../lib/diversify';
import { formatNumber, plural } from '../lib/format';
import { gatherings, rallied, scattered, singular, type Gathering } from '../lib/gathering';
import { useDocumentTitle } from '../lib/hooks';
import { useCore } from '../state/DataContext';

function dailySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function GatheringCard({ g, tone }: { g: Gathering; tone: 'scattered' | 'rallied' }) {
  const label = g.dossier.label || g.dossier.terms.slice(0, 3).join(' · ');
  const others = g.members.length - 1;
  return (
    <article className={`gather gather--${tone}`}>
      <header className="gather__head">
        <h3 className="gather__title"><Link to={`/constellations/${g.dossier.id}`}>{label}</Link></h3>
        <p className="gather__facts">
          <strong className="num">{g.members.length}</strong> pétitions sur ce sujet · la plus signée : <strong className="num">{formatNumber(g.top.votes ?? 0)}</strong>
          {tone === 'scattered' && g.under100 > 0 && <> · <span className="num">{g.under100}</span> sous 100 signatures</>}
        </p>
      </header>
      {tone === 'scattered' ? (
        <p className="gather__note">Aucune ne réunit la moitié des soutiens du groupe : la même demande avance en {others + 1} morceaux.</p>
      ) : (
        <p className="gather__note">Les soutiens se sont concentrés : {plural(others, 'autre pétition', 'autres pétitions')} sur le même sujet, une seule qui porte.</p>
      )}
      {g.join ? (
        <div className="gather__join">
          <p className="eyebrow">{g.join.id === g.top.id ? 'À rejoindre' : 'Encore ouverte, à rejoindre'}</p>
          <PetitionList label={`Pétition à rejoindre : ${label}`}>
            <PetitionRow petition={g.join} showExcerpt={false} />
          </PetitionList>
        </div>
      ) : (
        <p className="muted">Toutes les pétitions de ce groupe sont closes.</p>
      )}
    </article>
  );
}

export function Invisibles() {
  const core = useCore();
  const [params, setParams] = useSearchParams();
  useDocumentTitle('Rejoindre plutôt que disperser');
  const seed = Number(params.get('graine')) || dailySeed();

  const all = useMemo(() => gatherings(core), [core]);
  const spread = useMemo(() => scattered(all), [all]);
  const gathered = useMemo(() => rallied(all), [all]);
  const lonely = useMemo(() => singular(core), [core]);
  const picks = useMemo(() => surprise(lonely, seed, 6), [lonely, seed]);

  const measured = core.petitions.filter((p) => p.votes !== null && (p.votes > 0 || chamber.id !== 'europe'));
  const under100 = measured.filter((p) => (p.votes ?? 0) < 100).length;
  const share = measured.length ? Math.round((under100 / measured.length) * 100) : 0;
  const grouped = all.reduce((s, g) => s + g.members.length, 0);

  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow eyebrow--accent">Rejoindre plutôt que disperser</p>
        <h1>Une demande pèse quand elle se rassemble</h1>
        <p className="lede">
          Ici, {share} % des pétitions comptent moins de 100 signatures. Bien souvent, ce n'est pas que personne ne partage l'idée : la même demande a été déposée
          plusieurs fois, et ses soutiens se répartissent entre des textes voisins. Avant de lancer une pétition, cherchez celle qui la porte déjà.
        </p>
        <p className="gather__cta">
          <Link className="btn btn--primary" to="/ecrire">Décrire mon idée et trouver les pétitions proches <ArrowRight size={16} aria-hidden="true" /></Link>
          <a className="btn btn--ghost" href={overviewHref}>Comparer les trois portes</a>
        </p>
      </header>

      {spread.length > 0 && (
        <section aria-labelledby="eparpillees" className="gather-section">
          <h2 id="eparpillees" className="section-title">Des demandes éparpillées</h2>
          <p className="source-note">
            Groupes de pétitions proches (constellations) où aucune ne réunit la moitié des soutiens du groupe. {formatNumber(grouped)} pétitions appartiennent à un groupe de quatre ou plus.
            Les signatures de pétitions différentes ne sont jamais additionnées : une même personne a pu en signer plusieurs.
          </p>
          <div className="gather-grid">
            {spread.map((g) => <GatheringCard key={g.dossier.id} g={g} tone="scattered" />)}
          </div>
        </section>
      )}

      {gathered.length > 0 && (
        <section aria-labelledby="rassemblees" className="gather-section">
          <h2 id="rassemblees" className="section-title">Des demandes rassemblées</h2>
          <p className="source-note">À l'inverse, sur ces sujets, une pétition a fédéré l'essentiel des soutiens : c'est elle qui franchit les seuils.</p>
          <div className="gather-grid">
            {gathered.map((g) => <GatheringCard key={g.dossier.id} g={g} tone="rallied" />)}
          </div>
        </section>
      )}

      <section aria-labelledby="singulieres" className="gather-section">
        <div className="toolbar">
          <h2 id="singulieres" className="section-title">Des idées singulières</h2>
          <div className="toolbar__tools">
            <button type="button" className="btn btn--ghost" onClick={() => setParams({ graine: String(Math.floor(Math.random() * 99999) + 1) }, { replace: true })}>
              <Dices size={16} aria-hidden="true" /> Un autre tirage
            </button>
          </div>
        </div>
        <p className="source-note">
          Peu de soutiens, et aucune pétition proche : ces textes ne doublonnent rien. {plural(lonely.length, 'pétition', 'pétitions')} dans ce cas ; en voici quelques-unes, au hasard.
        </p>
        <PetitionList label="Idées singulières encore peu connues">
          {picks.map((p) => <PetitionRow key={p.id} petition={p} />)}
        </PetitionList>
      </section>
    </div>
  );
}
