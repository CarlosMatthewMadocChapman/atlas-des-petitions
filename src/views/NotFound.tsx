import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';
import { useDocumentTitle } from '../lib/hooks';

export function NotFound() {
  useDocumentTitle('Page introuvable');
  return (
    <div className="container page">
      <EmptyState title="Cette page n'existe pas" action={<Link className="btn btn--primary" to="/">Retour à l'accueil</Link>}>
        <p>L'adresse a peut-être été mal recopiée. Vous pouvez explorer le catalogue ou lire la méthode.</p>
        <p><Link to="/recherche">Explorer</Link> · <Link to="/methode">Méthode et données</Link></p>
      </EmptyState>
    </div>
  );
}
