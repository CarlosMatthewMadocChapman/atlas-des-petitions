import type { Core } from './data';
import type { SearchEngine } from './search';
import { fold, stem } from './text';
import type { Petition } from './types';

export type Closeness = 'tres-proche' | 'meme-sujet';

export interface MatchHit {
  petition: Petition;
  /** Score relatif au meilleur résultat (0-1). Sert uniquement à classer. */
  relative: number;
  matched: number;
  /** Part des mots-clés de votre texte retrouvés dans la pétition (0-1). */
  coverage: number;
  closeness: Closeness;
  /** Mots de VOTRE texte que l'on retrouve dans la pétition (titre ou extrait). */
  shared: string[];
}

export interface MatchResult {
  terms: string[];
  hits: MatchHit[];
  themes: { id: string; share: number }[];
  dossier: { id: string; hitIds: string[] } | null;
  /** Nombre de pétitions que l'on peut qualifier de « très proches » de votre texte. */
  closeCount: number;
}

const MAX_HITS = 12;
const CLOSE_RELATIVE = 0.55;
const CLOSE_COVERAGE = 0.35;
const MIN_WORDS = 3;

export function wordCount(text: string): number {
  return (text.match(/\p{L}+/gu) ?? []).length;
}

export function isMatchable(text: string): boolean {
  return wordCount(text) >= MIN_WORDS;
}

/** Mots de l'utilisateur (dans sa propre graphie) dont le radical figure dans le texte de la pétition. */
export function sharedWords(userText: string, petitionText: string, stopwords: ReadonlySet<string>): string[] {
  const target = new Set<string>();
  for (const m of fold(petitionText).matchAll(/[a-z]{3,}/g)) target.add(stem(m[0]));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of userText.matchAll(/\p{L}{4,}/gu)) {
    const folded = fold(m[0]);
    const s = stem(folded);
    if (stopwords.has(folded) || seen.has(s) || !target.has(s)) continue;
    seen.add(s);
    out.push(m[0].toLowerCase());
    if (out.length >= 6) break;
  }
  return out;
}

export function matchText(core: Core, engine: SearchEngine, stopwords: ReadonlySet<string>, text: string): MatchResult {
  const { terms, hits: raw } = engine.similar(text);
  if (raw.length === 0) return { terms, hits: [], themes: [], dossier: null, closeCount: 0 };

  const top = raw[0].score;
  const hits: MatchHit[] = [];
  for (const h of raw) {
    const petition = core.byId.get(h.id);
    if (!petition) continue;
    const relative = h.score / top;
    const coverage = terms.length ? h.matched / Math.min(terms.length, 14) : 0;
    const closeness: Closeness = relative >= CLOSE_RELATIVE && coverage >= CLOSE_COVERAGE ? 'tres-proche' : 'meme-sujet';
    hits.push({
      petition, relative, matched: h.matched, coverage: Math.min(1, coverage), closeness,
      shared: sharedWords(text, `${petition.title} ${petition.excerpt}`, stopwords),
    });
    if (hits.length >= MAX_HITS) break;
  }

  const themeWeight = new Map<string, number>();
  let total = 0;
  for (const h of hits.slice(0, 10)) {
    for (const t of h.petition.themes) {
      themeWeight.set(t, (themeWeight.get(t) ?? 0) + h.relative);
      total += h.relative;
    }
  }
  const themes = [...themeWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, w]) => ({ id, share: total ? w / total : 0 }));

  const perDossier = new Map<string, string[]>();
  for (const h of hits.slice(0, 8)) {
    if (h.petition.dossier) perDossier.set(h.petition.dossier, [...(perDossier.get(h.petition.dossier) ?? []), h.petition.id]);
  }
  const best = [...perDossier.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const dossier = best && (best[1].length >= 2 || hits[0]?.petition.dossier === best[0]) ? { id: best[0], hitIds: best[1] } : null;

  return { terms, hits, themes, dossier, closeCount: hits.filter((h) => h.closeness === 'tres-proche').length };
}
