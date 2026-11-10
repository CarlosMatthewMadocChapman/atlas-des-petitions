import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MiniConstellation } from '../components/ConstellationMap';
import { DossierSignal } from '../components/DossierSignal';
import { PetitionList, PetitionRow } from '../components/PetitionRow';
import { SearchBox } from '../components/SearchBox';
import { officialUrl } from '../lib/data';
import { surprise } from '../lib/diversify';
import { fileDate, formatDate, formatNumber, plural } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { openMostSigned, rankDossiers } from '../lib/ranking';
import { concentration, duels, lastWeek } from '../lib/synthesis';
import { useCore } from '../state/DataContext';

const EXAMPLES = ['CNews', 'loi Duplomb', 'Gaza', 'destitution', 'armes mutilantes', 'chasse à courre', 'Nutri-Score'];

export function Home() {
  const core = useCore();
  const navigate = useNavigate();
  useDocumentTitle('');

  const day = Math.floor(Date.now() / 86_400_000);
  const quiet = useMemo(() => surprise(core.petitions.filter((p) => p.votes !== null && p.votes < 50), day, 3), [core, day]);
  const featured = useMemo(() => rankDossiers(core.dossiers.filter((d) => d.size >= 2), core.byId).slice(0, 6), [core]);
  const mostSigned = useMemo(() => openMostSigned(core.petitions, 7), [core]);
  const opposed = useMemo(() => duels(core), [core]);
  const week = useMemo(() => lastWeek(core), [core]);
  const { total, share } = useMemo(() => concentration(core), [core]);
  const { counts, source } = core.meta;
  const openCount = core.stats.status.ouverte ?? 0;
  const highest = mostSigned[0]?.votes ?? 1;
  const themes = [...core.taxonomy].sort((a, b) => (core.stats.themes[b.id] ?? 0) - (core.stats.themes[a.id] ?? 0));

  return (
    <>
      <section className="lead container" aria-labelledby="lead-titre">
        <p className="eyebrow eyebrow--accent">Pétitions de l'Assemblée nationale · fichier du {formatDate(fileDate(source))}</p>
        <h1 id="lead-titre">{(total / 1_000_000).toFixed(1).replace('.', ',')} millions de signatures. Voici ce qu'elles demandent.</h1>
        <p className="lead__text">
          Sur {formatNumber(counts.petitions)} pétitions, <strong>cinquante portent {Math.round(share * 100)} % des signatures</strong>. Multiplier les pétitions n'agrandit rien.
        </p>
        <SearchBox value="" large autoFocus={false} onSubmit={(q) => navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')} />
        <p className="hero__examples">
          <span className="muted">Essayez :</span>{' '}
          {EXAMPLES.map((e) => (
            <Link key={e} to={`/recherche?q=${encodeURIComponent(e)}`} className="chip chip--link">{e}</Link>
          ))}
        </p>
      </section>

      <div className="container home">
        <section aria-labelledby="signees" className="home__section">
          <div className="home__head">
            <h2 id="signees" className="section-title">Encore à signer</h2>
            <Link to="/recherche" className="more">Les {formatNumber(openCount)} pétitions ouvertes <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <ol className="signed">
            {mostSigned.map((p) => (
              <li key={p.id} className="signed__row">
                <div className="signed__body">
                  <Link to={`/petition/${p.id}`} className="signed__title">{p.title}</Link>
                  <div className="signed__track" aria-hidden="true">
                    <div className="signed__bar" style={{ width: `${(((p.votes ?? 0) / highest) * 100).toFixed(2)}%` }} />
                  </div>
                </div>
                <span className="signed__votes num">{formatNumber(p.votes)}</span>
                <a className="btn btn--primary" href={officialUrl(p, core.meta)} target="_blank" rel="noopener noreferrer">Signer</a>
              </li>
            ))}
          </ol>
        </section>

        {opposed.length > 0 && (
          <section aria-labelledby="face" className="home__section">
            <div className="home__head">
              <h2 id="face" className="section-title">Face à face</h2>
              <p className="muted">Même sujet, demandes opposées : la plus signée de chaque côté.</p>
            </div>
            <div className="duels">
              {opposed.map((d) => (
                <article key={d.subject} className="duel">
                  <header className="duel__head">
                    <h3>{d.subject}</h3>
                    <span className="duel__ratio num">× {formatNumber(d.ratio)}</span>
                  </header>
                  <p className="duel__label"><Link to={`/petition/${d.a.id}`}>{d.aLabel}</Link></p>
                  <div className="duel__bar duel__bar--a" aria-hidden="true" />
                  <p className="duel__votes num">{formatNumber(d.a.votes)}</p>
                  <p className="duel__label"><Link to={`/petition/${d.b.id}`}>{d.bLabel}</Link></p>
                  <div className="duel__bar" aria-hidden="true" style={{ width: `max(3px, ${(d.share * 100).toFixed(2)}%)` }} />
                  <p className="duel__votes num">{formatNumber(d.b.votes)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="semaine" className="home__section week">
          <div>
            <h2 id="semaine" className="section-title">Cette semaine</h2>
            <p className="week__big"><strong className="num">{formatNumber(week.count)}</strong> {week.count > 1 ? 'nouvelles pétitions' : 'nouvelle pétition'} depuis le {formatDate(week.from)}.</p>
          </div>
          {week.rising && (
            <div>
              <p className="eyebrow">Ce qui décolle</p>
              <h3 className="week__title"><Link to={`/petition/${week.rising.id}`}>{week.rising.title}</Link></h3>
              <p className="muted"><strong className="num">{formatNumber(week.rising.votes)}</strong> signatures, publiée le {formatDate(week.rising.published)}.</p>
            </div>
          )}
          {week.wave && (
            <div>
              <p className="eyebrow">Vague de dépôts</p>
              <h3 className="week__title"><Link to={`/constellations/${week.wave.dossier.id}`}>{week.wave.wave.count} pétitions en {week.wave.wave.days} jours : {week.wave.dossier.terms.slice(0, 2).join(', ')}</Link></h3>
              <p className="muted">La moitié d'entre elles ont moins de <strong className="num">{formatNumber(week.wave.wave.medianVotes)}</strong> signatures.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="constel" className="home__section">
          <div className="home__head">
            <h2 id="constel" className="section-title">Les grands sujets</h2>
            <Link to="/constellations" className="more">Toutes les constellations <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <ul className="dossiers dossiers--home">
            {featured.map((d) => (
              <li key={d.id} className="dossier-row">
                <Link to={`/constellations/${d.id}`} className="dossier-row__map" aria-hidden="true" tabIndex={-1}>
                  <MiniConstellation core={core} dossierId={d.id} size={112} />
                </Link>
                <div className="dossier-row__body">
                  <h3 className="dossier-row__title"><Link to={`/constellations/${d.id}`}>{d.terms.slice(0, 3).join(' · ')}</Link></h3>
                  <DossierSignal dossier={d} />
                  <p className="dossier-row__stats num muted">{plural(d.size, 'pétition', 'pétitions')} · {d.years[0]}–{d.years[1]}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sujets" className="home__section">
          <h2 id="sujets" className="section-title">Par famille</h2>
          <ul className="topics">
            {themes.map((t) => (
              <li key={t.id}>
                <Link to={`/recherche?theme=${t.id}`} className="topic">
                  <span className="dot dot--lg" style={{ background: t.color }} aria-hidden="true" />
                  <span className="topic__label">{t.label}</span>
                  <span className="topic__count num">{(core.stats.themes[t.id] ?? 0).toLocaleString('fr-FR')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="peu" className="home__section">
          <div className="home__head">
            <h2 id="peu" className="section-title">À peine vues</h2>
            <Link to="/invisibles" className="more">Les invisibles <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <PetitionList label="Pétitions peu soutenues">
            {quiet.map((p) => <PetitionRow key={p.id} petition={p} showExcerpt={false} />)}
          </PetitionList>
        </section>

        <section className="home__section idea">
          <h2 className="section-title">Vous avez une idée ? Quelqu'un la défend peut-être déjà.</h2>
          <Link to="/ecrire" className="btn btn--primary">Voir qui pense comme moi <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>
    </>
  );
}
