// Construit la version publiée de l'Atlas, une chambre après l'autre, chacune dans son espace à part :
//
//   node scripts/build-site.mjs [an|senat|europe|all]      (par défaut : all)
//
//   Assemblée nationale → ../public/atlas/         (données : public/data, audit : docs/)
//   Sénat               → ../public/atlas/senat/   (données : senat/public/data, audit : senat/docs/)
//   Europe (ICE)        → ../public/atlas/europe/  (données : europe/public/data, audit : europe/docs/)
//
// L'espace de l'Assemblée est vidé avant chaque build, sauf senat/ et europe/ qui appartiennent aux autres espaces.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.resolve(root, '../public/atlas');

const SPACES = {
  an: { out: site, publicDir: 'public', sourceRoot: '.', base: '/atlas/', keep: ['senat', 'europe'] },
  senat: { out: path.join(site, 'senat'), publicDir: 'senat/public', sourceRoot: 'senat', base: '/atlas/senat/', keep: [] },
  europe: { out: path.join(site, 'europe'), publicDir: 'europe/public', sourceRoot: 'europe', base: '/atlas/europe/', keep: [] },
};

function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function empty(dir, keep) {
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir)) {
    if (!keep.includes(entry)) await rm(path.join(dir, entry), { recursive: true, force: true });
  }
}

const wanted = process.argv[2] ?? 'all';
const ids = wanted === 'all' ? Object.keys(SPACES) : [wanted];
for (const id of ids) {
  const space = SPACES[id];
  if (!space) {
    console.error(`Chambre inconnue : ${id} (an, senat ou all).`);
    process.exit(2);
  }
  if (!existsSync(path.join(root, space.publicDir, 'data', 'meta.json'))) {
    console.log(`${id} : pas encore de catalogue (${space.publicDir}/data), espace non construit.`);
    continue;
  }
  const env = { VITE_ATLAS_SOURCE: id, ATLAS_PUBLIC_DIR: space.publicDir, ATLAS_PUBLIC_BASE: space.base, ATLAS_SOURCE_ROOT: space.sourceRoot };
  await empty(space.out, space.keep);
  run('npx', ['vite', 'build', '--outDir', space.out], env);
  run('node', ['scripts/prerender.mjs', space.out], env);
}
