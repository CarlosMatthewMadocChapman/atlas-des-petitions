import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Chaque chambre a son espace à part, construit séparément (scripts/build-site.mjs) :
// VITE_ATLAS_SOURCE choisit la chambre, ATLAS_PUBLIC_DIR le dossier des données (public/ ou senat/public/).
const SPACES = {
  an: { of: "de l'Assemblée nationale", title: "L'Atlas des pétitions", dir: '' },
  senat: { of: 'du Sénat', title: "L'Atlas des pétitions du Sénat", dir: 'senat/' },
  europe: { of: "de l'Initiative citoyenne européenne", title: "L'Atlas des initiatives européennes", dir: 'europe/' },
};
const space = SPACES[(process.env.VITE_ATLAS_SOURCE ?? 'an') as keyof typeof SPACES] ?? SPACES.an;
process.env.VITE_ATLAS_OF ??= space.of;
process.env.VITE_ATLAS_TITLE ??= space.title;
process.env.VITE_ATLAS_URL ??= `https://radiodufutur.com/atlas/${space.dir}`;

// Base relative : l'application fonctionne telle quelle dans un sous-répertoire
// (GitHub Pages) comme à la racine, grâce à la navigation par fragment (#/).
export default defineConfig({
  base: process.env.ATLAS_BASE ?? './',
  publicDir: process.env.ATLAS_PUBLIC_DIR ?? 'public',
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
});
