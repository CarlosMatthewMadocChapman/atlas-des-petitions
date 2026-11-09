import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { OfficialLink, ShareButton } from '../components/Actions';
import { StatusBadge } from '../components/Badges';
import { RelationReason } from '../components/NodePanel';
import { SearchBox } from '../components/SearchBox';
import { EmptyState, Loading } from '../components/States';
import { distinctiveTerms, sharedSegments } from '../lib/compare';
import { loadDetail } from '../lib/data';
import { formatDate, formatNumber, shortCommission } from '../lib/format';
import { relationBetween } from '../lib/graph';
import { useDocumentTitle } from '../lib/hooks';
import type { PetitionDetail } from '../lib/types';
import { useCore, useSearchEngine } from '../state/DataContext';
import { compareStore } from '../state/store';

const MAX = 4;

export function CompareView() {
  const core = useCore();
  const [params, setParams] = useSearchParams();
  const search = useSearchEngine();
  useDocumentTitle('Comparer des pétitions');

  const fromUrl = (params.get('ids') ?? '').split(',').filter((id) => core.byId.has(id)).slice(0, MAX);
  const ids = useMemo(() => [...new Set(fromUrl)], [fromUrl.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adresse vide : on reprend la sélection de la session ; adresse remplie : elle prime et alimente la sélection.
  useEffect(() => {
    if (ids.length === 0 && compareStore.get().length > 0) {
      setParams({ ids: compareStore.get().join(',') }, { replace: true });
    } else if (ids.join(',') !== compareStore.get().join(',') && ids.length > 0) {
      compareStore.set(ids);
    }
  }, [ids, setParams]);

  const setIds = (next: string[]) => {
    compareStore.set(next);
    setParams(next.length ? { ids: next.join(',') } : {}, { replace: true });
  };

  const [details, setDetails] = useState<Record<string, PetitionDetail | null>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(ids.map((id) => loadDetail(id, core.meta.detail_shard).catch(() => null).then((d) => [id, d] as const))).then((entries) => {
      if (!cancelled) setDetails(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [ids, core.meta.detail_shard]);

  const [query, setQuery] = useState('');
  const suggestions = useMemo(() => {
    if (!query || !search.engine) return [];
    return search.engine.search(query).filter((h) => h.kind !== 'voisine' && !ids.includes(h.id)).slice(0, 6);
  }, [query, search.engine, ids]);

  const ready = ids.length > 0 && ids.every((id) => id in details);
  const texts = ids.map((id) => details[id]?.description ?? '');
  const shared = useMemo(() => (ready && ids.length > 1 ? sharedSegments(texts) : null), [ready, texts.join('|'), ids.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const distinct = useMemo(
    () => (ready && ids.length > 1 && search.stopwords.size ? distinctiveTerms(ids.map((id, i) => `${core.byId.get(id)?.title ?? ''}. ${texts[i]}`), search.stopwords) : null),
    [ready, ids, search.stopwords, texts.join('|')], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);

  return (
    <div className="container page">
      <header className="page-head">
        <p className="eyebrow">Comparer</p>
        <h1>Deux à quatre pétitions côte à côte</h1>
        <p className="lede">
          Les textes sont affichés tels que publiés. Les passages communs et les termes distinctifs sont calculés automatiquement, dans des encadrés séparés, pour que vous puissiez les vérifier.
        </p>
      </header>

      <section className="compare-picker" aria-labelledby="ajouter">
        <h2 id="ajouter" className="section-title">Ajouter une pétition</h2>
        {ids.length < MAX ? (
          <>
            <SearchBox value={query} onSubmit={setQuery} onLive={setQuery} label="Chercher une pétition à comparer" placeholder="Titre ou sujet de la pétition à ajouter" />
            {query && search.loading && <p className="muted">Chargement de l'index…</p>}
            {suggestions.length > 0 && (
              <ul className="suggestions">
                {suggestions.map((h) => {
                  const p = core.byId.get(h.id);
                  return p ? (
                    <li key={h.id}>
                      <button type="button" className="suggestion" onClick={() => { setIds([...ids, h.id]); setQuery(''); }}>
                        <Plus size={16} aria-hidden="true" />
                        <span>{p.title}</span>
                        <span className="muted num">n° {p.id}</span>
                      </button>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="muted">La comparaison est limitée à quatre pétitions. Retirez-en une pour en ajouter une autre.</p>
        )}
      </section>

      {ids.length === 0 && (
        <EmptyState title="Aucune pétition à comparer" action={<Link className="btn btn--primary" to="/recherche">Explorer le catalogue</Link>}>
          <p>Cherchez ci-dessus, ou utilisez le bouton « Comparer » d'une fiche ou d'un résultat. Il faut au moins deux pétitions.</p>
        </EmptyState>
      )}

      {ids.length === 1 && <p className="note">Ajoutez au moins une autre pétition pour lancer la comparaison.</p>}

      {ids.length > 0 && !ready && <Loading label="Chargement des textes…" />}

      {ready && (
        <>
          <div className="compare__actions">
            <ShareButton path={`/comparer?ids=${ids.join(',')}`} title="Comparaison de pétitions" label="Partager cette comparaison" />
            <button type="button" className="btn btn--ghost" onClick={() => setIds([])}>Tout retirer</button>
          </div>

          <div className="compare" style={{ ['--cols' as string]: ids.length }}>
            {ids.map((id, col) => {
              const p = core.byId.get(id);
              const d = details[id];
              if (!p) return null;
              const segments = shared?.segments[col];
              return (
                <article key={id} className="compare__col">
                  <header>
                    <p className="eyebrow num">n° {p.id}</p>
                    <h2><Link to={`/petition/${p.id}`}>{p.title}</Link></h2>
                    <button type="button" className="icon-btn compare__remove" aria-label={`Retirer de la comparaison : ${p.title}`} onClick={() => setIds(ids.filter((x) => x !== id))}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  </header>
                  <dl className="facts facts--compact">
                    <div><dt>Statut</dt><dd><StatusBadge status={p.status} /></dd></div>
                    <div><dt>Mise en ligne</dt><dd>{formatDate(p.published)}</dd></div>
                    <div><dt>Soutiens à la date du fichier</dt><dd className="num">{formatNumber(p.votes)}</dd></div>
                    <div><dt>Date limite</dt><dd>{formatDate(d?.deadline ?? null)}</dd></div>
                    <div><dt>Commission</dt><dd>{shortCommission(p.commission)}</dd></div>
                    <div><dt>Familles (auto.)</dt><dd>{p.themes.map((t) => core.themeById.get(t)?.label).filter(Boolean).join(', ') || '—'}</dd></div>
                  </dl>
                  <h3 className="compare__label">Description du jeu de données</h3>
                  <div className="prose prose--compare" lang="fr">
                    <p>{segments ? segments.map((s, i) => (s.shared ? <mark key={i}>{s.text}</mark> : s.text)) : d?.description}</p>
                  </div>
                  {d?.decision && (
                    <>
                      <h3 className="compare__label">Décision publiée</h3>
                      <p className="compare__decision">{d.decision}</p>
                    </>
                  )}
                  <OfficialLink id={p.id} meta={core.meta} />
                </article>
              );
            })}
          </div>

          {ids.length > 1 && (
            <div className="compare__analysis">
              <section aria-labelledby="communs" className="analysis">
                <h2 id="communs" className="section-title">Passages communs <span className="badge badge--auto">Calcul automatique</span></h2>
                {shared && shared.common.length > 0 ? (
                  <>
                    <p className="source-note">Suites d'au moins six mots identiques présentes dans plusieurs textes (surlignées ci-dessus). Un passage commun n'implique pas une demande commune.</p>
                    <ul className="plain-list">{shared.common.map((c, i) => <li key={i}>« {c} »</li>)}</ul>
                  </>
                ) : (
                  <p className="muted">Aucun passage d'au moins six mots n'est partagé : les textes sont formulés différemment.</p>
                )}
              </section>

              <section aria-labelledby="distinctifs" className="analysis">
                <h2 id="distinctifs" className="section-title">Ce qui distingue chaque texte <span className="badge badge--auto">Calcul automatique</span></h2>
                <p className="source-note">Mots présents dans un texte et absents des autres. À vérifier dans les textes : ils signalent des pistes de différences, pas des positions.</p>
                {distinct ? (
                  <ul className="distinct">
                    {ids.map((id, i) => (
                      <li key={id}>
                        <strong className="num">n° {id}</strong>
                        <span>{distinct[i].length ? distinct[i].join(', ') : 'aucun terme distinctif'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Calcul en attente de l'index de recherche…</p>
                )}
              </section>

              <section aria-labelledby="rapprochements" className="analysis">
                <h2 id="rapprochements" className="section-title">Rapprochements calculés entre ces pétitions</h2>
                <ul className="pairs">
                  {pairs.map(([a, b]) => {
                    const relation = relationBetween(core, a, b);
                    return (
                      <li key={`${a}-${b}`}>
                        <p><strong className="num">n° {a}</strong> et <strong className="num">n° {b}</strong></p>
                        {relation ? <RelationReason relation={relation} /> : <p className="muted">Le moteur n'a calculé aucun rapprochement direct entre ces deux pétitions.</p>}
                      </li>
                    );
                  })}
                </ul>
                <p className="note">Les soutiens de ces pétitions ne doivent pas être additionnés : une même personne peut en avoir soutenu plusieurs.</p>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
