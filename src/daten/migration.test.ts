import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN, type Lerngruppe } from '../domain/typen';
import { aufAktuellenStand, DATENVERSION, DatenFehler, versionVon } from './migration';
import type { Datenstand } from './sicherung';

const lerngruppe: Lerngruppe = {
  id: 'lg',
  name: '7a Mathe',
  fach: 'Mathe',
  schuljahr: '2026/27',
  beginnHj2: '2027-02-01',
  anteilHj1: 0.5,
  notenbereiche: [{ id: 'm', name: 'Mündliche Note', gewicht: 50, art: 'muendlich' }],
  verhaltenskategorien: [{ id: 'k', name: 'stört', symbol: '⚡', positiv: false }],
  mitglieder: [{ schuelerId: 's', ausgeschieden: false }],
  sitzplan: { spalten: 1, reihen: 1, plaetze: [{ spalte: 0, reihe: 0, schuelerId: 's' }], tafelOben: false },
  zeugnisnoten: { hj1: { s: { note: 2 } }, jahr: {} },
  archiviert: false,
  zuletztBenutzt: 5,
};

const stand: Datenstand = {
  schueler: [{ id: 's', vorname: 'Mia', nachname: 'Wolf', klasse: '7a' }],
  lerngruppen: [lerngruppe],
  stunden: [{ id: 'st', lerngruppeId: 'lg', datum: '2026-10-20', gewicht: 2, abgeschlossen: true, eindruecke: { s: { art: 'stufe', stufe: '+' } } }],
  beobachtungen: [{ id: 'b', stundeId: 'st', lerngruppeId: 'lg', schuelerId: 's', zeit: 1, art: 'leistung', stufe: '+' }],
  nachweise: [{ id: 'n', lerngruppeId: 'lg', notenbereichId: 'ka', titel: 'KA 1', datum: '2026-10-21', gewicht: 1, noten: { s: '2-' } }],
  einstellungen: { ...STANDARD_EINSTELLUNGEN, letzteSicherung: 99 },
  fachvorlagen: [],
};

describe('aufAktuellenStand', () => {
  it('lässt einen vollständigen, aktuellen Datenstand unverändert', () => {
    expect(aufAktuellenStand(stand, DATENVERSION)).toEqual(stand);
  });

  it('verändert die übergebenen Daten nicht', () => {
    const roh = structuredClone(stand) as unknown as Record<string, unknown>;
    delete (roh.lerngruppen as Record<string, unknown>[])[0].zeugnisnoten;
    const kopie = structuredClone(roh);
    aufAktuellenStand(roh, DATENVERSION);
    expect(roh).toEqual(kopie);
  });

  it('ergänzt fehlende Felder und behält unbekannte', () => {
    const roh = {
      ...stand,
      lerngruppen: [{ id: 'lg', name: 'Alt', schuljahr: '2025/26', extra: 'bleibt' }],
      stunden: [{ id: 'st', lerngruppeId: 'lg', datum: '2026-10-20' }],
      einstellungen: undefined,
      fachvorlagen: undefined,
    };
    const neu = aufAktuellenStand(roh, 1);
    const lg = neu.lerngruppen[0];
    expect(lg).toMatchObject({
      name: 'Alt',
      fach: '',
      beginnHj2: '2026-02-01',
      anteilHj1: 0.5,
      notenbereiche: [],
      mitglieder: [],
      zeugnisnoten: { hj1: {}, jahr: {} },
      archiviert: false,
      extra: 'bleibt',
    });
    expect(lg.sitzplan.plaetze).toEqual([]);
    expect(neu.stunden[0]).toMatchObject({ gewicht: 1, abgeschlossen: false, eindruecke: {} });
    expect(neu.einstellungen).toEqual(STANDARD_EINSTELLUNGEN);
    expect(neu.fachvorlagen).toEqual([]);
  });

  it('ersetzt ungültige Einstellungen durch Standardwerte', () => {
    const roh = {
      ...stand,
      einstellungen: { ...STANDARD_EINSTELLUNGEN, stufenNoten: { ...STANDARD_EINSTELLUNGEN.stufenNoten, o: null, '+': 7 }, schwellePlusPlus: 0, grenzfallBreite: 0.2 },
    };
    const e = aufAktuellenStand(roh, 1).einstellungen;
    expect(e.stufenNoten.o).toBe(3);
    expect(e.stufenNoten['+']).toBe(2);
    expect(e.schwellePlusPlus).toBe(3);
    expect(e.grenzfallBreite).toBe(0.2);
  });

  it('ersetzt leere Gewichte', () => {
    const roh = structuredClone(stand) as unknown as { lerngruppen: { notenbereiche: { gewicht: unknown }[] }[] };
    roh.lerngruppen[0].notenbereiche[0].gewicht = null;
    expect(aufAktuellenStand(roh, 1).lerngruppen[0].notenbereiche[0].gewicht).toBe(0);
  });

  it('lehnt Daten einer neueren Version ab', () => {
    expect(() => aufAktuellenStand(stand, DATENVERSION + 1)).toThrow(DatenFehler);
  });

  it('lehnt beschädigte Daten ab', () => {
    expect(() => aufAktuellenStand(null, 1)).toThrow(DatenFehler);
    expect(() => aufAktuellenStand({ ...stand, stunden: undefined }, 1)).toThrow(DatenFehler);
    expect(() => aufAktuellenStand({ ...stand, stunden: [{ id: 'x', lerngruppeId: 'lg' }] }, 1)).toThrow(DatenFehler);
    expect(() => aufAktuellenStand({ ...stand, schueler: [{ vorname: 'ohne Id' }] }, 1)).toThrow(DatenFehler);
    expect(() => aufAktuellenStand({ ...stand, beobachtungen: [{ ...stand.beobachtungen[0], art: 'unbekannt' }] }, 1)).toThrow(DatenFehler);
  });

  it('führt Migrationen der Reihe nach aus', () => {
    const migrationen = {
      1: (s: { schueler: { klasse: string }[] }) => s.schueler.forEach((x) => (x.klasse += '-v2')),
      2: (s: { schueler: { klasse: string }[] }) => s.schueler.forEach((x) => (x.klasse += '-v3')),
    };
    expect(aufAktuellenStand(stand, 1, migrationen, 3).schueler[0].klasse).toBe('7a-v2-v3');
    expect(aufAktuellenStand(stand, 2, migrationen, 3).schueler[0].klasse).toBe('7a-v3');
  });

  it('lehnt ab, wenn ein Migrationsschritt fehlt', () => {
    expect(() => aufAktuellenStand(stand, 1, {}, 2)).toThrow(DatenFehler);
  });
});

describe('versionVon', () => {
  it('liest die Datenversion, alte Sicherungen haben Version 1', () => {
    expect(versionVon({ ...stand, datenversion: 4 })).toBe(4);
    expect(versionVon(stand)).toBe(1);
    expect(versionVon(null)).toBe(1);
  });
});
