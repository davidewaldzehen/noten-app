// Notenschlüssel: Note eines Leistungsnachweises aus Rohpunkten.
// Eine Grenze muss exakt erreicht werden (91,9 % bei Grenze 92 % ist noch keine 1). Punkte gibt es in halben Schritten.

import type { Id, Notenschluessel, Punkteerfassung } from './typen';

const EPS = 1e-9;

/** Gültige Grenzen: fünf Prozentwerte für die Noten 1 bis 5, streng fallend, größer 0 und höchstens 100. */
export function grenzenGueltig(grenzen: unknown): grenzen is number[] {
  return (
    Array.isArray(grenzen) &&
    grenzen.length === 5 &&
    grenzen.every((g, i) => typeof g === 'number' && Number.isFinite(g) && g > 0 && g <= 100 && (i === 0 || g < grenzen[i - 1]))
  );
}

export interface Stufengrenze {
  /** Note als Text, z. B. '2-'. */
  note: string;
  /** Mindestprozent. */
  ab: number;
}

/**
 * Alle Notenstufen mit ihrem Mindestprozent, von der besten zur schlechtesten.
 * Mit Tendenzen wird jeder Notenbereich gedrittelt: oberes Drittel +, unteres Drittel −.
 * 1+ und 6− gibt es nicht, weil sie wie 1 und 6 zählen.
 */
export function stufengrenzen(s: Notenschluessel): Stufengrenze[] {
  const liste: Stufengrenze[] = [];
  for (let note = 1; note <= 6; note++) {
    const oben = note === 1 ? 100 : s.grenzen[note - 2];
    const unten = note === 6 ? 0 : s.grenzen[note - 1];
    if (!s.tendenzen) {
      liste.push({ note: String(note), ab: unten });
      continue;
    }
    const drittel = (oben - unten) / 3;
    if (note > 1) liste.push({ note: `${note}+`, ab: oben - drittel });
    if (note < 6) {
      liste.push({ note: String(note), ab: unten + drittel });
      liste.push({ note: `${note}-`, ab: unten });
    } else liste.push({ note: '6', ab: 0 });
  }
  return liste;
}

/** Note für einen Prozentwert. */
export function noteAusProzent(prozent: number, s: Notenschluessel): string {
  return stufengrenzen(s).find((g) => prozent >= g.ab - EPS)?.note ?? '6';
}

export function noteAusPunkten(punkte: number, max: number, s: Notenschluessel): string {
  return noteAusProzent((punkte / max) * 100, s);
}

/** Wenigste Punkte (in halben Schritten), mit denen ein Mindestprozent erreicht ist. */
export function mindestpunkte(ab: number, max: number): number {
  return Math.max(0, Math.ceil(((ab * max) / 100) * 2 - EPS) / 2);
}

/** Liest eingetippte Punkte ('23,5'). Leer → undefined; keine halben Schritte oder außerhalb 0..max → null. */
export function lesePunkte(text: string | undefined, max: number): number | undefined | null {
  const t = (text ?? '').trim().replace(',', '.');
  if (t === '') return undefined;
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isInteger(n * 2) || n > max) return null;
  return n;
}

/** Noten aller Schüler aus ihren Punkten. Schüler ohne oder mit ungültigen Punkten haben keine Note. */
export function notenAusPunkten(p: Punkteerfassung): Record<Id, string> {
  const noten: Record<Id, string> = {};
  for (const [id, text] of Object.entries(p.werte)) {
    const n = lesePunkte(text, p.max);
    if (typeof n === 'number') noten[id] = noteAusPunkten(n, p.max, p.schluessel);
  }
  return noten;
}
