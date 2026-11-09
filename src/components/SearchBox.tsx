import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onSubmit: (value: string) => void;
  /** Si fourni, la recherche se met à jour pendant la frappe (avec délai). */
  onLive?: (value: string) => void;
  large?: boolean;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBox({ value, onSubmit, onLive, large, label = 'Rechercher une pétition', placeholder = 'Pluralisme des médias, loyers, retraites…', autoFocus }: Props) {
  const [text, setText] = useState(value);
  const id = useId();
  const timer = useRef<number>();

  useEffect(() => setText(value), [value]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function change(next: string) {
    setText(next);
    if (!onLive) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onLive(next.trim()), 220);
  }

  return (
    <form
      role="search"
      className={`searchbox${large ? ' searchbox--large' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        window.clearTimeout(timer.current);
        onSubmit(text.trim());
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search size={large ? 24 : 20} aria-hidden="true" className="searchbox__icon" />
      <input
        id={id}
        type="search"
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        onChange={(event) => change(event.target.value)}
      />
      {text && (
        <button
          type="button"
          className="icon-btn"
          aria-label="Effacer la recherche"
          onClick={() => {
            change('');
            onSubmit('');
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <button type="submit" className="btn btn--primary searchbox__submit">
        Chercher
      </button>
    </form>
  );
}
