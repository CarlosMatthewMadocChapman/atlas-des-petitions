// Pages HTML statiques de l'Atlas : une adresse réelle par pétition, constellation et thème.
//
// L'application est une page unique (navigation par #/…) : un moteur de recherche n'y voit qu'une
// adresse. Ces pages donnent à chaque pétition et à chaque sujet sa propre URL, lisible sans
// JavaScript, avec ses voisines, sa constellation et son lien vers la pétition officielle. L'application
// interactive reste la porte d'entrée complète (« Ouvrir dans l'Atlas »).
//
// Logique pure, sans dépendance : elle reçoit les données déjà chargées et renvoie du HTML.

export const STATUS_LABEL = { ouverte: 'Ouverte', archivee: 'Archivée', classee: 'Classée', expiree: 'Expirée', inconnu: 'Statut inconnu' };
export const RELATION_LABEL = {
  proche: 'Textes très proches',
  comparaison: 'Pistes de comparaison',
  complementaire: 'Propositions complémentaires',
  thematique: 'Même constellation',
};
const RELATION_ORDER = ['proche', 'comparaison', 'complementaire'];
const TYPE_BY_CODE = { p: 'proche', c: 'complementaire', o: 'comparaison', t: 'thematique' };

export const PAGE_SIZE = 100;
const MAX_TEXT = 900;
const MAX_NEIGHBORS = 6;
const TOP_SIGNED_PAGES = 100;

export const esc = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const squash = (text) => String(text ?? '').replace(/[\u200b\u200c\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim();

export function cut(text, max) {
  const clean = squash(text);
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max).replace(/\s+\S*$/, '');
  return `${head.replace(/[\s,;:.]+$/, '')}…`;
}

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatDate = (iso) => {
  if (!iso) return 'non renseignée';
  const d = new Date(String(iso).length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? 'non renseignée' : DATE.format(d);
};
const NUMBER = new Intl.NumberFormat('fr-FR');

/** Données prêtes à l'emploi à partir des fichiers JSON de l'Atlas. */
export function buildContext({ catalog, relations, dossiers, taxonomy, meta, details, origin, base, wave = Infinity }) {
  const petitions = catalog.rows.map((r) => ({
    id: r[0], title: r[1], excerpt: r[2], published: r[3], votes: r[4], status: r[5],
    commission: r[6] >= 0 ? catalog.commissions[r[6]] : null, legislature: r[7], themes: r[8], dossier: r[9], readOn: r[10] || null,
  }));
  const byId = new Map(petitions.map((p) => [p.id, p]));
  const adjacency = new Map();
  const push = (id, entry) => (adjacency.has(id) ? adjacency.get(id).push(entry) : adjacency.set(id, [entry]));
  const rank = { proche: 0, comparaison: 1, complementaire: 2, thematique: 3 };
  const edges = relations.edges.map(([a, b, code, score, terms, cues]) => ({ a, b, type: TYPE_BY_CODE[code] ?? relations.types[code], score: score / 1000, terms, cues }));
  for (const e of edges) {
    push(e.a, { id: e.b, ...e });
    push(e.b, { id: e.a, ...e });
  }
  for (const list of adjacency.values()) list.sort((x, y) => rank[x.type] - rank[y.type] || y.score - x.score);
  const themeById = new Map(taxonomy.map((t) => [t.id, t]));
  const dossierById = new Map(dossiers.map((d) => [d.id, d]));
  const base_ = base.endsWith('/') ? base : `${base}/`;
  const ctx = { petitions, byId, adjacency, dossiers, dossierById, taxonomy, themeById, meta, details, origin, base: base_, edges, published: new Set() };
  ctx.published = publishedSet(ctx, wave);
  return ctx;
}

/**
 * Ordre de publication des fiches statiques : d'abord les pétitions des plus grandes constellations
 * (les plus centrales en premier), puis les autres, de la plus soutenue à la moins soutenue.
 * Les fiches trop pauvres pour mériter une adresse (texte très court, aucune voisine) sont écartées.
 */
export function priorityOrder(ctx) {
  const seen = new Set();
  const order = [];
  const add = (id) => {
    if (!seen.has(id) && ctx.byId.has(id)) {
      seen.add(id);
      order.push(id);
    }
  };
  // Les plus signées ont toujours leur page, avant les grandes constellations.
  [...ctx.petitions].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1) || Number(a.id) - Number(b.id)).slice(0, TOP_SIGNED_PAGES).forEach((p) => add(p.id));
  for (const d of [...ctx.dossiers].sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))) d.members.forEach(add);
  [...ctx.petitions].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1) || Number(a.id) - Number(b.id)).forEach((p) => add(p.id));
  return order;
}

function publishedSet(ctx, wave) {
  const set = new Set();
  for (const id of priorityOrder(ctx)) {
    if (set.size >= wave) break;
    if (!isThin(ctx, ctx.byId.get(id))) set.add(id);
  }
  return set;
}

/** Adresse d'une pétition : sa fiche statique si elle existe, sinon l'application interactive. */
export const petitionHref = (ctx, id) => (ctx.published.has(id) ? urls.petition(ctx, id) : urls.app(ctx, `/petition/${id}`));

export const urls = {
  petition: (ctx, id) => `${ctx.base}p/${id}/`,
  constellation: (ctx, id) => `${ctx.base}c/${id}/`,
  theme: (ctx, id, page = 1) => (page > 1 ? `${ctx.base}t/${id}/${page}/` : `${ctx.base}t/${id}/`),
  app: (ctx, hash = '') => `${ctx.base}${hash ? `#${hash}` : ''}`,
  audit: (ctx) => `${ctx.base}audit/`,
};

/** Regroupe les textes très proches d'une constellation (même logique que src/lib/condense.ts). */
export function demandGroups(ctx, dossier) {
  const parent = new Map(dossier.members.map((m) => [m, m]));
  const find = (x) => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    parent.set(x, root);
    return root;
  };
  for (const id of dossier.members) {
    for (const n of ctx.adjacency.get(id) ?? []) if (n.type === 'proche' && parent.has(n.id)) parent.set(find(id), find(n.id));
  }
  const byRoot = new Map();
  for (const id of dossier.members) {
    const root = find(id);
    byRoot.set(root, [...(byRoot.get(root) ?? []), id]);
  }
  return [...byRoot.values()]
    .map((members) => ({ rep: members[0], members }))
    .sort((a, b) => b.members.length - a.members.length || dossier.members.indexOf(a.rep) - dossier.members.indexOf(b.rep));
}

const wordmark = (ctx) => `<a href="${esc(ctx.base)}" class="wordmark" aria-label="L'Atlas des pétitions — accueil"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><g stroke="currentColor" stroke-width="1.3" fill="none"><path d="M6 24 L15 9 L27 14 L21 27 Z"/><path d="M15 9 L21 27"/></g><circle cx="6" cy="24" r="2.6" fill="currentColor"/><circle cx="15" cy="9" r="2.6" fill="#c0361a"/><circle cx="27" cy="14" r="2.6" fill="currentColor"/><circle cx="21" cy="27" r="2.6" fill="currentColor"/></svg><span>L'Atlas <em>des pétitions</em></span></a>`;

function shell(ctx, { title, description, path, robots = 'index,follow', body, jsonLd, depth }) {
  const canonical = `${ctx.origin}${path}`;
  const image = `${ctx.origin}${ctx.base}partage-atlas.jpg`;
  const alt = 'Constellation de pétitions reliées entre elles, à côté du titre « Des milliers de propositions citoyennes, enfin reliées ».';
  const css = `${'../'.repeat(depth)}static.css`;
  const fullTitle = `${title} · L'Atlas des pétitions`;
  const ld = jsonLd ? `\n    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  const m = ctx.meta;
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="${robots}" />
    <meta name="theme-color" content="#f6f1e6" />
    <link rel="canonical" href="${esc(canonical)}" />
    <link rel="icon" type="image/svg+xml" href="${'../'.repeat(depth)}favicon.svg" />
    <link rel="stylesheet" href="${css}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:site_name" content="Radio du Futur" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:title" content="${esc(fullTitle)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(alt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <meta name="twitter:image:alt" content="${esc(alt)}" />${ld}
  </head>
  <body>
    <header class="header"><div class="container header__bar"><div class="header__identity">${wordmark(ctx)}<a class="header__origin" href="https://radiodufutur.com/">Un projet de Radio du Futur ↗</a></div><nav class="nav" aria-label="Navigation"><a href="${esc(ctx.base)}">Ouvrir l'Atlas interactif</a><a href="${esc(urls.app(ctx, '/ecrire'))}">Votre idée</a><a href="${esc(urls.app(ctx, '/methode'))}">Méthode et données</a></nav></div></header>
    <main class="main">
${body}
    </main>
    <footer class="footer"><div class="container"><p>Expérimentation indépendante, <strong>sans affiliation institutionnelle</strong> avec l'Assemblée nationale. On ne peut pas signer ici : chaque fiche renvoie vers la pétition officielle.</p><p>Créé par <strong>Carlos Chapman</strong> pour <a href="https://radiodufutur.com/">Radio du Futur</a>. <a href="https://radiodufutur.com/projets/">Explorer les projets</a> · <a href="https://radiodufutur.com/participer/">Participer</a> · <a href="https://suiteadonner.nucom.fr/">Suite à donner — suivi indépendant des pétitions</a>.</p><p class="muted">Données : Pétitions de l'Assemblée nationale, via <a href="${esc(m.dataset_page)}" rel="noopener">data.gouv.fr</a>, Licence Ouverte 2.0 · fichier du ${esc(formatDate(m.source.file_date ?? m.source.resource_last_modified))} · ${NUMBER.format(m.counts.petitions)} pétitions. Les soutiens sont ceux du fichier, pas un compteur en direct.</p></div></footer>
  </body>
</html>
`;
}

const officialUrl = (ctx, p) => ctx.meta.url_exceptions?.[p.id] || `${ctx.meta.official_site}/i-${p.id}`;

function themeLinks(ctx, ids) {
  return ids
    .map((id) => ctx.themeById.get(id))
    .filter(Boolean)
    .map((t) => `<a class="chip chip--link" href="${esc(urls.theme(ctx, t.id))}"><span class="dot" style="background:${esc(t.color)}" aria-hidden="true"></span>${esc(t.label)}</a>`)
    .join(' ');
}

function crumbs(ctx, items) {
  return `<nav class="crumbs" aria-label="Fil d'Ariane"><a href="${esc(ctx.base)}">Atlas</a>${items.map((i) => `<span aria-hidden="true">/</span>${i.href ? `<a href="${esc(i.href)}">${esc(i.label)}</a>` : `<span>${esc(i.label)}</span>`}`).join('')}</nav>`;
}

function breadcrumbLd(ctx, items) {
  const all = [{ label: "L'Atlas des pétitions", href: ctx.base }, ...items];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: all.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.label, ...(item.href ? { item: `${ctx.origin}${item.href}` } : {}),
    })),
  };
}

export function isThin(ctx, petition) {
  const detail = ctx.details(petition.id);
  const length = squash(detail?.d ?? petition.excerpt).length;
  return length < 80 && (ctx.adjacency.get(petition.id) ?? []).filter((n) => n.type !== 'thematique').length === 0;
}

export function renderPetition(ctx, p) {
  const detail = ctx.details(p.id);
  const text = cut(detail?.d ?? p.excerpt, MAX_TEXT);
  const dossier = p.dossier ? ctx.dossierById.get(p.dossier) : null;
  const theme = ctx.themeById.get(p.themes[0]);
  const trail = [
    ...(theme ? [{ label: theme.label, href: urls.theme(ctx, theme.id) }] : []),
    ...(dossier ? [{ label: dossier.terms.slice(0, 2).join(' · '), href: urls.constellation(ctx, dossier.id) }] : []),
    { label: `Pétition n° ${p.id}` },
  ];
  const path = urls.petition(ctx, p.id);
  const neighbors = (ctx.adjacency.get(p.id) ?? []).filter((n) => n.type !== 'thematique');
  const groups = RELATION_ORDER.map((type) => ({ type, items: neighbors.filter((n) => n.type === type).slice(0, MAX_NEIGHBORS) })).filter((g) => g.items.length);

  const neighborHtml = groups.length
    ? groups.map((g) => `<div class="neighbors"><h3>${esc(RELATION_LABEL[g.type])}</h3><ul class="plain-list">${g.items.map((n) => {
        const other = ctx.byId.get(n.id);
        if (!other) return '';
        const terms = n.terms?.length ? ` <span class="muted">— mots en commun : ${esc(n.terms.slice(0, 4).join(', '))}</span>` : '';
        return `<li><a href="${esc(petitionHref(ctx, other.id))}">${esc(other.title)}</a>${terms}</li>`;
      }).join('')}</ul></div>`).join('')
    : `<p class="muted">Aucune pétition suffisamment proche n'a été trouvée par le moteur. Cela ne signifie pas que le sujet est isolé : le moteur reste prudent.</p>`;

  const description = cut(`${p.title}. ${detail?.d ?? p.excerpt}`, 155);
  const body = `      <article class="container page petition">
        ${crumbs(ctx, trail)}
        <header class="petition__head">
          <p class="eyebrow num">Pétition n° ${esc(p.id)}</p>
          <h1>${esc(p.title)}</h1>
          <div class="petition__cta">
            <a class="btn btn--primary" href="${esc(officialUrl(ctx, p))}" target="_blank" rel="noopener noreferrer">Voir la pétition sur le site officiel ↗</a>
            <a class="btn btn--ghost" href="${esc(urls.app(ctx, `/petition/${p.id}`))}">Explorer dans l'Atlas interactif</a>
          </div>
          <p class="petition__warning">L'Atlas est un site indépendant : <strong>on ne peut pas y signer</strong>. La signature se fait uniquement sur le site officiel de l'Assemblée nationale.</p>
          <p class="source-note">Pour consulter les éventuelles suites parlementaires, <a href="https://suiteadonner.nucom.fr/petition/${encodeURIComponent(p.id)}" target="_blank" rel="noopener noreferrer">retrouver cette pétition sur « Suite à donner »</a> (observatoire indépendant).</p>
        </header>
        <div class="petition__layout">
          <div class="petition__main">
            <section aria-labelledby="faits"><h2 id="faits" class="section-title">Les faits du jeu de données</h2>
              <dl class="facts">
                <div><dt>Statut</dt><dd><span class="badge badge--${esc(p.status)}">${esc(STATUS_LABEL[p.status] ?? p.status)}</span></dd></div>
                <div><dt>Mise en ligne</dt><dd>${esc(formatDate(p.published))}</dd></div>
                <div><dt>Soutiens</dt><dd><span class="num">${p.votes === null ? 'non renseigné' : NUMBER.format(p.votes)}</span> <span class="muted">${p.readOn ? `lu sur le site officiel le ${esc(formatDate(p.readOn))}, cette pétition manque au fichier public ; ` : ''}au ${esc(formatDate(ctx.meta.source.file_date ?? ctx.meta.source.resource_last_modified))} — pas un compteur en direct</span></dd></div>
                <div><dt>Commission</dt><dd>${esc(p.commission ?? 'non renseignée')}</dd></div>
              </dl>
            </section>
            <section aria-labelledby="texte"><h2 id="texte" class="section-title">Texte de la pétition</h2>
              <p class="source-note">Début de la description publiée dans le jeu de données, sans modification. Elle peut être plus courte que le texte intégral, disponible sur le site officiel.</p>
              <div class="prose" lang="fr"><p>${esc(text)}</p></div>
            </section>
            <section aria-labelledby="voisines"><h2 id="voisines" class="section-title">Pétitions proches</h2>
              ${groups.length ? `<p class="source-note">Rapprochements calculés par le moteur (${esc(ctx.meta.algorithm.version)}). Deux pétitions proches peuvent défendre des demandes différentes ; leurs soutiens ne s'additionnent pas.</p>` : ''}
              ${neighborHtml}
            </section>
          </div>
          <aside class="petition__side" aria-label="Contexte">
            ${p.themes.length ? `<section><h2 class="section-title">Familles thématiques</h2><p class="muted">Catégorisation automatique, non officielle.</p><div class="row__themes">${themeLinks(ctx, p.themes)}</div></section>` : ''}
            ${dossier ? `<section><h2 class="section-title">Sa constellation</h2><p><strong>${esc(dossier.terms.slice(0, 3).join(' · '))}</strong> <span class="muted">— ${dossier.size} pétitions regroupées automatiquement.</span></p><p><a class="btn btn--ghost" href="${esc(urls.constellation(ctx, dossier.id))}">Voir la constellation</a></p></section>` : ''}
          </aside>
        </div>
      </article>`;
  return shell(ctx, {
    title: cut(p.title, 70), description, path, depth: 2, body,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'WebPage', name: p.title, description, url: `${ctx.origin}${path}`, inLanguage: 'fr',
      isPartOf: { '@type': 'WebSite', name: "L'Atlas des pétitions", url: `${ctx.origin}${ctx.base}` },
      ...(p.published ? { datePublished: p.published } : {}),
      breadcrumb: breadcrumbLd(ctx, trail.map((t, i) => (i === trail.length - 1 ? { label: t.label } : t))),
    },
  });
}

export function renderConstellation(ctx, d) {
  const groups = demandGroups(ctx, d);
  const theme = ctx.themeById.get(d.themes[0]);
  const label = d.terms.slice(0, 3).join(' · ') || d.label;
  const path = urls.constellation(ctx, d.id);
  const trail = [...(theme ? [{ label: theme.label, href: urls.theme(ctx, theme.id) }] : []), { label }];
  const demandItems = groups.map((g) => {
    const rep = ctx.byId.get(g.rep);
    if (!rep) return '';
    const more = g.members.length > 1
      ? `<span class="muted num"> — ×${g.members.length} textes très proches</span><ul class="plain-list">${g.members.slice(1, 6).map((m) => `<li><a href="${esc(petitionHref(ctx, m))}">${esc(ctx.byId.get(m)?.title ?? m)}</a></li>`).join('')}</ul>`
      : '';
    return `<li><a href="${esc(petitionHref(ctx, rep.id))}">${esc(rep.title)}</a>${more}</li>`;
  }).join('');
  const description = cut(`${d.size} pétitions de l'Assemblée nationale sur le même sujet (${d.terms.slice(0, 4).join(', ')}), regroupées en ${groups.length} demande${groups.length > 1 ? 's' : ''} distincte${groups.length > 1 ? 's' : ''}.`, 155);
  const body = `      <div class="container page">
        ${crumbs(ctx, trail)}
        <header class="page-head">
          <p class="eyebrow">Constellation automatique · ${esc(d.years[0] === d.years[1] ? d.years[0] : `${d.years[0]}–${d.years[1]}`)}</p>
          <h1>${esc(label)}</h1>
          <p class="lede">${d.size} pétitions regroupées parce que leurs textes se ressemblent. Elles ne défendent pas forcément la même position, et leurs soutiens ne s'additionnent pas.</p>
          <p class="petition__cta"><a class="btn btn--primary" href="${esc(urls.app(ctx, `/constellations/${d.id}`))}">Explorer la carte interactive</a></p>
        </header>
        <section class="synthesis" aria-labelledby="synthese"><h2 id="synthese" class="section-title">L'essentiel en trente secondes</h2>
          <div class="synthesis__grid">
            <div><h3 class="synthesis__label">Ce qu'elles ont en commun</h3><p class="synthesis__terms">${d.terms.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</p><p class="muted">Mots les plus caractéristiques, calculés automatiquement.</p></div>
            <div><h3 class="synthesis__label">Ce qui les distingue : ${groups.length} demande${groups.length > 1 ? 's' : ''}</h3><ol class="synthesis__demands">${demandItems}</ol></div>
          </div>
        </section>
        ${d.themes.length ? `<p class="row__themes">${themeLinks(ctx, d.themes)}</p>` : ''}
      </div>`;
  return shell(ctx, {
    title: `Constellation ${label}`, description, path, depth: 2, body,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Constellation ${label}`, description, url: `${ctx.origin}${path}`, inLanguage: 'fr', breadcrumb: breadcrumbLd(ctx, trail.map((t, i) => (i === trail.length - 1 ? { label: t.label } : t))) },
  });
}

export function themePages(ctx, theme) {
  // Famille principale seulement : la catégorisation est automatique, mieux vaut une liste courte et juste.
  const members = ctx.petitions.filter((p) => p.themes[0] === theme.id);
  members.sort((a, b) => (b.published ?? '').localeCompare(a.published ?? '') || Number(b.id) - Number(a.id));
  const pages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const dossiers = ctx.dossiers.filter((d) => d.themes[0] === theme.id).sort((a, b) => b.size - a.size).slice(0, 30);
  const out = [];
  for (let page = 1; page <= pages; page++) {
    const slice = members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const path = urls.theme(ctx, theme.id, page);
    const trail = [{ label: theme.label }];
    const nav = pages > 1
      ? `<nav class="pagination" aria-label="Pagination"><span>Page ${page} sur ${pages}</span>${page > 1 ? `<a class="btn btn--ghost" href="${esc(urls.theme(ctx, theme.id, page - 1))}">Précédente</a>` : ''}${page < pages ? `<a class="btn btn--ghost" href="${esc(urls.theme(ctx, theme.id, page + 1))}">Suivante</a>` : ''}</nav>`
      : '';
    const description = cut(`${members.length} pétitions de l'Assemblée nationale classées d'abord dans « ${theme.label} » : constellations, textes proches, liens vers les pétitions officielles.`, 155);
    const body = `      <div class="container page">
        ${crumbs(ctx, trail)}
        <header class="page-head">
          <p class="eyebrow">Famille thématique (automatique, non officielle)</p>
          <h1>${esc(theme.label)}</h1>
          <p class="lede">${NUMBER.format(members.length)} pétitions classées d'abord dans cette famille. Le classement est automatique : une pétition peut relever de plusieurs sujets, et le moteur peut se tromper.</p>
        </header>
        ${page === 1 && dossiers.length ? `<section aria-labelledby="constellations"><h2 id="constellations" class="section-title">Constellations</h2><ul class="plain-list">${dossiers.map((d) => `<li><a href="${esc(urls.constellation(ctx, d.id))}">${esc(d.terms.slice(0, 3).join(' · '))}</a> <span class="muted num">— ${d.size} pétitions</span></li>`).join('')}</ul></section>` : ''}
        <section aria-labelledby="liste"><h2 id="liste" class="section-title">Les pétitions</h2>
          <ul class="plain-list">${slice.map((p) => `<li><a href="${esc(petitionHref(ctx, p.id))}">${esc(p.title)}</a> <span class="muted num">— n° ${esc(p.id)}</span></li>`).join('')}</ul>
          ${nav}
        </section>
      </div>`;
    out.push({ path, html: shell(ctx, { title: `${theme.label}${page > 1 ? ` (page ${page})` : ''}`, description, path, depth: page > 1 ? 3 : 2, body }) });
  }
  return out;
}

/** Liens explorables ajoutés à l'index de l'application : sans eux, aucun lien ne mène aux pages statiques. */
export function crawlableIndex(ctx) {
  const themes = [...ctx.taxonomy].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return `<nav aria-label="Explorer par thème" style="font-family: Georgia, serif; padding: 2rem; max-width: 60rem"><h1>L'Atlas des pétitions</h1><p>Plus de quatre mille pétitions de l'Assemblée nationale, reliées par ce que disent leurs textes. Expérimentation indépendante.</p><ul>${themes.map((t) => `<li><a href="${esc(urls.theme(ctx, t.id))}">${esc(t.label)}</a></li>`).join('')}</ul></nav>`;
}

const auditInline = (text) => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const auditCells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());

/** Le sous-ensemble de Markdown que produit pipeline/ pour le rapport d'audit : titres, citations, listes, tableaux, paragraphes. */
export function auditMarkdownToHtml(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const html = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      // Le titre de premier niveau est déjà celui de la page.
      const level = heading[1].length;
      if (level > 1) html.push(`<h${level}>${auditInline(heading[2])}</h${level}>`);
    } else if (line.startsWith('|')) {
      const rows = [];
      while (lines[i]?.startsWith('|')) rows.push(auditCells(lines[i++]));
      i--;
      const [head, , ...body] = rows;
      html.push(`<div class="audit__table"><table><thead><tr>${head.map((c) => `<th scope="col">${auditInline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${auditInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (line.startsWith('- ')) {
      const items = [];
      while (lines[i]?.startsWith('- ')) items.push(lines[i++].slice(2));
      i--;
      html.push(`<ul>${items.map((item) => `<li>${auditInline(item)}</li>`).join('')}</ul>`);
    } else if (line.startsWith('> ')) {
      html.push(`<p class="muted">${auditInline(line.slice(2))}</p>`);
    } else {
      html.push(`<p>${auditInline(line)}</p>`);
    }
  }
  return html.join('\n');
}

/** Le rapport d'audit, publié avec le site et reconstruit à chaque mise à jour des données. */
export function renderAudit(ctx, markdown) {
  const path = urls.audit(ctx);
  const description = `Ce que contient réellement le fichier des pétitions de l'Assemblée nationale : volumes, statuts, soutiens, champs absents, doublons et limites.`;
  const body = `      <div class="container page">
        ${crumbs(ctx, [{ label: "Rapport d'audit" }])}
        <header class="page-head">
          <p class="eyebrow">Méthode et données</p>
          <h1>Rapport d'audit du catalogue</h1>
          <p class="lede">Généré automatiquement à chaque mise à jour. Il dit ce que le fichier contient, ce qui y manque et ce que le moteur n'a pas pu vérifier.</p>
        </header>
        <div class="prose audit">
${auditMarkdownToHtml(markdown)}
        </div>
      </div>`;
  return shell(ctx, {
    title: "Rapport d'audit du catalogue", description, path, depth: 1, body,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: "Rapport d'audit du catalogue", description, url: `${ctx.origin}${path}`, inLanguage: 'fr' },
  });
}

/** Toutes les pages : Map chemin -> HTML. */
export function buildAll(ctx) {
  const pages = new Map();
  for (const id of ctx.published) pages.set(urls.petition(ctx, id), renderPetition(ctx, ctx.byId.get(id)));
  for (const d of ctx.dossiers) pages.set(urls.constellation(ctx, d.id), renderConstellation(ctx, d));
  for (const theme of ctx.taxonomy) for (const page of themePages(ctx, theme)) pages.set(page.path, page.html);
  return pages;
}
