import { describe, expect, it } from 'vitest';
import { ANORDNUNGEN, anzeigenamen, normalisiere, schluessel, sitzplanAus, verschiebe, verteile } from './sitzplan';
import type { Sitzplan } from './typen';

describe('sitzplanAus', () => {
  const mitPlaetzen = ANORDNUNGEN.filter((a) => a.id !== 'leer');

  it.each(mitPlaetzen.flatMap((a) => [5, 13, 24, 26, 30, 33, 45].map((n) => [a.id, n] as const)))(
    '%s mit %i Plätzen: genau so viele, ohne Doppelungen, im Plan',
    (anordnung, n) => {
      const plan = sitzplanAus(anordnung, n);
      expect(plan.plaetze).toHaveLength(n);
      expect(new Set(plan.plaetze.map(schluessel)).size).toBe(n);
      for (const p of plan.plaetze) {
        expect(p.spalte).toBeGreaterThanOrEqual(0);
        expect(p.reihe).toBeGreaterThanOrEqual(0);
        expect(p.spalte).toBeLessThan(plan.spalten);
        expect(p.reihe).toBeLessThan(plan.reihen);
      }
    },
  );

  it('Reihen: 30 Plätze als 5 Reihen à 3 Zweiertische', () => {
    const plan = sitzplanAus('reihen', 30);
    expect([plan.spalten, plan.reihen]).toEqual([8, 5]);
  });

  it('U-Form ist zur Tafel hin offen', () => {
    const plan = sitzplanAus('u-form', 24);
    const vorne = plan.plaetze.filter((p) => p.reihe === 0).map((p) => p.spalte);
    expect(vorne).toEqual([0, plan.spalten - 1]);
  });

  it('Leer hat keine Plätze, aber eine Zeichenfläche', () => {
    const plan = sitzplanAus('leer', 30);
    expect(plan.plaetze).toHaveLength(0);
    expect(plan.spalten).toBeGreaterThan(0);
  });
});

describe('normalisiere', () => {
  it('schiebt den Plan an den Ursprung und passt die Größe an', () => {
    const plan: Sitzplan = {
      spalten: 3,
      reihen: 3,
      plaetze: [
        { spalte: -1, reihe: 2 },
        { spalte: 3, reihe: 4 },
      ],
      tafelOben: true,
    };
    normalisiere(plan);
    expect(plan.plaetze.map(schluessel)).toEqual(['0|0', '4|2']);
    expect([plan.spalten, plan.reihen]).toEqual([5, 3]);
  });
});

describe('verschiebe', () => {
  const plan = (): Sitzplan => ({
    spalten: 3,
    reihen: 1,
    plaetze: [
      { spalte: 0, reihe: 0, schuelerId: 'a' },
      { spalte: 1, reihe: 0, schuelerId: 'b' },
      { spalte: 2, reihe: 0 },
    ],
    tafelOben: true,
  });

  it('verschiebt eine Gruppe mitsamt Schülern, auch über sich selbst hinweg', () => {
    const p = plan();
    p.plaetze.pop();
    const neu = verschiebe(p, new Set(['0|0', '1|0']), 1, 0);
    expect(neu).not.toBeNull();
    // Nach dem Normalisieren liegt der Plan wieder bei 0.
    expect(p.plaetze.map((x) => [schluessel(x), x.schuelerId])).toEqual([
      ['0|0', 'a'],
      ['1|0', 'b'],
    ]);
  });

  it('blockiert, wenn ein nicht gewählter Platz im Weg ist', () => {
    const p = plan();
    expect(verschiebe(p, new Set(['1|0']), 1, 0)).toBeNull();
    expect(p.plaetze[1].spalte).toBe(1);
  });

  it('liefert die neuen Schlüssel der Auswahl', () => {
    const p = plan();
    expect([...verschiebe(p, new Set(['2|0']), 0, 1)!]).toEqual(['2|1']);
    expect(p.reihen).toBe(2);
  });
});

describe('verteile', () => {
  it('füllt freie Plätze von vorne nach hinten', () => {
    const plan = verteile(sitzplanAus('reihen', 30), ['a', 'b']);
    const besetzt = plan.plaetze.filter((p) => p.schuelerId);
    expect(besetzt.map((p) => [p.reihe, p.spalte, p.schuelerId])).toEqual([
      [0, 0, 'a'],
      [0, 1, 'b'],
    ]);
  });
});

describe('anzeigenamen', () => {
  it('zeigt Vornamen und bei Gleichheit das Initial', () => {
    const namen = anzeigenamen([
      { id: '1', vorname: 'Leon', nachname: 'Becker', klasse: '7a' },
      { id: '2', vorname: 'Leon', nachname: 'Schulz', klasse: '7a' },
      { id: '3', vorname: 'Mia', nachname: 'Wolf', klasse: '7a' },
    ]);
    expect([...namen.values()]).toEqual(['Leon B.', 'Leon S.', 'Mia']);
  });
});
