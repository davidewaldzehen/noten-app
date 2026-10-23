import { zeitraumVon } from './datum';
import type {
  Bewertungszeitraum,
  Id,
  Leistungsnachweis,
  Lerngruppe,
  Stufe,
  Stunde,
} from './typen';

/**
 * Liest eine eingetragene Note mit optionaler Tendenz.
 * '2' → 2, '2-' → 2,3, '2+' → 1,7, '2,5' → 2,5. Leer → undefined, ungültig → null.
 * Ergebnisse werden auf 1..6 begrenzt (1+ zählt wie 1).
 */
export function parseNote(text: string | undefined): number | undefined | null {
  const t = (text ?? '').trim().replace(/[–−]/g, '-').replace(',', '.');
  if (t === '') return undefined;
  const m = /^([1-6])(?:([+-])|\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  let wert = Number(m[1]);
  if (m[2] === '+') wert -= 0.3;
  if (m[2] === '-') wert += 0.3;
  if (m[3] !== undefined) {
    wert = Number(`${m[1]}.${m[3]}`);
    if (wert > 6) return null;
  }
  return runde2(Math.min(6, Math.max(1, wert)));
}

function runde2(x: number): number {
  return Math.round(x * 100) / 100;
}

interface Gewichtet {
  wert: number;
  gewicht: number;
}

function gewichteterSchnitt(werte: Gewichtet[]): number | undefined {
  const summeGewicht = werte.reduce((s, w) => s + w.gewicht, 0);
  if (summeGewicht <= 0) return undefined;
  return werte.reduce((s, w) => s + w.wert * w.gewicht, 0) / summeGewicht;
}

export interface Zeitraumergebnis {
  /** Note je Notenbereich-Id; undefined, wenn der Schüler dort keine Note hat. */
  bereiche: Record<Id, number | undefined>;
  fachnote?: number;
}

export interface Notenergebnis {
  hj1: Zeitraumergebnis;
  hj2: Zeitraumergebnis;
  /** Jahresnote aus beiden Halbjahren. */
  jahr?: number;
}

/** Mündliche Note: nach Gewicht der Stunde gewichteter Durchschnitt der Stundeneindrücke. */
export function muendlicheNote(
  stunden: Stunde[],
  schuelerId: Id,
  stufenNoten: Record<Stufe, number>,
): number | undefined {
  const werte: Gewichtet[] = [];
  for (const stunde of stunden) {
    if (!stunde.abgeschlossen) continue;
    const e = stunde.eindruecke[schuelerId];
    if (e?.art === 'stufe') werte.push({ wert: stufenNoten[e.stufe], gewicht: stunde.gewicht });
  }
  return gewichteterSchnitt(werte);
}

/** Note eines Notenbereichs aus Leistungsnachweisen: gewichteter Durchschnitt der gültigen Noten. */
export function nachweisNote(nachweise: Leistungsnachweis[], schuelerId: Id): number | undefined {
  const werte: Gewichtet[] = [];
  for (const n of nachweise) {
    const wert = parseNote(n.noten[schuelerId]);
    if (typeof wert === 'number') werte.push({ wert, gewicht: n.gewicht });
  }
  return gewichteterSchnitt(werte);
}

/** Fachnote aus den Notenbereichen; Bereiche ohne Note werden herausgerechnet. */
export function fachnote(bereiche: { gewicht: number; note: number | undefined }[]): number | undefined {
  return gewichteterSchnitt(
    bereiche
      .filter((b): b is { gewicht: number; note: number } => b.note !== undefined)
      .map((b) => ({ wert: b.note, gewicht: b.gewicht })),
  );
}

export function jahresnote(
  hj1: number | undefined,
  hj2: number | undefined,
  anteilHj1: number,
): number | undefined {
  if (hj1 === undefined) return hj2;
  if (hj2 === undefined) return hj1;
  return anteilHj1 * hj1 + (1 - anteilHj1) * hj2;
}

/** Berechnet alle Noten eines Schülers in einer Lerngruppe. */
export function berechneNoten(
  lerngruppe: Lerngruppe,
  stunden: Stunde[],
  nachweise: Leistungsnachweis[],
  stufenNoten: Record<Stufe, number>,
  schuelerId: Id,
): Notenergebnis {
  const zeitraum = (z: Bewertungszeitraum): Zeitraumergebnis => {
    const stundenImZeitraum = stunden.filter(
      (s) => s.lerngruppeId === lerngruppe.id && zeitraumVon(s.datum, lerngruppe.beginnHj2) === z,
    );
    const nachweiseImZeitraum = nachweise.filter(
      (n) => n.lerngruppeId === lerngruppe.id && zeitraumVon(n.datum, lerngruppe.beginnHj2) === z,
    );
    const bereiche: Record<Id, number | undefined> = {};
    for (const b of lerngruppe.notenbereiche) {
      bereiche[b.id] =
        b.art === 'muendlich'
          ? muendlicheNote(stundenImZeitraum, schuelerId, stufenNoten)
          : nachweisNote(
              nachweiseImZeitraum.filter((n) => n.notenbereichId === b.id),
              schuelerId,
            );
    }
    return {
      bereiche,
      fachnote: fachnote(lerngruppe.notenbereiche.map((b) => ({ gewicht: b.gewicht, note: bereiche[b.id] }))),
    };
  };
  const hj1 = zeitraum('hj1');
  const hj2 = zeitraum('hj2');
  return { hj1, hj2, jahr: jahresnote(hj1.fachnote, hj2.fachnote, lerngruppe.anteilHj1) };
}

/** Gerundeter Vorschlag für die Zeugnisnote (x,5 rundet zur schlechteren Note). */
export function rundungsvorschlag(note: number): number {
  return Math.min(6, Math.max(1, Math.floor(runde2(note) + 0.5)));
}

/** Liegt die Note so nah an x,5, dass sie bewusst geprüft werden sollte? */
export function istGrenzfall(note: number, breite: number): boolean {
  const n = runde2(note);
  return Math.abs(n - Math.floor(n) - 0.5) <= breite + 1e-9;
}

/** z. B. 2,48 */
export function formatNote(note: number | undefined): string {
  return note === undefined ? '–' : note.toFixed(2).replace('.', ',');
}

/** Anzeige einer eingetragenen Note mit typografischem Minus: '2-' → '2−'. */
export function formatNotentext(text: string): string {
  return text.trim().replace(/-$/, '−');
}
