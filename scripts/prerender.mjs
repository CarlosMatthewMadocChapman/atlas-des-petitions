// Écrit les pages statiques (pétitions, constellations, thèmes) à côté de l'application construite.
//
//   node scripts/prerender.mjs [dossier-de-sortie]      (par défaut : ../public/atlas)
//
// À lancer après `vite build` : `npm run build:site` enchaîne les deux. Les données sont relues dans
// <sortie>/data/ : les pages reflètent exactement ce que l'application affiche.

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildAll, buildContext, crawlableIndex, renderAudit, urls } from './prerender-lib.mjs';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.resolve(root, process.argv[2] ?? '../public/atlas');
const origin = process.env.ATLAS_PUBLIC_ORIGIN ?? 'https://radiodufutur.com';
const base = process.env.ATLAS_PUBLIC_BASE ?? '/atlas/';

const readJson = async (name) => JSON.parse(await readFile(path.join(outDir, 'data', name), 'utf8'));

const [catalog, relations, dossiers, taxonomy, meta] = await Promise.all(
  ['catalog.json', 'relations.json', 'dossiers.json', 'taxonomy.json', 'meta.json'].map(readJson),
);

const shardCache = new Map();
const shards = new Map();
for (let shard = 0; shard <= Math.floor(Math.max(...catalog.rows.map((r) => Number(r[0]))) / meta.detail_shard); shard++) {
  try {
    shards.set(shard, await readJson(`details/${shard}.json`));
  } catch {
    /* tranche absente : les pages retombent sur l'extrait du catalogue */
  }
}
const details = (id) => {
  const shard = Math.floor(Number(id) / meta.detail_shard);
  if (!shardCache.has(shard)) shardCache.set(shard, shards.get(shard) ?? {});
  return shardCache.get(shard)[id];
};

// Vague de publication : nombre de fiches de pétitions écrites en pages statiques (static-pages.json).
// Le circuit de déploiement envoie chaque nouveau fichier un par un : on augmente la vague par étapes.
const wave = JSON.parse(await readFile(path.join(root, 'static-pages.json'), 'utf8')).petitions;
const ctx = buildContext({ catalog, relations, dossiers, taxonomy, meta, details, origin, base, wave });
const pages = buildAll(ctx);
pages.set(urls.audit(ctx), renderAudit(ctx, await readFile(path.join(root, 'docs/AUDIT-CATALOGUE.md'), 'utf8')));

// Pages périmées : on repart de zéro pour que les pétitions retirées du fichier disparaissent aussi.
for (const dir of ['p', 'c', 't', 'audit']) await rm(path.join(outDir, dir), { recursive: true, force: true });

for (const [route, html] of pages) {
  const file = path.join(outDir, route.slice(base.length), 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
}

// Feuille de style stable (adresse fixe) : les pages statiques ne dépendent pas du nom haché du build.
const styles = ['tokens', 'base', 'components', 'pages', 'write'];
const css = (await Promise.all(styles.map((name) => readFile(path.join(root, 'src/styles', `${name}.css`), 'utf8').catch(() => '')))).join('\n');
const fonts = [
  ['fraunces', 'Fraunces Variable', 'fraunces-latin-wght-normal.woff2'],
  ['instrument-sans', 'Instrument Sans Variable', 'instrument-sans-latin-wght-normal.woff2'],
];
await mkdir(path.join(outDir, 'fonts'), { recursive: true });
let fontFaces = '';
for (const [pkg, family, file] of fonts) {
  await copyFile(path.join(root, 'node_modules/@fontsource-variable', pkg, 'files', file), path.join(outDir, 'fonts', file));
  fontFaces += `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:100 900;src:url(fonts/${file}) format('woff2-variations');}\n`;
}
await writeFile(path.join(outDir, 'static.css'), `${fontFaces}${css}\n.footer .container{display:grid;gap:var(--s-3)}.petition__layout,.hero__grid{align-items:start}\n:root[data-ciel='nuit'] body::before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.45;background-image:radial-gradient(1.4px 1.4px at 12% 18%,rgb(255 214 158/.8),transparent 70%),radial-gradient(1px 1px at 84% 12%,rgb(214 224 245/.7),transparent 70%),radial-gradient(1.6px 1.6px at 71% 42%,rgb(150 176 226/.7),transparent 70%),radial-gradient(1px 1px at 28% 66%,rgb(214 224 245/.6),transparent 70%),radial-gradient(1.5px 1.5px at 92% 76%,rgb(255 214 158/.7),transparent 70%),radial-gradient(1px 1px at 46% 88%,rgb(214 224 245/.6),transparent 70%),radial-gradient(1.2px 1.2px at 6% 82%,rgb(150 176 226/.6),transparent 70%)}\n`, 'utf8');

// Liens explorables sur l'index de l'application : point d'entrée des robots vers les pages statiques.
const indexFile = path.join(outDir, 'index.html');
const index = await readFile(indexFile, 'utf8');
await writeFile(indexFile, index.replace(/(<div id="root">)[\s\S]*?(<\/div>\s*<noscript>)/, `$1\n      ${crawlableIndex(ctx)}\n    $2`), 'utf8');

const counts = { petitions: ctx.published.size, constellations: ctx.dossiers.length, pages: pages.size };
console.log(`Pages statiques : ${counts.pages} (${counts.petitions} fiches de pétitions sur ${ctx.petitions.length}, ${counts.constellations} constellations, thèmes et leurs pages).`);
