import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageWindow(page: number, pages: number): (number | '…')[] {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const numbers = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  numbers.forEach((n, i) => {
    if (i > 0 && n - numbers[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination des résultats">
      <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} aria-hidden="true" /> Précédente
      </button>
      <ol className="pagination__pages">
        {pageWindow(page, pages).map((n, i) =>
          n === '…' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="muted">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                className={`pagination__page num${n === page ? ' is-current' : ''}`}
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            </li>
          ),
        )}
      </ol>
      <button type="button" className="btn btn--ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Suivante <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
