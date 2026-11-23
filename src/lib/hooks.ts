import { useEffect } from 'react';
import { chamber } from './chamber';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const site = chamber.id === 'an' ? "L'Atlas des pétitions" : "L'Atlas des pétitions du Sénat";
    document.title = title ? `${title} · ${site}` : site;
  }, [title]);
}
