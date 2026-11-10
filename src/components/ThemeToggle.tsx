import { Moon, Sun } from 'lucide-react';

const KEY = 'atlas-theme';

/** Bascule nuit / clair, mémorisée dans ce navigateur. Les pages statiques partagent la même préférence. */
function toggleTheme() {
  const root = document.documentElement;
  const night = root.dataset.ciel === 'nuit';
  if (night) delete root.dataset.ciel;
  else root.dataset.ciel = 'nuit';
  try {
    localStorage.setItem(KEY, night ? 'clair' : 'nuit');
  } catch {
    /* navigation privée : le choix vaut pour cette page */
  }
}

export function ThemeToggle() {
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Changer entre le mode nuit et le mode clair">
      <span className="theme-toggle__clair"><Sun size={15} aria-hidden="true" /> Mode clair</span>
      <span className="theme-toggle__nuit"><Moon size={15} aria-hidden="true" /> Mode nuit</span>
    </button>
  );
}
