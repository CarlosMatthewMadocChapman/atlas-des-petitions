import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MiniConstellation } from '../components/ConstellationMap';
import { DossierSignal } from '../components/DossierSignal';
import { PetitionList, PetitionRow } from '../components/PetitionRow';
import { SearchBox } from '../components/SearchBox';
import { surprise } from '../lib/diversify';
import { openMostSigned, rankDossiers } from '../lib/ranking';
import { fileDate, formatDate, plural } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { useCore } from '../state/DataContext';

const EXAMPLES = ['pluralisme des médias', 'réforme des retraites', 'loyers et logement', 'cannabis', 'deserts medicaux', 'jour férié'];

export function Home() {
  const core = useCore();
  const navigate = useNavigate();
  useDocumentTitle('');

  const day = Math.floor(Date.now() / 86_400_000);
  const recent = useMemo(
    () => [...core.petitions].sort((a, b) => (b.published ?? '').localeCompare(a.published ?? '') || Number(b.id) - Number(a.id)).slice(0, 5),
    [core],
  );
  const quiet = useMemo(() => surprise(core.petitions.filter((p) => p.votes !== null && p.votes < 50), day, 5), [core, day]);
  const featured = useMemo(() => rankDossiers(core.dossiers.filter((d) => d.size >= 2), core.byId).slice(0, 6), [core]);
  const mostSigned = useMemo(() => openMostSigned(core.petitions, 8), [core]);
  const hero = featured[0] ?? core.dossiers[0];
  const { counts, source } = core.meta;
  const themes = [...core.taxonomy].sort((a, b) => (core.stats.themes[b.id] ?? 0) - (core.stats.themes[a.id] ?? 0));

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--accent">Atlas civique · expérimentation indépendante</p>
            <h1>Des milliers de propositions citoyennes, enfin reliées.</h1>
            <p className="hero__lede">
              Les pétitions de l'Assemblée nationale existent déjà, dispersées. L'Atlas les rend visibles, comparables et connectées : pour voir qui propose quoi, sur quel sujet, et ce qui reste
              à peine entendu.
            </p>
            <SearchBox value="" large autoFocus={false} onSubmit={(q) => navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')} />
            <p className="hero__examples">
              <span className="muted">Essayez :</span>{' '}
              {EXAMPLES.map((e) => (
                <Link key={e} to={`/recherche?q=${encodeURIComponent(e)}`} className="chip chip--link">{e}</Link>
              ))}
            </p>
            <p className="hero__idea">
              <Link to="/ecrire" className="btn btn--ghost">
                Vous avez une idée de pétition ? Voyez qui y pense déjà <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </p>
            <p className="hero__fresh num">
              <strong>{counts.petitions.toLocaleString('fr-FR')}</strong> pétitions chargées · fichier du {formatDate(fileDate(source))} · {plural(counts.dossiers, 'constellation', 'constellations')}
            </p>
          </div>
          {hero && (
            <figure className="hero__figure">
              <MiniConstellation core={core} dossierId={hero.id} size={460} />
              <figcaption>
                Un vrai dossier du catalogue : <Link to={`/constellations/${hero.id}`}>{hero.terms.slice(0, 3).join(' · ')}</Link> — {plural(hero.size, 'pétition', 'pétitions')}, reliées par ce que leurs textes ont en commun.
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      <div className="container home">
        <section aria-labelledby="signees" className="home__section">
          <div className="home__head">
            <h2 id="signees" className="section-title">Les plus signées, encore ouvertes</h2>
            <Link to="/recherche" className="more">Toutes les pétitions <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <p className="muted">Ce qu'on peut encore signer, par nombre de signatures.</p>
          <PetitionList label="Pétitions les plus signées encore ouvertes">
            {mostSigned.map((p) => <PetitionRow key={p.id} petition={p} showExcerpt={false} />)}
          </PetitionList>
        </section>

        <section aria-labelledby="sujets" className="home__section">
          <div className="home__head">
            <h2 id="sujets" className="section-title">Sujets à explorer</h2>
            <p className="muted">Familles thématiques calculées automatiquement. Une pétition peut en avoir plusieurs.</p>
          </div>
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

        <section aria-labelledby="constel" className="home__section">
          <div className="home__head">
            <h2 id="constel" className="section-title">Constellations</h2>
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

        <div className="home__duo">
          <section aria-labelledby="recentes" className="home__section">
            <div className="home__head">
              <h2 id="recentes" className="section-title">Déposées récemment</h2>
              <Link to="/recherche" className="more">Tout explorer <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <PetitionList label="Pétitions récentes">
              {recent.map((p) => <PetitionRow key={p.id} petition={p} showExcerpt={false} />)}
            </PetitionList>
          </section>
          <section aria-labelledby="peu" className="home__section">
            <div className="home__head">
              <h2 id="peu" className="section-title">À peine vues</h2>
              <Link to="/invisibles" className="more">Les invisibles <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <p className="muted">Un tirage du jour parmi les pétitions de moins de 50 soutiens. Peu de soutiens ne dit rien de la qualité.</p>
            <PetitionList label="Pétitions peu soutenues">
              {quiet.map((p) => <PetitionRow key={p.id} petition={p} showExcerpt={false} />)}
            </PetitionList>
          </section>
        </div>

        <section aria-labelledby="vues" className="home__section home__views">
          <h2 id="vues" className="visually-hidden">Les vues de l'Atlas</h2>
          <Link to="/ecrire" className="view-link"><strong>Votre idée</strong><span>Écrivez votre pétition : voyez celles qui existent déjà et la constellation que vous rejoignez.</span></Link>
          <Link to="/constellations" className="view-link"><strong>Constellations</strong><span>Cartes interactives des sujets et de leurs pétitions.</span></Link>
          <Link to="/comparer" className="view-link"><strong>Comparer</strong><span>Jusqu'à quatre pétitions côte à côte, passages communs surlignés.</span></Link>
          <Link to="/invisibles" className="view-link"><strong>Les invisibles</strong><span>Redécouvrir ce que la popularité laisse de côté.</span></Link>
          <Link to="/methode" className="view-link"><strong>Méthode et données</strong><span>D'où viennent les chiffres, comment on rapproche, ce qui peut se tromper.</span></Link>
        </section>
      </div>
    </>
  );
}
