import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Chaque chambre a son espace à part, construit séparément (scripts/build-site.mjs) :
// VITE_ATLAS_SOURCE choisit la chambre, ATLAS_PUBLIC_DIR le dossier des données (public/ ou senat/public/).
const senat = process.env.VITE_ATLAS_SOURCE === 'senat';
process.env.VITE_ATLAS_OF ??= senat ? 'du Sénat' : "de l'Assemblée nationale";
process.env.VITE_ATLAS_TITLE ??= senat ? "L'Atlas des pétitions du Sénat" : "L'Atlas des pétitions";
process.env.VITE_ATLAS_URL ??= senat ? 'https://radiodufutur.com/atlas/senat/' : 'https://radiodufutur.com/atlas/';

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
