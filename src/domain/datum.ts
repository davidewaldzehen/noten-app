import type { Bewertungszeitraum, Datum } from './typen';

export function datumVon(d: Date): Datum {
  const j = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

export function heute(): Datum {
  return datumVon(new Date());
}

export function alsDate(datum: Datum): Date {
  const [j, m, t] = datum.split('-').map(Number);
  return new Date(j, m - 1, t);
}

export function plusTage(datum: Datum, tage: number): Datum {
  const d = alsDate(datum);
  d.setDate(d.getDate() + tage);
  return datumVon(d);
}

export function zeitraumVon(datum: Datum, beginnHj2: Datum): Bewertungszeitraum {
  return datum < beginnHj2 ? 'hj1' : 'hj2';
}

/** Schuljahr (Aug–Jul) zu einem Datum, z. B. '2026/27'. */
export function schuljahrVon(datum: Datum): string {
  const d = alsDate(datum);
  const start = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Vorbelegung für den Beginn des 2. Halbjahres: 1. Februar des Schuljahres. */
export function standardBeginnHj2(schuljahr: string): Datum {
  const start = Number(schuljahr.slice(0, 4));
  return `${start + 1}-02-01`;
}

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** z. B. 'Di, 21.10.' */
export function kurzdatum(datum: Datum): string {
  const d = alsDate(datum);
  return `${WOCHENTAGE[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/** z. B. '21.10.2026' */
export function langdatum(datum: Datum): string {
  const [j, m, t] = datum.split('-');
  return `${t}.${m}.${j}`;
}
