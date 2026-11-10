import { useId, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Core } from '../lib/data';
import { activeFilterCount, commissionSlug, EMPTY_FILTERS, type FilterState } from '../lib/filters';
import { STATUS_LABEL, shortCommission } from '../lib/format';
import type { Status } from '../lib/types';

interface Props {
  core: Core;
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  /** Masque la recherche par commission ou par statut dans les vues qui les fixent déjà. */
  hide?: ('statuses' | 'votes')[];
}

const VOTE_PRESETS = [50, 100, 500, 1000];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function FilterPanel({ core, state, onChange, hide = [] }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const count = activeFilterCount(state);
  const years = Object.keys(core.stats.years).filter((y) => /^\d{4}$/.test(y));
  const statuses = (Object.keys(core.stats.status) as Status[]).sort();
  const dossier = state.dossier ? core.dossierById.get(state.dossier) : undefined;

  const sinceYear = state.since.slice(0, 4);
  const untilYear = state.until.slice(0, 4);

  return (
    <aside className="filters" aria-label="Filtres de recherche">
      <button
        type="button"
        className="btn btn--ghost filters__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filtres{count > 0 ? ` (${count})` : ''}
      </button>

      <div id={panelId} className={`filters__body${open ? ' is-open' : ''}`}>
        {dossier && (
          <p className="filters__dossier">
            Dossier : <strong>{dossier.label}</strong>
            <button type="button" className="icon-btn" aria-label="Retirer le filtre de dossier" onClick={() => onChange({ dossier: '' })}>
              <X size={14} aria-hidden="true" />
            </button>
          </p>
        )}

        <fieldset className="filters__group">
          <legend>Famille thématique</legend>
          <p className="filters__note">Catégorisation automatique, non officielle.</p>
          <ul className="filters__list filters__list--cols">
            {core.taxonomy.map((theme) => (
              <li key={theme.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={state.themes.includes(theme.id)}
                    onChange={() => onChange({ themes: toggle(state.themes, theme.id), page: 1 })}
                  />
                  <span className="dot" style={{ background: theme.color }} aria-hidden="true" />
                  <span>{theme.label}</span>
                  <span className="check__count num">{core.stats.themes[theme.id] ?? 0}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {!hide.includes('statuses') && (
          <fieldset className="filters__group">
            <legend>Statut</legend>
            <ul className="filters__list">
              {statuses.map((status) => (
                <li key={status}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={state.statuses.includes(status)}
                      onChange={() => onChange({ statuses: toggle(state.statuses, status), page: 1 })}
                    />
                    <span>{STATUS_LABEL[status]}</span>
                    <span className="check__count num">{core.stats.status[status]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <fieldset className="filters__group">
          <legend>Période de dépôt</legend>
          <div className="field-row">
            <label>
              <span className="field-label">De</span>
              <select
                value={sinceYear}
                onChange={(e) => onChange({ since: e.target.value ? `${e.target.value}-01-01` : '', page: 1 })}
              >
                <option value="">Début</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">À</span>
              <select
                value={untilYear}
                onChange={(e) => onChange({ until: e.target.value ? `${e.target.value}-12-31` : '', page: 1 })}
              >
                <option value="">Fin</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {!hide.includes('votes') && (
          <fieldset className="filters__group">
            <legend>Nombre de soutiens</legend>
            <p className="filters__note">À la date du jeu de données. Un faible nombre ne dit rien de la qualité d'une proposition.</p>
            <div className="field-row">
              <label>
                <span className="field-label">Au moins</span>
                <input
                  type="number" min={0} inputMode="numeric" value={state.minVotes ?? ''}
                  onChange={(e) => onChange({ minVotes: e.target.value === '' ? null : Math.max(0, Number(e.target.value)), page: 1 })}
                />
              </label>
              <label>
                <span className="field-label">Au plus</span>
                <input
                  type="number" min={0} inputMode="numeric" value={state.maxVotes ?? ''}
                  onChange={(e) => onChange({ maxVotes: e.target.value === '' ? null : Math.max(0, Number(e.target.value)), page: 1 })}
                />
              </label>
            </div>
            <div className="presets" role="group" aria-label="Seuils rapides de soutiens">
              {VOTE_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip chip--button${state.maxVotes === n - 1 ? ' is-on' : ''}`}
                  aria-pressed={state.maxVotes === n - 1}
                  onClick={() => onChange({ maxVotes: state.maxVotes === n - 1 ? null : n - 1, minVotes: null, page: 1 })}
                >
                  Moins de {n}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="filters__group">
          <legend>Commission parlementaire</legend>
          <ul className="filters__list">
            {core.commissions.map((name) => {
              const slug = commissionSlug(name);
              return (
                <li key={slug}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={state.commissions.includes(slug)}
                      onChange={() => onChange({ commissions: toggle(state.commissions, slug), page: 1 })}
                    />
                    <span>{shortCommission(name)}</span>
                    <span className="check__count num">{core.stats.commissions[name] ?? 0}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <button
          type="button"
          className="btn btn--ghost filters__reset"
          disabled={count === 0 && !state.q}
          onClick={() => onChange({ ...EMPTY_FILTERS })}
        >
          Réinitialiser les filtres et la recherche
        </button>
      </div>
    </aside>
  );
}
