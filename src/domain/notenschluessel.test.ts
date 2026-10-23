import { describe, expect, it } from 'vitest';
import { grenzenGueltig, lesePunkte, mindestpunkte, noteAusProzent, noteAusPunkten, notenAusPunkten, stufengrenzen } from './notenschluessel';
import { STANDARD_NOTENSCHLUESSEL } from './typen';

const standard = STANDARD_NOTENSCHLUESSEL;
const ganz = { ...standard, tendenzen: false };

describe('noteAusProzent ohne Tendenzen', () => {
  it('die Grenze muss exakt erreicht werden', () => {
    expect(noteAusProzent(100, ganz)).toBe('1');
    expect(noteAusProzent(92, ganz)).toBe('1');
    expect(noteAusProzent(91.9, ganz)).toBe('2');
    expect(noteAusProzent(81, ganz)).toBe('2');
    expect(noteAusProzent(67, ganz)).toBe('3');
    expect(noteAusProzent(50, ganz)).toBe('4');
    expect(noteAusProzent(49.99, ganz)).toBe('5');
    expect(noteAusProzent(30, ganz)).toBe('5');
    expect(noteAusProzent(29.9, ganz)).toBe('6');
    expect(noteAusProzent(0, ganz)).toBe('6');
  });
});

describe('Tendenzen', () => {
  it('drittelt jeden Notenbereich', () => {
    // 2 reicht von 81 bis unter 92: Drittel = 11/3.
    expect(noteAusProzent(92 - 11 / 3, standard)).toBe('2+');
    expect(noteAusProzent(88.3, standard)).toBe('2');
    expect(noteAusProzent(81 + 11 / 3, standard)).toBe('2');
    expect(noteAusProzent(84.6, standard)).toBe('2-');
    expect(noteAusProzent(81, standard)).toBe('2-');
  });

  it('kennt kein 1+ und kein 6−', () => {
    expect(noteAusProzent(100, standard)).toBe('1');
    expect(noteAusProzent(92, standard)).toBe('1-');
    expect(noteAusProzent(20, standard)).toBe('6+');
    expect(noteAusProzent(0, standard)).toBe('6');
    expect(stufengrenzen(standard).map((g) => g.note)).toEqual([
      '1', '1-', '2+', '2', '2-', '3+', '3', '3-', '4+', '4', '4-', '5+', '5', '5-', '6+', '6',
    ]);
  });
});

describe('Punkte', () => {
  it('rechnet Punkte über Prozent in die Note um, ohne Rundungsfehler an der Grenze', () => {
    expect(noteAusPunkten(46, 50, ganz)).toBe('1');
    expect(noteAusPunkten(45.5, 50, ganz)).toBe('2');
    expect(noteAusPunkten(33.5, 50, ganz)).toBe('3');
    expect(noteAusPunkten(25, 50, ganz)).toBe('4');
  });

  it('Mindestpunkte werden auf halbe Punkte aufgerundet', () => {
    expect(mindestpunkte(92, 50)).toBe(46);
    expect(mindestpunkte(67, 50)).toBe(33.5);
    expect(mindestpunkte(81, 37)).toBe(30);
    expect(mindestpunkte(0, 37)).toBe(0);
    for (const g of stufengrenzen(standard)) {
      const p = mindestpunkte(g.ab, 37);
      expect(noteAusPunkten(p, 37, standard)).toBe(g.note);
    }
  });

  it('liest halbe Punkte bis zur Höchstpunktzahl', () => {
    expect(lesePunkte('23,5', 40)).toBe(23.5);
    expect(lesePunkte(' 40 ', 40)).toBe(40);
    expect(lesePunkte('', 40)).toBeUndefined();
    expect(lesePunkte('23,25', 40)).toBeNull();
    expect(lesePunkte('41', 40)).toBeNull();
    expect(lesePunkte('-1', 40)).toBeNull();
    expect(lesePunkte('zwölf', 40)).toBeNull();
  });

  it('berechnet die Noten aller Schüler, ungültige Punkte ergeben keine Note', () => {
    expect(notenAusPunkten({ max: 50, schluessel: ganz, werte: { a: '46', b: '24,5', c: '', d: '51' } })).toEqual({ a: '1', b: '5' });
  });
});

describe('grenzenGueltig', () => {
  it('verlangt fünf streng fallende Prozentwerte', () => {
    expect(grenzenGueltig([92, 81, 67, 50, 30])).toBe(true);
    expect(grenzenGueltig([92, 81, 67, 50])).toBe(false);
    expect(grenzenGueltig([92, 81, 81, 50, 30])).toBe(false);
    expect(grenzenGueltig([101, 81, 67, 50, 30])).toBe(false);
    expect(grenzenGueltig([92, 81, 67, 50, 0])).toBe(false);
    expect(grenzenGueltig('92')).toBe(false);
  });
});
