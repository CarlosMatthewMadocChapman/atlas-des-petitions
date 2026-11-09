/**
 * Normalisation du français — miroir de pipeline/atlas_pipeline/textnorm.py.
 * La parité est vérifiée par pipeline/fixtures/stem_cases.json (voir text.test.ts).
 */

const TAG_RE = /<[^>]+>/g;
const URL_RE = /https?:\/\/\S+|www\.\S+/g;
const WORD_RE = /[a-z]{3,}/g;

export function stripAccents(text: string): string {
  return text
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '');
}

export function fold(text: string): string {
  return stripAccents((text ?? '').toLowerCase().replace(/’/g, "'"));
}

export function cleanText(text: string): string {
  return (text ?? '').replace(TAG_RE, ' ').replace(URL_RE, ' ').replace(/\s+/g, ' ').trim();
}

const SUFFIXES = [
  'issements', 'issement', 'ations', 'ation', 'ateurs', 'ateur', 'atrices', 'atrice',
  'ements', 'ement', 'ences', 'ence', 'ances', 'ance', 'elles', 'elle', 'iennes',
  'ienne', 'euses', 'euse', 'ments', 'ment', 'ites', 'ite', 'ives', 'ive', 'ions',
  'ion', 'eurs', 'eur', 'ales', 'ale', 'aux', 'ees', 'ee', 'es', 's', 'x', 'e',
];
const MIN_STEM = 4;

export function stem(word: string): string {
  if (word.length <= MIN_STEM) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM) {
      const root = word.slice(0, -suffix.length);
      if (suffix === 'aux') return root + 'al';
      if (suffix === 'elles' || suffix === 'elle') return root + 'el';
      if (suffix === 'iennes' || suffix === 'ienne') return root + 'ien';
      return root;
    }
  }
  return word;
}

export function tokenize(text: string, stopwords: ReadonlySet<string>): string[] {
  const folded = fold(cleanText(text));
  return (folded.match(WORD_RE) ?? []).filter((w) => !stopwords.has(w));
}

export function stems(text: string, stopwords: ReadonlySet<string>): string[] {
  return tokenize(text, stopwords).map(stem);
}
