import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Base relative : l'application fonctionne telle quelle dans un sous-répertoire
// (GitHub Pages) comme à la racine, grâce à la navigation par fragment (#/).
export default defineConfig({
  base: process.env.ATLAS_BASE ?? './',
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
