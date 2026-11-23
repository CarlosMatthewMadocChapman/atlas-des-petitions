import { useEffect } from 'react';
import { chamber } from './chamber';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const site = chamber.site;
    document.title = title ? `${title} · ${site}` : site;
  }, [title]);
}
