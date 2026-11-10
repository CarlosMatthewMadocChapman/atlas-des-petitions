import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditMarkdownToHtml, buildAll, buildContext, cut, crawlableIndex, demandGroups, esc, isThin, petitionHref, priorityOrder, renderAudit, renderPetition, urls,
} from './prerender-lib.mjs';

const data = (name) => JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data', name), 'utf8'));
const shards = new Map();
const details = (id) => {
  const shard = Math.floor(Number(id) / 200);
  if (!shards.has(shard)) shards.set(shard, data(`details/${shard}.json`));
  return shards.get(shard)[id];
};
const make = (wave) =>
  buildContext({
    catalog: data('catalog.json'), relations: data('relations.json'), dossiers: data('dossiers.json'), taxonomy: data('taxonomy.json'),
    meta: data('meta.json'), details, origin: 'https://exemple.test', base: '/atlas', wave,
  });

describe('pages statiques de l\'Atlas', () => {
  const ctx = make(150);
  const pages = buildAll(ctx);

  it('écrit une page par fiche publiée, par constellation et par thème', () => {
    expect(ctx.published.size).toBe(150);
    for (const id of ctx.published) expect(pages.has(urls.petition(ctx, id))).toBe(true);
    for (const d of ctx.dossiers) expect(pages.has(urls.constellation(ctx, d.id))).toBe(true);
    for (const t of ctx.taxonomy) expect(pages.has(urls.theme(ctx, t.id))).toBe(true);
  });

  it('commence par les plus signées, puis les grandes constellations, et écarte les fiches trop pauvres', () => {
    const order = priorityOrder(ctx);
    const signed = [...ctx.petitions].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1)).slice(0, 100).map((p) => p.id);
    expect(new Set(order.slice(0, 100))).toEqual(new Set(signed));
    for (const id of ctx.published) expect(isThin(ctx, ctx.byId.get(id))).toBe(false);
  });

  it('aucun lien interne ne mène à une page absente', () => {
    const known = new Set([...pages.keys()]);
    let checked = 0;
    for (const html of pages.values()) {
      for (const [, href] of html.matchAll(/href="(\/atlas\/[^"#]*)(?:#[^"]*)?"/g)) {
        if (/\.(css|svg|jpg)$/.test(href) || href === '/atlas/') continue;
        checked++;
        expect(known.has(href), href).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('une fiche non publiée renvoie vers l\'application, pas vers une page inexistante', () => {
    const unpublished = ctx.petitions.find((p) => !ctx.published.has(p.id));
    expect(petitionHref(ctx, unpublished.id)).toBe(`/atlas/#/petition/${unpublished.id}`);
    const published = [...ctx.published][0];
    expect(petitionHref(ctx, published)).toBe(`/atlas/p/${published}/`);
  });

  it('chaque fiche porte canonique, carte de partage, données structurées valides et lien officiel', () => {
    for (const id of [...ctx.published].slice(0, 40)) {
      const html = pages.get(urls.petition(ctx, id));
      expect(html).toContain(`<link rel="canonical" href="https://exemple.test/atlas/p/${id}/" />`);
      expect(html).toContain('property="og:image" content="https://exemple.test/atlas/partage-atlas.jpg"');
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('name="robots" content="index,follow"');
      expect(html).toContain(`petitions.assemblee-nationale.fr/initiatives/i-${id}`);
      expect(html).toContain('on ne peut pas y signer');
      const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      expect(ld['@type']).toBe('WebPage');
      expect(ld.breadcrumb.itemListElement.length).toBeGreaterThan(0);
      expect(html.match(/<title>([^<]*)<\/title>/)[1].length).toBeLessThan(120);
    }
  });

  it('échappe le contenu et ne casse pas sur un titre piégé', () => {
    expect(esc('<script>alert("x")</script> & co')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co');
    const real = ctx.byId.get([...ctx.published][0]);
    const html = renderPetition(ctx, { ...real, title: '<img src=x onerror=alert(1)> "titre"' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
    expect(cut('un deux trois quatre cinq', 12)).toBe('un deux…');
  });

  it('regroupe chaque constellation en demandes qui la partitionnent', () => {
    for (const d of ctx.dossiers.slice(0, 100)) {
      const groups = demandGroups(ctx, d);
      expect(groups.flatMap((g) => g.members).sort()).toEqual([...d.members].sort());
      for (const g of groups) expect(g.members[0]).toBe(g.rep);
    }
  });

  it('l\'index de l\'application expose un lien par thème aux robots', () => {
    const html = crawlableIndex(ctx);
    for (const t of ctx.taxonomy) expect(html).toContain(`href="/atlas/t/${t.id}/"`);
  });

  it('une vague plus large ne retire aucune fiche déjà publiée', () => {
    const wider = make(300);
    for (const id of ctx.published) expect(wider.published.has(id)).toBe(true);
  });
});

describe("rapport d'audit", () => {
  const ctx = make(10);
  const markdown = readFileSync(resolve(import.meta.dirname, '../docs/AUDIT-CATALOGUE.md'), 'utf8');

  it('rend titres, listes, tableaux et échappe le texte', () => {
    const html = auditMarkdownToHtml('# Titre\n\n## Section\n\n- **gras** et `code`\n\n| A | B |\n| --- | --- |\n| 1 | <x> |\n');
    expect(html).not.toContain('Titre');
    expect(html).toContain('<h2>Section</h2>');
    expect(html).toContain('<li><strong>gras</strong> et <code>code</code></li>');
    expect(html).toContain('<th scope="col">A</th>');
    expect(html).toContain('<td>&lt;x&gt;</td>');
    expect(html).not.toContain('---');
  });

  it("publie le vrai rapport à l'adresse fixe, sans syntaxe Markdown résiduelle", () => {
    const html = renderAudit(ctx, markdown);
    expect(urls.audit(ctx)).toBe(`${ctx.base}audit/`);
    expect(html).toContain("Rapport d'audit du catalogue");
    expect(html).toContain('<table>');
    expect(html).not.toMatch(/\*\*|\|\s*---/);
  });
});
