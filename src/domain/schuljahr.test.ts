import { describe, expect, it } from 'vitest';
import { hochzuzaehlendeSchueler, jahrgangHochzaehlen, lerngruppeFuersNeueSchuljahr, naechstesSchuljahr } from './schuljahr';
import type { Lerngruppe } from './typen';

const alt: Lerngruppe = {
  id: 'alt',
  name: '7a Mathe',
  fach: 'Mathe',
  schuljahr: '2026/27',
  beginnHj2: '2027-02-01',
  anteilHj1: 0.4,
  notenbereiche: [{ id: 'ka', name: 'Klassenarbeiten', gewicht: 60, art: 'nachweise' }],
  verhaltenskategorien: [{ id: 'k', name: 'stört', symbol: '⚡', positiv: false }],
  mitglieder: [
    { schuelerId: 'mia', ausgeschieden: false },
    { schuelerId: 'tom', ausgeschieden: true },
  ],
  sitzplan: { spalten: 2, reihen: 1, plaetze: [{ spalte: 0, reihe: 0, schuelerId: 'mia' }, { spalte: 1, reihe: 0 }], tafelOben: false },
  zeugnisnoten: { hj1: { mia: { note: 2 } }, jahr: { mia: { note: 2 } } },
  notizen: [{ id: 'n', schuelerId: 'mia', datum: '2026-10-01', text: 'Elterngespräch' }],
  archiviert: false,
  zuletztBenutzt: 1,
};

describe('naechstesSchuljahr', () => {
  it('zählt das Schuljahr weiter, auch über die Jahrhundertgrenze der Kurzform', () => {
    expect(naechstesSchuljahr('2026/27')).toBe('2027/28');
    expect(naechstesSchuljahr('2098/99')).toBe('2099/00');
    expect(naechstesSchuljahr('irgendwas')).toBe('irgendwas');
  });
});

describe('jahrgangHochzaehlen', () => {
  it('zählt die Jahrgangszahl hoch', () => {
    expect(jahrgangHochzaehlen('7a')).toBe('8a');
    expect(jahrgangHochzaehlen('9')).toBe('10');
    expect(jahrgangHochzaehlen('7a Mathe')).toBe('8a Mathe');
    expect(jahrgangHochzaehlen('WPK Französisch 7')).toBe('WPK Französisch 8');
  });

  it('lässt Texte ohne Jahrgang unverändert', () => {
    expect(jahrgangHochzaehlen('')).toBe('');
    expect(jahrgangHochzaehlen('Q1 Bio')).toBe('Q1 Bio');
    expect(jahrgangHochzaehlen('Chor')).toBe('Chor');
    expect(jahrgangHochzaehlen('7ab')).toBe('7ab');
  });
});

describe('lerngruppeFuersNeueSchuljahr', () => {
  let n = 0;
  const neu = lerngruppeFuersNeueSchuljahr(alt, ' 8a Mathe ', '2027/28', () => `id${++n}`, 99);

  it('übernimmt Schüler, Sitzplan, Notenbereiche und Verhaltenskategorien', () => {
    expect(neu).toMatchObject({
      name: '8a Mathe',
      fach: 'Mathe',
      schuljahr: '2027/28',
      beginnHj2: '2028-02-01',
      anteilHj1: 0.4,
      mitglieder: [{ schuelerId: 'mia', ausgeschieden: false }],
      sitzplan: alt.sitzplan,
      archiviert: false,
      zuletztBenutzt: 99,
    });
    expect(neu.notenbereiche).toEqual([{ id: expect.any(String), name: 'Klassenarbeiten', gewicht: 60, art: 'nachweise' }]);
    expect(neu.verhaltenskategorien.map((k) => k.name)).toEqual(['stört']);
  });

  it('beginnt ohne Zeugnisnoten und Notizen, mit eigenen Ids', () => {
    expect(neu.zeugnisnoten).toEqual({ hj1: {}, jahr: {} });
    expect(neu.notizen).toEqual([]);
    expect(neu.id).not.toBe(alt.id);
    expect(neu.notenbereiche[0].id).not.toBe('ka');
    expect(neu.verhaltenskategorien[0].id).not.toBe('k');
  });

  it('verändert die alte Lerngruppe nicht', () => {
    neu.sitzplan.plaetze[0].schuelerId = undefined;
    expect(alt.sitzplan.plaetze[0].schuelerId).toBe('mia');
  });
});

describe('hochzuzaehlendeSchueler', () => {
  it('zählt aktive Schüler nur einmal hoch, auch wenn mehrere Lerngruppen übernommen werden', () => {
    const englisch: Lerngruppe = { ...alt, id: 'en', schuljahr: '2027/28', mitglieder: [{ schuelerId: 'ben', ausgeschieden: false }] };
    const mitBen = { ...alt, mitglieder: [...alt.mitglieder, { schuelerId: 'ben', ausgeschieden: false }] };
    expect(hochzuzaehlendeSchueler(mitBen, [mitBen, englisch], '2027/28')).toEqual(['mia']);
  });
});
