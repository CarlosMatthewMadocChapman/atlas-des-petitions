import { useEffect } from 'react';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · L'Atlas des pétitions` : "L'Atlas des pétitions";
  }, [title]);
}
