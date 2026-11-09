import { fold, stem } from './text';

export interface Segment {
  text: string;
  shared: boolean;
}

interface Word {
  start: number;
  end: number;
  key: string;
}

const NGRAM = 6;

function wordsOf(text: string): Word[] {
  const words: Word[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    words.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, key: fold(m[0]) });
  }
  return words;
}

/** Passages communs : suites d'au moins 6 mots identiques (hors accents et casse) présentes dans d'autres textes. */
export function sharedSegments(texts: string[]): { segments: Segment[][]; common: string[] } {
  const all = texts.map(wordsOf);
  const grams = all.map((words) => {
    const set = new Set<string>();
    for (let i = 0; i + NGRAM <= words.length; i++) set.add(words.slice(i, i + NGRAM).map((w) => w.key).join(' '));
    return set;
  });

  const covered = all.map((words, t) => {
    const mark = new Array<boolean>(words.length).fill(false);
    for (let i = 0; i + NGRAM <= words.length; i++) {
      const gram = words.slice(i, i + NGRAM).map((w) => w.key).join(' ');
      if (grams.some((g, other) => other !== t && g.has(gram))) for (let k = i; k < i + NGRAM; k++) mark[k] = true;
    }
    return mark;
  });

  const segments = texts.map((text, t) => {
    const out: Segment[] = [];
    let cursor = 0;
    let i = 0;
    const words = all[t];
    while (i < words.length) {
      if (!covered[t][i]) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < words.length && covered[t][j + 1]) j++;
      if (words[i].start > cursor) out.push({ text: text.slice(cursor, words[i].start), shared: false });
      out.push({ text: text.slice(words[i].start, words[j].end), shared: true });
      cursor = words[j].end;
      i = j + 1;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), shared: false });
    return out.length ? out : [{ text, shared: false }];
  });

  const common: string[] = [];
  const seen = new Set<string>();
  segments.forEach((segs) => {
    for (const seg of segs) {
      const key = fold(seg.text).replace(/\s+/g, ' ');
      if (seg.shared && !seen.has(key) && common.length < 5) {
        seen.add(key);
        common.push(seg.text);
      }
    }
  });
  return { segments, common };
}

/** Termes présents dans un texte et absents des autres, pour repérer ce qui distingue les demandes. */
export function distinctiveTerms(texts: string[], stopwords: ReadonlySet<string>, limit = 8): string[][] {
  const counts = texts.map((text) => {
    const map = new Map<string, { n: number; word: string }>();
    for (const m of text.matchAll(/[\p{L}]+/gu)) {
      const folded = fold(m[0]);
      if (folded.length < 5 || stopwords.has(folded)) continue;
      const s = stem(folded);
      const entry = map.get(s);
      if (entry) entry.n++;
      else map.set(s, { n: 1, word: folded });
    }
    return map;
  });
  return counts.map((own, t) => {
    const candidates: { word: string; n: number }[] = [];
    for (const [s, { n, word }] of own) {
      if (counts.some((other, o) => o !== t && other.has(s))) continue;
      candidates.push({ word, n });
    }
    return candidates.sort((a, b) => b.n - a.n || b.word.length - a.word.length).slice(0, limit).map((c) => c.word);
  });
}
