import { Link } from 'react-router-dom';
import { shortCommission, formatMonth, formatVotes } from '../lib/format';
import { fold, stem } from '../lib/text';
import { highlightParts, type SearchHit } from '../lib/search';
import type { Petition } from '../lib/types';
import { useCore } from '../state/DataContext';
import { CompareButton, FavoriteButton } from './Actions';
import { StatusBadge, ThemeChip } from './Badges';

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  return (
    <>
      {highlightParts(text, terms, stem, fold).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : part.text))}
    </>
  );
}

interface Props {
  petition: Petition;
  hit?: SearchHit;
  terms?: string[];
  onTheme?: (themeId: string) => void;
  showExcerpt?: boolean;
}

export function PetitionRow({ petition, hit, terms = [], onTheme, showExcerpt = true }: Props) {
  const core = useCore();
  const via = hit?.via ? core.byId.get(hit.via) : undefined;
  return (
    <li className="row">
      <div className="row__meta num">
        <span>n° {petition.id}</span>
        <span>{formatMonth(petition.published)}</span>
      </div>
      <div className="row__body">
        {hit?.kind === 'voisine' && via && (
          <p className="row__via">
            Rapprochée de « <Link to={`/petition/${via.id}`}>{via.title}</Link> »
          </p>
        )}
        {hit?.kind === 'elargie' && <p className="row__via">Terme voisin ou partiel de la recherche</p>}
        <h3 className="row__title">
          <Link to={`/petition/${petition.id}`}>
            <Highlighted text={petition.title} terms={terms} />
          </Link>
        </h3>
        {showExcerpt && petition.excerpt && (
          <p className="row__excerpt">
            <Highlighted text={petition.excerpt} terms={terms} />
          </p>
        )}
        <div className="row__tags">
          <StatusBadge status={petition.status} />
          <span className="row__fact num">{formatVotes(petition.votes)}</span>
          <span className="row__fact">{shortCommission(petition.commission)}</span>
        </div>
        {petition.themes.length > 0 && (
          <div className="row__themes">
            {petition.themes.map((id) => {
              const theme = core.themeById.get(id);
              return theme ? <ThemeChip key={id} theme={theme} onClick={onTheme ? () => onTheme(id) : undefined} /> : null;
            })}
          </div>
        )}
      </div>
      <div className="row__actions">
        <FavoriteButton id={petition.id} title={petition.title} compact />
        <CompareButton id={petition.id} title={petition.title} compact />
      </div>
    </li>
  );
}

export function PetitionList({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ul className="rows" aria-label={label}>
      {children}
    </ul>
  );
}
