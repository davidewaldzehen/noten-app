import type { Id, Schueler, Sitzplan } from './typen';

export type Anordnung = 'reihen' | 'einzeln' | 'u-form' | 'doppel-u' | 'gruppen4' | 'gruppen6' | 'kreis' | 'leer';

export const ANORDNUNGEN: { id: Anordnung; name: string }[] = [
  { id: 'reihen', name: 'Reihen (Zweiertische)' },
  { id: 'einzeln', name: 'Einzeltische' },
  { id: 'u-form', name: 'U-Form' },
  { id: 'doppel-u', name: 'Doppel-U' },
  { id: 'gruppen4', name: 'Gruppentische (4er)' },
  { id: 'gruppen6', name: 'Gruppentische (6er)' },
  { id: 'kreis', name: 'Stuhlkreis' },
  { id: 'leer', name: 'Leer (selbst zeichnen)' },
];

export const schluessel = (p: { spalte: number; reihe: number }) => `${p.spalte}|${p.reihe}`;

/**
 * Schiebt die Plätze so, dass der Plan bei Spalte 0 / Reihe 0 beginnt und genau so groß ist wie nötig.
 * Ein Plan ohne Plätze behält seine Größe. Gibt die Verschiebung zurück.
 */
export function normalisiere(plan: Sitzplan): { spalten: number; reihen: number } {
  if (plan.plaetze.length === 0) return { spalten: 0, reihen: 0 };
  const minS = Math.min(...plan.plaetze.map((p) => p.spalte));
  const minR = Math.min(...plan.plaetze.map((p) => p.reihe));
  for (const p of plan.plaetze) {
    p.spalte -= minS;
    p.reihe -= minR;
  }
  plan.spalten = Math.max(...plan.plaetze.map((p) => p.spalte)) + 1;
  plan.reihen = Math.max(...plan.plaetze.map((p) => p.reihe)) + 1;
  return { spalten: -minS, reihen: -minR };
}

function planAus(positionen: [number, number][], anzahl: number): Sitzplan {
  const plan: Sitzplan = {
    spalten: 8,
    reihen: 5,
    plaetze: positionen.slice(0, anzahl).map(([spalte, reihe]) => ({ spalte, reihe })),
    tafelOben: true,
  };
  normalisiere(plan);
  return plan;
}

/** U-Form mit Seitenlänge h und Rückreihe b, offen zur Tafel. */
function uForm(h: number, b: number, versatz = 0): [number, number][] {
  const pos: [number, number][] = [];
  for (let r = 0; r < h; r++) pos.push([versatz, r], [versatz + b + 1, r]);
  for (let s = 1; s <= b; s++) pos.push([versatz + s, h]);
  return pos;
}

function gruppen(anzahl: number, groesse: 4 | 6): [number, number][] {
  const tiefe = groesse / 2;
  const zahl = Math.ceil(anzahl / groesse);
  const proReihe = zahl <= 4 ? 2 : zahl <= 9 ? 3 : 4;
  const pos: [number, number][] = [];
  for (let g = 0; g < zahl; g++) {
    const s0 = (g % proReihe) * 3;
    const r0 = Math.floor(g / proReihe) * (tiefe + 1);
    for (let r = 0; r < tiefe; r++) pos.push([s0, r0 + r], [s0 + 1, r0 + r]);
  }
  return pos;
}

/** Erzeugt einen Sitzplan mit genau `anzahl` Plätzen (bei „leer“ ohne Plätze). Reihe 0 ist vorne an der Tafel. */
export function sitzplanAus(anordnung: Anordnung, anzahl: number): Sitzplan {
  const n = Math.max(1, Math.round(anzahl));
  switch (anordnung) {
    case 'reihen': {
      const tische = n > 36 ? 4 : n > 12 ? 3 : 2;
      const pos: [number, number][] = [];
      for (let i = 0; pos.length < n; i++) {
        const r = Math.floor(i / tische);
        const s = (i % tische) * 3;
        pos.push([s, r], [s + 1, r]);
      }
      return planAus(pos, n);
    }
    case 'einzeln': {
      const proReihe = n <= 20 ? 5 : n <= 36 ? 6 : 7;
      return planAus(Array.from({ length: n }, (_, i) => [(i % proReihe) * 2, Math.floor(i / proReihe)]), n);
    }
    case 'u-form': {
      // Eher breit als tief, damit die Kacheln auf dem Querformat nicht zu flach werden.
      const h = Math.max(1, Math.round(n / 3.2));
      return planAus(uForm(h, Math.max(0, n - 2 * h)), n);
    }
    case 'doppel-u': {
      // Außen 2h+b, innen (eine Spalte/Reihe Abstand) 2h+b-8 Plätze.
      const m = Math.ceil((n + 8) / 2);
      const h = Math.max(3, Math.round(m / 3.2));
      const b = m - 2 * h;
      if (h < 3 || b < 5) return sitzplanAus('u-form', n);
      return planAus([...uForm(h, b), ...uForm(h - 2, b - 4, 2)], n);
    }
    case 'gruppen4':
      return planAus(gruppen(n, 4), n);
    case 'gruppen6':
      return planAus(gruppen(n, 6), n);
    case 'kreis': {
      // Rechteckiger Kreis ohne Ecken: oben/unten je a, links/rechts je c Plätze.
      const c = Math.max(1, Math.round(n / 5));
      const a = Math.max(1, Math.ceil((n - 2 * c) / 2));
      const pos: [number, number][] = [];
      for (let s = 1; s <= a; s++) pos.push([s, 0]);
      for (let r = 1; r <= c; r++) pos.push([0, r], [a + 1, r]);
      for (let s = 1; s <= a; s++) pos.push([s, c + 1]);
      return planAus(pos, n);
    }
    case 'leer':
      return { spalten: 8, reihen: 5, plaetze: [], tafelOben: true };
  }
}

/**
 * Verschiebt die gewählten Plätze (samt Schülern) um dx/dy, wenn alle Zielfelder frei oder selbst gewählt sind.
 * Gibt die neuen Schlüssel der Auswahl zurück oder null, wenn der Weg blockiert ist.
 */
export function verschiebe(plan: Sitzplan, auswahl: Set<string>, dx: number, dy: number): Set<string> | null {
  const gewaehlt = plan.plaetze.filter((p) => auswahl.has(schluessel(p)));
  const belegt = new Set(plan.plaetze.filter((p) => !auswahl.has(schluessel(p))).map(schluessel));
  if (gewaehlt.some((p) => belegt.has(schluessel({ spalte: p.spalte + dx, reihe: p.reihe + dy })))) return null;
  for (const p of gewaehlt) {
    p.spalte += dx;
    p.reihe += dy;
  }
  normalisiere(plan);
  return new Set(gewaehlt.map(schluessel));
}

/** Setzt Schüler der Reihe nach auf freie Plätze. */
export function verteile(plan: Sitzplan, schuelerIds: Id[]): Sitzplan {
  const frei = [...schuelerIds];
  const plaetze = plan.plaetze
    .slice()
    .sort((a, b) => a.reihe - b.reihe || a.spalte - b.spalte)
    .map((p) => (p.schuelerId ? p : { ...p, schuelerId: frei.shift() }));
  return { ...plan, plaetze };
}

/**
 * Anzeigenamen für den Sitzplan: nur der Vorname,
 * bei gleichen Vornamen mit Initial des Nachnamens („Leon B.“).
 */
export function anzeigenamen(schueler: Schueler[]): Map<Id, string> {
  const anzahl = new Map<string, number>();
  for (const s of schueler) anzahl.set(s.vorname, (anzahl.get(s.vorname) ?? 0) + 1);
  return new Map(
    schueler.map((s) => [
      s.id,
      (anzahl.get(s.vorname) ?? 0) > 1 && s.nachname ? `${s.vorname} ${s.nachname[0]}.` : s.vorname || s.nachname,
    ]),
  );
}

export function vollerName(s: Schueler): string {
  return `${s.nachname}, ${s.vorname}`;
}

export function nachNameSortiert<T extends Schueler>(liste: T[]): T[] {
  return liste
    .slice()
    .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
}
