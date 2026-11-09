import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Lock } from 'lucide-react';
import { CompareButton, ShareButton } from '../components/Actions';
import { StatusBadge } from '../components/Badges';
import { ConstellationMap, Legend } from '../components/ConstellationMap';
import { Loading } from '../components/States';
import { condensedGraph, demandGroups, withYou } from '../lib/condense';
import { officialUrl } from '../lib/data';
import { formatMonth, formatVotes, plural, shortCommission } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { isMatchable, matchText, wordCount, type MatchResult } from '../lib/match';
import { useCore, useSearchEngine } from '../state/DataContext';

const EXAMPLES = [
  "Je demande que le vote blanc soit reconnu comme un suffrage exprimé lors de toutes les élections, afin que les électeurs qui ne se reconnaissent dans aucun candidat soient comptés.",
  "Il faut interdire les pesticides néonicotinoïdes pour protéger les abeilles, les agriculteurs et notre santé, et soutenir les paysans dans la transition.",
  "Je souhaite que les transports en commun soient gratuits dans toutes les villes de France pour réduire la pollution et aider les ménages modestes.",
];

function Verdict({ result }: { result: MatchResult }) {
  const { hits, closeCount } = result;
  let title: string;
  if (hits.length === 0) title = "Le moteur ne trouve rien de proche de votre texte.";
  else if (closeCount >= 3) title = `Votre idée est déjà portée : ${closeCount} pétitions sont très proches de votre texte.`;
  else if (closeCount >= 1) title = `Votre idée ressemble à ${plural(closeCount, 'pétition existante', 'pétitions existantes')}.`;
  else title = `Aucune pétition très proche, mais ${plural(hits.length, 'pétition aborde', 'pétitions abordent')} le même sujet.`;
  return (
    <div className="verdict" role="status">
      <h2>{title}</h2>
      <p className="muted">
        {hits.length === 0
          ? "Cela ne prouve pas que votre idée soit neuve : essayez avec d'autres mots, ou plus de détails sur votre demande."
          : "Proche ne veut pas dire identique : lisez-les, leurs demandes peuvent différer, voire s'opposer. Le classement est technique, il ne juge aucune idée."}
      </p>
    </div>
  );
}

export function Write() {
  const core = useCore();
  const search = useSearchEngine();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  useDocumentTitle('Écrivez votre pétition');

  const result = useMemo(
    () => (submitted && search.engine ? matchText(core, search.engine, search.stopwords, submitted) : null),
    [core, search.engine, search.stopwords, submitted],
  );

  const dossier = result?.dossier ? core.dossierById.get(result.dossier.id) : undefined;
  const mapGraph = useMemo(() => {
    if (!result || !dossier) return null;
    const groups = demandGroups(core, dossier);
    const hitIds = new Set(result.dossier?.hitIds ?? []);
    const ordered = [...groups].sort(
      (a, b) => Number(b.members.some((m) => hitIds.has(m))) - Number(a.members.some((m) => hitIds.has(m))) || b.members.length - a.members.length,
    );
    const graph = condensedGraph(core, dossier, ordered, 9);
    const repOf = new Map<string, string>();
    for (const g of ordered.slice(0, 9)) for (const m of g.members) repOf.set(m, g.rep);
    const matches = result.hits
      .filter((h) => repOf.has(h.petition.id))
      .map((h) => ({ id: repOf.get(h.petition.id) as string, close: h.closeness === 'tres-proche' }));
    return withYou(graph, matches);
  }, [core, dossier, result]);

  const [selected, setSelected] = useState<string | null>(null);
  const ready = isMatchable(text);

  function run(value: string) {
    setSelected(null);
    setSubmitted(value.trim());
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  const topThree = result?.hits.slice(0, 3).map((h) => h.petition.id) ?? [];

  return (
    <div className="container page write">
      <header className="page-head">
        <p className="eyebrow eyebrow--accent">Votre idée</p>
        <h1>Écrivez votre pétition. Voyez qui y pense déjà.</h1>
        <p className="lede">
          Collez ou écrivez votre demande, même en quelques phrases : l'Atlas cherche, parmi {core.meta.counts.petitions.toLocaleString('fr-FR')} pétitions, celles qui parlent de la même
          chose, et la constellation que votre idée rejoint.
        </p>
      </header>

      <form
        className="write__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) run(text);
        }}
      >
        <label htmlFor="ecrire-texte" className="field-label">Votre texte (titre et demande)</label>
        <textarea
          id="ecrire-texte"
          rows={7}
          value={text}
          maxLength={6000}
          placeholder="Exemple : Je demande que le vote blanc soit reconnu comme un suffrage exprimé…"
          onChange={(event) => setText(event.target.value)}
        />
        <p className="write__privacy">
          <Lock size={15} aria-hidden="true" /> Votre texte reste dans votre navigateur : il n'est ni envoyé, ni enregistré, ni stocké.
        </p>
        <div className="write__actions">
          <button type="submit" className="btn btn--primary" disabled={!ready}>Voir où elle tombe</button>
          <span className="muted num" aria-live="polite">{wordCount(text)} mot{wordCount(text) > 1 ? 's' : ''}{ready ? '' : ' — écrivez au moins 3 mots'}</span>
        </div>
        <div className="write__examples">
          <span className="field-label">Pas d'idée sous la main ? Essayez un exemple :</span>
          <ul>
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button type="button" className="chip chip--button" onClick={() => { setText(example); run(example); }}>
                  {example.slice(0, 58)}…
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>

      <div ref={resultRef} className="write__result" tabIndex={-1}>
        {submitted && search.loading && <Loading label="Chargement de l'index de recherche…" />}
        {search.error && <p className="note note--warn" role="alert">L'index n'a pas pu être chargé ({search.error.message}).</p>}

        {result && (
          <>
            <Verdict result={result} />

            {result.themes.length > 0 && (
              <p className="write__themes">
                <span className="muted">Familles voisines (automatique, non officielle) : </span>
                {result.themes.map((t) => {
                  const theme = core.themeById.get(t.id);
                  return theme ? (
                    <Link key={t.id} to={`/recherche?theme=${t.id}`} className="chip chip--link">
                      <span className="dot" style={{ background: theme.color }} aria-hidden="true" />{theme.label}
                    </Link>
                  ) : null;
                })}
              </p>
            )}

            {dossier && mapGraph && (
              <section aria-labelledby="ecrire-carte" className="write__map">
                <h2 id="ecrire-carte" className="section-title">Votre idée dans la constellation « {dossier.terms.slice(0, 3).join(' · ')} »</h2>
                <p className="source-note">
                  {dossier.size} pétitions parlent de ce sujet ; elles sont ramenées ici à leurs demandes distinctes (un point = une demande, ×n = n textes quasi identiques). Le point rouge est votre texte.
                </p>
                <ConstellationMap
                  core={core}
                  graph={mapGraph}
                  selectedId={selected}
                  onSelect={setSelected}
                  label={`Carte de la constellation ${dossier.terms.slice(0, 3).join(', ')} avec votre texte relié à ${mapGraph.links.filter((l) => l.a === 'vous').length} demande(s). La liste complète suit en texte.`}
                />
                <Legend present={new Set(mapGraph.links.map((l) => l.relation.type))} />
                <p>
                  <Link className="btn btn--ghost" to={`/constellations/${dossier.id}`}>Explorer toute la constellation <ArrowRight size={16} aria-hidden="true" /></Link>
                </p>
              </section>
            )}

            {result.hits.length > 0 && (
              <section aria-labelledby="ecrire-liste">
                <div className="toolbar">
                  <h2 id="ecrire-liste" className="section-title">Les pétitions les plus proches</h2>
                  <div className="toolbar__tools">
                    {topThree.length >= 2 && (
                      <Link className="btn btn--ghost" to={`/comparer?ids=${topThree.join(',')}`}>Comparer les {topThree.length} plus proches</Link>
                    )}
                    {topThree.length >= 1 && (
                      <ShareButton path={`/comparer?ids=${topThree.join(',')}`} title="Pétitions proches de mon idée" label="Partager ces pétitions" />
                    )}
                  </div>
                </div>
                <ul className="rows">
                  {result.hits.slice(0, 8).map((h) => (
                    <li className="row" key={h.petition.id}>
                      <div className="row__meta num">
                        <span>n° {h.petition.id}</span>
                        <span>{formatMonth(h.petition.published)}</span>
                      </div>
                      <div className="row__body">
                        <p className={`row__via ${h.closeness === 'tres-proche' ? 'row__via--close' : ''}`}>
                          {h.closeness === 'tres-proche' ? 'Très proche de votre texte' : 'Même sujet'}
                        </p>
                        <h3 className="row__title"><Link to={`/petition/${h.petition.id}`}>{h.petition.title}</Link></h3>
                        {h.shared.length > 0 && (
                          <p className="row__excerpt"><span className="muted">Mots en commun avec votre texte : </span>{h.shared.join(', ')}</p>
                        )}
                        <div className="row__tags">
                          <StatusBadge status={h.petition.status} />
                          <span className="row__fact num">{formatVotes(h.petition.votes)}</span>
                          <span className="row__fact">{shortCommission(h.petition.commission)}</span>
                        </div>
                        <p className="write__row-links">
                          <a href={officialUrl(h.petition, core.meta)} target="_blank" rel="noopener noreferrer">
                            Voir sur le site officiel <ExternalLink size={13} aria-hidden="true" />
                            <span className="visually-hidden"> (s'ouvre dans un nouvel onglet)</span>
                          </a>
                        </p>
                      </div>
                      <div className="row__actions"><CompareButton id={h.petition.id} title={h.petition.title} compact /></div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <aside className="callout" aria-labelledby="pourquoi">
        <h2 id="pourquoi">Pourquoi cet outil existe</h2>
        <p>
          Ce que vous venez de faire prend quelques secondes. Le site officiel pourrait le proposer à chaque dépôt : avant de lancer une pétition, voir celles qui existent déjà, et
          rejoindre plutôt que disperser. Rien de cela n'est compliqué à construire aujourd'hui : l'Atlas a été fait en peu de temps, avec les données ouvertes de l'Assemblée nationale.
        </p>
        <p>
          C'est une expérimentation indépendante, sans affiliation institutionnelle. Elle ne permet pas de signer : pour soutenir une pétition, suivez le lien vers le site officiel. Elle sert à montrer
          ce que serait un espace où les idées proches se retrouvent.
        </p>
        <p>
          <Link to="/methode">Comment le rapprochement est calculé</Link> ·{' '}
          <a href={core.meta.official_site} target="_blank" rel="noopener noreferrer">Le site officiel des pétitions</a>
        </p>
      </aside>
    </div>
  );
}
