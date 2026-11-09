import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanText, fold, stem, stems, stripAccents, tokenize } from './text';

describe('normalisation du français', () => {
  it('replie les accents et la casse', () => {
    expect(stripAccents('Éléphant œuvre à l’île')).toBe('Elephant oeuvre a l’ile');
    expect(fold('RÉFÉRENDUM d’initiative')).toBe("referendum d'initiative");
  });

  it('retire balises et adresses sans toucher au texte', () => {
    expect(cleanText('<p>Bonjour</p> https://exemple.fr/x fin')).toBe('Bonjour fin');
  });

  it('ignore les mots-outils fournis par le pipeline', () => {
    const stop = new Set(['pour', 'les', 'des']);
    expect(tokenize('Pour les médias des régions', stop)).toEqual(['medias', 'regions']);
  });

  it('rapproche pluriels et féminins', () => {
    expect(stem('medias')).toBe(stem('media'));
    expect(stem('audiovisuelle')).toBe(stem('audiovisuel'));
    expect(stem('nationaux')).toBe('national');
    expect(stems('Les chaînes', new Set(['les']))).toEqual([stem('chaines')]);
  });

  it('donne les mêmes radicaux que le pipeline Python (fixture partagée)', () => {
    const file = resolve(__dirname, '../../pipeline/fixtures/stem_cases.json');
    const cases: [string, string][] = JSON.parse(readFileSync(file, 'utf-8')).cases;
    expect(cases.length).toBeGreaterThan(10);
    for (const [word, expected] of cases) expect(stem(stripAccents(word.toLowerCase())), word).toBe(expected);
  });
});
