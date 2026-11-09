import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Loading({ label = 'Chargement du catalogue…' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ title, error, onRetry }: { title: string; error?: Error | null; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <h2>{title}</h2>
      {error && <p className="muted">{error.message}</p>}
      <p>
        Les données de l'Atlas sont des fichiers statiques : vérifiez votre connexion puis réessayez.
      </p>
      <div className="state__actions">
        {onRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Réessayer
          </button>
        )}
        <Link className="btn btn--ghost" to="/">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state--empty">
      <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true" className="state__glyph">
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M6 30 L22 10 L44 16 L58 32" strokeDasharray="3 4" />
        </g>
        <circle cx="6" cy="30" r="3" fill="currentColor" />
        <circle cx="22" cy="10" r="3" fill="currentColor" />
        <circle cx="44" cy="16" r="3" fill="var(--accent)" />
        <circle cx="58" cy="32" r="3" fill="currentColor" />
      </svg>
      <h2>{title}</h2>
      {children && <div className="state__body">{children}</div>}
      {action}
    </div>
  );
}
