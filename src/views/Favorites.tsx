import { Download, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PetitionList, PetitionRow } from '../components/PetitionRow';
import { EmptyState } from '../components/States';
import { download, toCsv, toJson } from '../lib/exporter';
import { EMPTY_FILTERS } from '../lib/filters';
import { plural } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import type { Petition } from '../lib/types';
import { useCore } from '../state/DataContext';
import { useFavorites } from '../state/store';

export function FavoritesView() {
  const core = useCore();
  const { ids, clear } = useFavorites();
  useDocumentTitle('Favoris');
  const items = ids.map((id) => core.byId.get(id)).filter((p): p is Petition => Boolean(p));
  const missing = ids.length - items.length;

  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">Favoris</p>
        <h1>Vos pétitions mises de côté</h1>
        <p className="lede">Cette liste est conservée uniquement sur cet appareil, dans votre navigateur. Aucun compte, aucune donnée envoyée.</p>
      </header>
      {items.length === 0 ? (
        <EmptyState title="Aucun favori pour l'instant" action={<Link className="btn btn--primary" to="/recherche">Explorer le catalogue</Link>}>
          <p>Utilisez l'étoile d'une fiche ou d'un résultat pour la retrouver ici.</p>
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <h2 className="toolbar__count" aria-live="polite">{plural(items.length, 'favori', 'favoris')}</h2>
            <div className="toolbar__tools">
              <button type="button" className="btn btn--ghost" onClick={() => download('atlas-favoris.csv', toCsv(items, core.meta), 'text/csv')}><Download size={16} aria-hidden="true" /> CSV</button>
              <button type="button" className="btn btn--ghost" onClick={() => download('atlas-favoris.json', toJson(items, core.meta, EMPTY_FILTERS), 'application/json')}><Download size={16} aria-hidden="true" /> JSON</button>
              <button type="button" className="btn btn--ghost" onClick={() => { if (window.confirm('Retirer tous les favoris de cet appareil ?')) clear(); }}><Trash2 size={16} aria-hidden="true" /> Tout retirer</button>
            </div>
          </div>
          {missing > 0 && <p className="note">{plural(missing, 'favori n\'est', 'favoris ne sont')} plus dans le catalogue actuel.</p>}
          <PetitionList label="Favoris">
            {items.map((p) => <PetitionRow key={p.id} petition={p} />)}
          </PetitionList>
        </>
      )}
    </div>
  );
}
