import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { List, Map as MapIcon } from 'lucide-react';
import { ShareButton } from '../components/Actions';
import { StatusBadge } from '../components/Badges';
import { ConstellationMap, Legend, MiniConstellation } from '../components/ConstellationMap';
import { NodePanel, RelationReason } from '../components/NodePanel';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/States';
import { paginate } from '../lib/filters';
import { RELATION_LABEL, formatMonth, formatVotes, plural } from '../lib/format';
import { condensedGraph, demandGroups } from '../lib/condense';
import { dossierGraph } from '../lib/graph';
import { useDocumentTitle } from '../lib/hooks';
import { fold } from '../lib/text';
import type { RelationType } from '../lib/types';
import { useCore } from '../state/DataContext';

const PER_PAGE = 12;
const SORTS = { taille: 'Plus grandes', coherence: 'Plus cohérentes', recent: 'Plus récentes' } as const;
type SortKey = keyof typeof SORTS;
const REL_ORDER: RelationType[] = ['proche', 'comparaison', 'complementaire', 'thematique'];

export function ConstellationsIndex() {
  const core = useCore();
  const [params, setParams] = useSearchParams();
  useDocumentTitle('Constellations');
  const theme = params.get('theme') ?? '';
  const q = params.get('q') ?? '';
  const sort = (params.get('tri') as SortKey) in SORTS ? (params.get('tri') as SortKey) : 'taille';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const needle = fold(q).trim();
    let items = core.dossiers.filter((d) => {
      if (theme && !d.themes.includes(theme)) return false;
      if (!needle) return true;
      const haystack = fold(`${d.label} ${d.terms.join(' ')} ${core.byId.get(d.central)?.title ?? ''}`);
      return needle.split(/\s+/).every((word) => haystack.includes(word));
    });
    items = [...items];
    if (sort === 'taille') items.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));
    else if (sort === 'coherence') items.sort((a, b) => b.cohesion - a.cohesion);
    else items.sort((a, b) => (b.years[1] ?? '').localeCompare(a.years[1] ?? '') || b.size - a.size);
    return items;
  }, [core, theme, q, sort]);
  const paged = paginate(list, page, PER_PAGE);

  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">Les constellations</p>
        <h1>Des sujets qui reviennent, pétition après pétition</h1>
        <p className="lede">
          Une constellation regroupe des pétitions dont les textes se ressemblent assez pour tourner autour d'un même sujet. Le regroupement est automatique et prudent :
          {' '}{plural(core.meta.counts.dossiers, 'constellation', 'constellations')} couvrent {core.meta.counts.in_dossiers.toLocaleString('fr-FR')} pétitions sur {core.meta.counts.petitions.toLocaleString('fr-FR')}.
        </p>
      </header>

      <div className="toolbar toolbar--wrap">
        <label className="select-inline">
          <span className="field-label">Mot du sujet</span>
          <input type="search" value={q} placeholder="cannabis, retraite…" onChange={(e) => set({ q: e.target.value })} />
        </label>
        <label className="select-inline">
          <span className="field-label">Famille</span>
          <select value={theme} onChange={(e) => set({ theme: e.target.value })}>
            <option value="">Toutes</option>
            {core.taxonomy.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="select-inline">
          <span className="field-label">Trier par</span>
          <select value={sort} onChange={(e) => set({ tri: e.target.value })}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <p className="toolbar__count" aria-live="polite">{plural(list.length, 'constellation', 'constellations')}</p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Aucune constellation ne correspond">
          <p>Essayez un autre mot, ou retirez la famille choisie.</p>
        </EmptyState>
      ) : (
        <ul className="dossiers">
          {paged.slice.map((d) => {
            const central = core.byId.get(d.central);
            return (
              <li key={d.id} className="dossier-row">
                <Link to={`/constellations/${d.id}`} className="dossier-row__map" aria-hidden="true" tabIndex={-1}>
                  <MiniConstellation core={core} dossierId={d.id} size={132} />
                </Link>
                <div className="dossier-row__body">
                  <h2 className="dossier-row__title">
                    <Link to={`/constellations/${d.id}`}>{d.terms.slice(0, 3).join(' · ') || d.label}</Link>
                  </h2>
                  <p className="dossier-row__central">
                    <span className="muted">Pétition la plus centrale : </span>
                    {central?.title}
                  </p>
                  <p className="dossier-row__stats num muted">
                    {plural(d.size, 'pétition', 'pétitions')} · {d.years[0] === d.years[1] ? d.years[0] : `${d.years[0]}–${d.years[1]}`}
                    {REL_ORDER.filter((t) => d.relations[t]).map((t) => ` · ${d.relations[t]} ${RELATION_LABEL[t].toLowerCase()}`).slice(0, 2).join('')}
                  </p>
                  <div className="row__themes">
                    {d.themes.map((id) => {
                      const th = core.themeById.get(id);
                      return th ? (
                        <span key={id} className="chip"><span className="dot" style={{ background: th.color }} aria-hidden="true" />{th.label}</span>
                      ) : null;
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={paged.page} pages={paged.pages} onPage={(p) => { set({ page: String(p) }); window.scrollTo({ top: 0 }); }} />
    </div>
  );
}

export function ConstellationDetail() {
  const { id = '' } = useParams();
  const core = useCore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const dossier = core.dossierById.get(id);
  const [selected, setSelected] = useState<string | null>(params.get('focus'));
  useDocumentTitle(dossier ? `Constellation ${dossier.terms.slice(0, 2).join(' · ')}` : 'Constellation introuvable');
  const groups = useMemo(() => (dossier ? demandGroups(core, dossier) : []), [core, dossier]);
  const condensable = dossier ? groups.length < dossier.size : false;
  const showAll = params.get('tout') === '1' || !condensable;
  const graph = useMemo(
    () => (dossier ? (showAll ? dossierGraph(core, dossier) : condensedGraph(core, dossier, groups, 8)) : null),
    [core, dossier, groups, showAll],
  );

  const small = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches;
  const view = params.get('vue') ?? (small ? 'liste' : 'carte');

  if (!dossier || !graph) {
    return (
      <div className="container page">
        <EmptyState title="Constellation introuvable" action={<Link className="btn btn--primary" to="/constellations">Toutes les constellations</Link>}>
          <p>Les constellations sont recalculées à chaque mise à jour du catalogue : leur numéro peut changer si leurs pétitions ont évolué.</p>
        </EmptyState>
      </div>
    );
  }

  const members = dossier.members.map((m) => core.byId.get(m)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const present = new Set(graph.links.map((l) => l.relation.type));
  const grouped = REL_ORDER.map((type) => ({ type, links: graph.links.filter((l) => l.relation.type === type).sort((a, b) => b.relation.score - a.relation.score) }));
  const setView = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('vue', v);
    setParams(next, { replace: true });
  };
  const outside = graph.nodes.filter((n) => n.role === 'voisine').length;

  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link to="/constellations">Constellations</Link>
        <button type="button" className="crumbs__back" onClick={() => navigate(-1)}>Retour au contexte précédent</button>
      </nav>
      <header className="page-head">
        <p className="eyebrow">Constellation automatique · {dossier.years[0] === dossier.years[1] ? dossier.years[0] : `${dossier.years[0]}–${dossier.years[1]}`}</p>
        <h1>{dossier.terms.slice(0, 3).join(' · ') || dossier.label}</h1>
        <p className="lede">
          {plural(dossier.size, 'pétition', 'pétitions')} regroupées parce que leurs textes se ressemblent. Elles ne défendent pas forcément la même position, et leurs soutiens ne s'additionnent pas.
        </p>
        <div className="petition__cta">
          <ShareButton path={`/constellations/${dossier.id}`} title={`Constellation ${dossier.label}`} label="Partager ce dossier" />
          <Link className="btn btn--ghost" to={`/recherche?dossier=${dossier.id}`}>Ouvrir dans l'explorateur</Link>
          <div className="seg" role="group" aria-label="Mode d'affichage">
            <button type="button" className={`seg__btn${view === 'carte' ? ' is-on' : ''}`} aria-pressed={view === 'carte'} onClick={() => setView('carte')}>
              <MapIcon size={16} aria-hidden="true" /> Carte
            </button>
            <button type="button" className={`seg__btn${view === 'liste' ? ' is-on' : ''}`} aria-pressed={view === 'liste'} onClick={() => setView('liste')}>
              <List size={16} aria-hidden="true" /> Liste
            </button>
          </div>
        </div>
      </header>

      <section className="synthesis" aria-labelledby="synthese">
        <h2 id="synthese" className="section-title">L'essentiel en trente secondes</h2>
        <div className="synthesis__grid">
          <div>
            <h3 className="synthesis__label">Ce qu'elles ont en commun</h3>
            <p className="synthesis__terms">{dossier.terms.map((t) => <span key={t} className="chip">{t}</span>)}</p>
            <p className="muted">Mots les plus caractéristiques de ces textes, calculés automatiquement.</p>
          </div>
          <div>
            <h3 className="synthesis__label">Ce qui les distingue : {plural(groups.length, 'demande', 'demandes')}</h3>
            <ol className="synthesis__demands">
              {groups.slice(0, 6).map((g) => (
                <li key={g.rep}>
                  <button type="button" className="linklike" onClick={() => { setView('carte'); setSelected(g.rep); }}>
                    {core.byId.get(g.rep)?.title}
                  </button>
                  {g.members.length > 1 && <span className="muted num"> — ×{g.members.length} textes très proches</span>}
                </li>
              ))}
            </ol>
            {groups.length > 6 && <p className="muted">et {groups.length - 6} autres demandes dans la liste ci-dessous.</p>}
          </div>
        </div>
      </section>

      {view === 'carte' && condensable && (
        <p className="map-switch">
          {showAll
            ? `Les ${dossier.size} pétitions sont affichées.`
            : `La carte montre les ${Math.min(8, groups.length)} demandes principales, pas les ${dossier.size} pétitions.`}{' '}
          <button
            type="button"
            className="linklike"
            onClick={() => {
              const next = new URLSearchParams(params);
              if (showAll) next.delete('tout');
              else next.set('tout', '1');
              setParams(next, { replace: true });
              setSelected(null);
            }}
          >
            {showAll ? 'Revenir aux demandes principales' : `Afficher les ${dossier.size} pétitions`}
          </button>
        </p>
      )}

      {view === 'carte' && (
        <div className="constellation">
          <figure className="constellation__figure">
            <ConstellationMap
              core={core}
              graph={graph}
              selectedId={selected}
              onSelect={setSelected}
              label={`Carte de la constellation « ${dossier.terms.slice(0, 3).join(', ')} » : ${dossier.size} pétitions et ${graph.links.length} liens. Une version texte complète suit la carte.`}
            />
            <figcaption>
              <Legend present={present} />
              <p className="muted">
                Sélectionnez un point pour voir la pétition. Glisser pour déplacer, Ctrl + molette ou boutons pour zoomer.
                {outside > 0 && ` ${plural(outside, 'point plus petit sur le pourtour est', 'points plus petits sur le pourtour sont')} lié${outside > 1 ? 's' : ''} à ce dossier mais en vient d'un autre.`}
                {' '}La position des points reflète une proximité de texte, jamais un classement.
              </p>
            </figcaption>
          </figure>
          <div className="constellation__side">
            {selected ? (
              <>
                <NodePanel core={core} id={selected} from={undefined} />
                {(() => {
                  const g = groups.find((x) => x.rep === selected);
                  if (!g || g.members.length < 2) return null;
                  return (
                    <div className="panel panel--hint">
                      <p className="eyebrow">{g.members.length - 1} texte(s) très proche(s)</p>
                      <ul className="plain-list">
                        {g.members.filter((m) => m !== g.rep).slice(0, 8).map((m) => (
                          <li key={m}><Link to={`/petition/${m}`}>{core.byId.get(m)?.title}</Link></li>
                        ))}
                      </ul>
                      <p className="muted">Une même demande déposée plusieurs fois : leurs soutiens ne s'additionnent pas.</p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="panel panel--hint">
                <p className="eyebrow">Pétition la plus centrale</p>
                <h3><Link to={`/petition/${dossier.central}`}>{core.byId.get(dossier.central)?.title}</Link></h3>
                <p className="muted">Choisissez un point de la carte pour ouvrir sa pétition, voir ses voisines et comprendre pourquoi elles sont reliées.</p>
                <button type="button" className="btn btn--ghost" onClick={() => setSelected(dossier.central)}>La sélectionner</button>
              </div>
            )}
          </div>
        </div>
      )}

      <section aria-labelledby="liste" className="constellation__list">
        <h2 id="liste" className="section-title">{view === 'carte' ? 'Version texte de la carte' : 'Les pétitions de cette constellation'}</h2>
        <ul className="rows">
          {members.map((p) => (
            <li className="row row--tight" key={p.id}>
              <div className="row__meta num"><span>n° {p.id}</span><span>{formatMonth(p.published)}</span></div>
              <div className="row__body">
                <h3 className="row__title"><Link to={`/petition/${p.id}`}>{p.title}</Link></h3>
                <div className="row__tags">
                  <StatusBadge status={p.status} />
                  <span className="row__fact num">{formatVotes(p.votes)}</span>
                  <span className="row__fact num">{(core.adjacency.get(p.id) ?? []).filter((n) => core.byId.get(n.id)?.dossier === dossier.id).length} lien(s) dans le dossier</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="section-title">Les liens calculés</h2>
        {grouped.filter((g) => g.links.length > 0).map(({ type, links }) => (
          <details key={type} className="links-group" open={type !== 'thematique'}>
            <summary>{RELATION_LABEL[type]} <span className="muted num">({links.length})</span></summary>
            <ul className="plain-list">
              {links.slice(0, 40).map((l) => (
                <li key={`${l.a}-${l.b}`}>
                  <Link to={`/petition/${l.a}`}>{core.byId.get(l.a)?.title}</Link>
                  <span className="muted"> ↔ </span>
                  <Link to={`/petition/${l.b}`}>{core.byId.get(l.b)?.title}</Link>
                  <RelationReason relation={l.relation} showScore={false} />
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  );
}
