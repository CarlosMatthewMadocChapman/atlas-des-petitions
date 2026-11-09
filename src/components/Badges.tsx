import { RELATION_HELP, RELATION_SHORT, STATUS_HELP, STATUS_LABEL } from '../lib/format';
import type { RelationType, Status, Theme } from '../lib/types';

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge--${status}`} title={STATUS_HELP[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ThemeChip({ theme, onClick }: { theme: Theme; onClick?: () => void }) {
  const content = (
    <>
      <span className="dot" style={{ background: theme.color }} aria-hidden="true" />
      {theme.label}
    </>
  );
  return onClick ? (
    <button type="button" className="chip chip--button" onClick={onClick}>
      {content}
    </button>
  ) : (
    <span className="chip">{content}</span>
  );
}

export function RelationBadge({ type }: { type: RelationType }) {
  return (
    <span className={`rel-badge rel-badge--${type}`} title={RELATION_HELP[type]}>
      <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true">
        <line x1="1" x2="21" y1="4" y2="4" className={`rel-stroke rel-stroke--${type}`} />
      </svg>
      {RELATION_SHORT[type]}
    </span>
  );
}
