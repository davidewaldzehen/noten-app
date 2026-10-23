import { describe, expect, it } from 'vitest';
import {
  berechneNoten,
  fachnote,
  istGrenzfall,
  jahresnote,
  muendlicheNote,
  nachweisNote,
  parseNote,
  rundungsvorschlag,
} from './noten';
import { STANDARD_EINSTELLUNGEN, type Leistungsnachweis, type Lerngruppe, type Stunde } from './typen';

const stufenNoten = STANDARD_EINSTELLUNGEN.stufenNoten;

function stunde(datum: string, eindruecke: Stunde['eindruecke'], gewicht = 1): Stunde {
  return { id: datum + Math.random(), lerngruppeId: 'lg', datum, gewicht, abgeschlossen: true, eindruecke };
}

function nachweis(datum: string, notenbereichId: string, noten: Record<string, string>, gewicht = 1): Leistungsnachweis {
  return { id: datum, lerngruppeId: 'lg', notenbereichId, titel: 'KA', datum, gewicht, noten };
}

const lerngruppe: Lerngruppe = {
  id: 'lg',
  name: '7a Mathe',
  fach: 'Mathe',
  schuljahr: '2026/27',
  beginnHj2: '2027-02-01',
  anteilHj1: 0.5,
  notenbereiche: [
    { id: 'ka', name: 'Klassenarbeiten', gewicht: 50, art: 'nachweise' },
    { id: 'm', name: 'Mündliche Note', gewicht: 50, art: 'muendlich' },
  ],
  verhaltenskategorien: [],
  mitglieder: [],
  sitzplan: { spalten: 1, reihen: 1, plaetze: [], tafelOben: true },
  zeugnisnoten: { hj1: {}, jahr: {} },
  archiviert: false,
  zuletztBenutzt: 0,
};

describe('parseNote', () => {
  it('liest ganze Noten und Tendenzen', () => {
    expect(parseNote('2')).toBe(2);
    expect(parseNote('2-')).toBe(2.3);
    expect(parseNote('2+')).toBe(1.7);
    expect(parseNote(' 3− ')).toBe(3.3);
    expect(parseNote('2,5')).toBe(2.5);
  });

  it('begrenzt auf 1 bis 6', () => {
    expect(parseNote('1+')).toBe(1);
    expect(parseNote('6-')).toBe(6);
  });

  it('unterscheidet leer und ungültig', () => {
    expect(parseNote('')).toBeUndefined();
    expect(parseNote(undefined)).toBeUndefined();
    expect(parseNote('7')).toBeNull();
    expect(parseNote('gut')).toBeNull();
    expect(parseNote('6,5')).toBeNull();
  });
});

describe('muendlicheNote', () => {
  it('stiller Schüler mit nur ○ steht auf 3', () => {
    const stunden = [stunde('2026-09-01', { mia: { art: 'stufe', stufe: 'o' } }), stunde('2026-09-02', { mia: { art: 'stufe', stufe: 'o' } })];
    expect(muendlicheNote(stunden, 'mia', stufenNoten)).toBe(3);
  });

  it('abwesend und ohne Eindruck zählen nicht', () => {
    const stunden = [
      stunde('2026-09-01', { mia: { art: 'stufe', stufe: '+' } }),
      stunde('2026-09-02', { mia: { art: 'abwesend' } }),
      stunde('2026-09-03', { mia: { art: 'ohne' } }),
    ];
    expect(muendlicheNote(stunden, 'mia', stufenNoten)).toBe(2);
  });

  it('Doppelstunde zählt doppelt', () => {
    const stunden = [stunde('2026-09-01', { tom: { art: 'stufe', stufe: '++' } }, 2), stunde('2026-09-02', { tom: { art: 'stufe', stufe: 'o' } })];
    expect(muendlicheNote(stunden, 'tom', stufenNoten)).toBeCloseTo(5 / 3);
  });

  it('offene Stunden zählen nicht', () => {
    const offen = { ...stunde('2026-09-01', { tom: { art: 'stufe', stufe: '--' } }), abgeschlossen: false };
    expect(muendlicheNote([offen], 'tom', stufenNoten)).toBeUndefined();
  });
});

describe('nachweisNote', () => {
  it('gewichtet einzelne Leistungsnachweise und ignoriert fehlende', () => {
    const n = [nachweis('2026-09-10', 'ka', { a: '2' }, 1), nachweis('2026-10-10', 'ka', { a: '4' }, 0.5), nachweis('2026-10-20', 'ka', {})];
    expect(nachweisNote(n, 'a')).toBeCloseTo((2 + 2) / 1.5);
  });
});

describe('fachnote', () => {
  it('rechnet fehlende Bereiche heraus', () => {
    expect(fachnote([{ gewicht: 40, note: 2 }, { gewicht: 45, note: undefined }, { gewicht: 15, note: 4 }])).toBeCloseTo((80 + 60) / 55);
  });

  it('ohne jede Note gibt es keine Fachnote', () => {
    expect(fachnote([{ gewicht: 50, note: undefined }])).toBeUndefined();
  });
});

describe('jahresnote', () => {
  it('Jonas: 4 im 1. Halbjahr, 2 im 2. Halbjahr', () => {
    expect(jahresnote(4, 2, 0.5)).toBe(3);
    expect(jahresnote(4, 2, 1 / 3)).toBeCloseTo(2.667, 3);
  });

  it('nimmt das vorhandene Halbjahr, wenn eins fehlt', () => {
    expect(jahresnote(undefined, 2, 0.5)).toBe(2);
    expect(jahresnote(3, undefined, 0.5)).toBe(3);
  });
});

describe('berechneNoten', () => {
  it('trennt die Halbjahre am Beginn des 2. Halbjahres', () => {
    const stunden = [stunde('2027-01-31', { a: { art: 'stufe', stufe: '++' } }), stunde('2027-02-01', { a: { art: 'stufe', stufe: '-' } })];
    const nachweise = [nachweis('2026-11-01', 'ka', { a: '3' }), nachweis('2027-03-01', 'ka', { a: '2' })];
    const e = berechneNoten(lerngruppe, stunden, nachweise, stufenNoten, 'a');
    expect(e.hj1.bereiche).toEqual({ ka: 3, m: 1 });
    expect(e.hj1.fachnote).toBe(2);
    expect(e.hj2.bereiche).toEqual({ ka: 2, m: 4 });
    expect(e.hj2.fachnote).toBe(3);
    expect(e.jahr).toBe(2.5);
  });
});

describe('Zeugnisnoten-Vorschlag', () => {
  it('rundet x,5 zur schlechteren Note', () => {
    expect(rundungsvorschlag(2.49)).toBe(2);
    expect(rundungsvorschlag(2.5)).toBe(3);
    expect(rundungsvorschlag(2.52)).toBe(3);
    expect(rundungsvorschlag(1.2)).toBe(1);
  });

  it('markiert Grenzfälle von x,4 bis x,6', () => {
    expect(istGrenzfall(2.52, 0.1)).toBe(true);
    expect(istGrenzfall(2.4, 0.1)).toBe(true);
    expect(istGrenzfall(2.6, 0.1)).toBe(true);
    expect(istGrenzfall(2.39, 0.1)).toBe(false);
    expect(istGrenzfall(2.0, 0.1)).toBe(false);
  });
});
