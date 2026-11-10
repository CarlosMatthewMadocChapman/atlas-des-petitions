import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { fileDate, formatDate } from '../lib/format';
import { useCoreState } from '../state/DataContext';
import { useCompare, useFavorites } from '../state/store';

export function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="L'Atlas des pétitions — accueil">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.3" fill="none">
          <path d="M6 24 L15 9 L27 14 L21 27 Z" />
          <path d="M15 9 L21 27" />
        </g>
        <circle cx="6" cy="24" r="2.6" fill="currentColor" />
        <circle cx="15" cy="9" r="2.6" fill="var(--accent)" />
        <circle cx="27" cy="14" r="2.6" fill="currentColor" />
        <circle cx="21" cy="27" r="2.6" fill="currentColor" />
      </svg>
      <span>
        L'Atlas <em>des pétitions</em>
      </span>
    </Link>
  );
}

function SiteNav() {
  const compare = useCompare();
  const favorites = useFavorites();
  return (
    <nav className="nav" aria-label="Navigation principale">
      <NavLink to="/recherche">Explorer</NavLink>
      <NavLink to="/ecrire">Votre idée</NavLink>
      <NavLink to="/constellations">Constellations</NavLink>
      <NavLink to="/comparer">
        Comparer{compare.ids.length > 0 && <span className="nav__count num">{compare.ids.length}</span>}
      </NavLink>
      <NavLink to="/invisibles">Les invisibles</NavLink>
      <NavLink to="/favoris">
        Favoris{favorites.ids.length > 0 && <span className="nav__count num">{favorites.ids.length}</span>}
      </NavLink>
      <NavLink to="/methode">Méthode et données</NavLink>
    </nav>
  );
}

function RouteEffects() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

function Footer() {
  const state = useCoreState();
  const meta = state.status === 'ready' ? state.core.meta : null;
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Wordmark />
          <p className="footer__lede">
            Expérimentation indépendante, <strong>sans affiliation institutionnelle</strong> avec l'Assemblée nationale. On ne peut pas signer ici :
            chaque fiche renvoie vers la pétition officielle.
          </p>
          <p className="footer__lede">Créé par <strong>Carlos Chapman</strong> dans le cadre de{' '}
            <a href="https://radiodufutur.com/">Radio du Futur</a>, un espace de musiques, de récits et d'expérimentations citoyennes.
          </p>
          <p className="footer__lede"><a href="https://radiodufutur.com/projets/">Explorer les projets de Radio du Futur ↗</a></p>
        </div>
        <div>
          <h2 className="eyebrow">Données</h2>
          <p>
            Pétitions de l'Assemblée nationale, via{' '}
            <a href={meta?.dataset_page ?? 'https://www.data.gouv.fr/datasets/petitions-de-lassemblee-nationale'} target="_blank" rel="noopener noreferrer">
              data.gouv.fr
            </a>
            , sous{' '}
            <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/" target="_blank" rel="noopener noreferrer">
              Licence Ouverte 2.0
            </a>
            .
          </p>
          {meta && (
            <p className="muted">
              Fichier du {formatDate(fileDate(meta.source))} · {meta.counts.petitions.toLocaleString('fr-FR')} pétitions · moteur {meta.algorithm.version}
            </p>
          )}
        </div>
        <div>
          <h2 className="eyebrow">Repères</h2>
          <ul className="footer__links">
            <li><Link to="/methode">Méthode et données</Link></li>
            <li><Link to="/methode#signaler">Signaler une erreur</Link></li>
            <li><a href="https://suiteadonner.nucom.fr/" target="_blank" rel="noopener noreferrer">Suite à donner — suivi des pétitions</a></li>
            <li><a href="https://radiodufutur.com/participer/">Participer à Radio du Futur ↗</a></li>
            <li><Link to="/favoris">Vos favoris (stockés sur cet appareil)</Link></li>
          </ul>
          <p className="muted">Aucun compte, aucun suivi publicitaire, aucun cookie de mesure.</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#contenu" onClick={(e) => { e.preventDefault(); document.getElementById('contenu')?.focus(); }}>
        Aller au contenu
      </a>
      <header className="header">
        <div className="container header__bar">
          <div className="header__identity">
            <Wordmark />
            <a className="header__origin" href="https://radiodufutur.com/" aria-label="Découvrir Radio du Futur, le site à l'origine de l'Atlas">Un projet de Radio du Futur ↗</a>
          </div>
          <SiteNav />
        </div>
      </header>
      <main id="contenu" tabIndex={-1} className="main">
        <Outlet />
      </main>
      <Footer />
      <RouteEffects />
    </>
  );
}
