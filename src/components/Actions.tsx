import { useState } from 'react';
import { Check, ExternalLink, Link2, Scale, Star } from 'lucide-react';
import { officialUrl } from '../lib/data';
import type { Meta } from '../lib/types';
import { useCompare, useFavorites } from '../state/store';

export function FavoriteButton({ id, title, compact }: { id: string; title: string; compact?: boolean }) {
  const { has, toggle } = useFavorites();
  const on = has(id);
  return (
    <button
      type="button"
      className={`icon-btn${on ? ' icon-btn--on' : ''}`}
      aria-pressed={on}
      aria-label={`${on ? 'Retirer des' : 'Ajouter aux'} favoris : ${title}`}
      onClick={() => toggle(id)}
    >
      <Star size={18} aria-hidden="true" fill={on ? 'currentColor' : 'none'} />
      {!compact && <span>{on ? 'Dans mes favoris' : 'Mettre en favori'}</span>}
    </button>
  );
}

export function CompareButton({ id, title, compact }: { id: string; title: string; compact?: boolean }) {
  const { has, toggle, ids } = useCompare();
  const on = has(id);
  const full = !on && ids.length >= 4;
  return (
    <button
      type="button"
      className={`icon-btn${on ? ' icon-btn--on' : ''}`}
      aria-pressed={on}
      disabled={full}
      aria-label={`${on ? 'Retirer de' : 'Ajouter à'} la comparaison : ${title}`}
      title={full ? 'La comparaison est limitée à quatre pétitions.' : undefined}
      onClick={() => toggle(id)}
    >
      <Scale size={18} aria-hidden="true" />
      {!compact && <span>{on ? 'Dans la comparaison' : 'Comparer'}</span>}
    </button>
  );
}

export function OfficialLink({ id, meta, prominent }: { id: string; meta: Meta; prominent?: boolean }) {
  return (
    <a
      className={prominent ? 'btn btn--primary' : 'btn btn--ghost'}
      href={officialUrl({ id }, meta)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Voir la pétition sur le site officiel
      <ExternalLink size={16} aria-hidden="true" />
      <span className="visually-hidden"> (s'ouvre dans un nouvel onglet)</span>
    </a>
  );
}

export function pageUrl(path: string): string {
  const base = window.location.href.split('#')[0];
  return `${base}#${path.startsWith('/') ? path : `/${path}`}`;
}

export function ShareButton({ path, title, label = 'Partager' }: { path: string; title: string; label?: string }) {
  const [done, setDone] = useState<'' | 'copie' | 'erreur'>('');

  async function share() {
    const url = pageUrl(path);
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone('copie');
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      setDone('erreur');
      window.prompt('Copiez ce lien :', url);
    }
    window.setTimeout(() => setDone(''), 2400);
  }

  return (
    <button type="button" className="btn btn--ghost" onClick={share}>
      {done === 'copie' ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      {done === 'copie' ? 'Lien copié' : label}
      <span className="visually-hidden" role="status">
        {done === 'copie' ? 'Le lien a été copié dans le presse-papiers.' : ''}
      </span>
    </button>
  );
}
