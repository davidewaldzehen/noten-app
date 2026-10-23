import type { Einstellungen, LeistungsStufe, Stufe } from './typen';

const PUNKTE: Record<LeistungsStufe, number> = { '++': 2, '+': 1, '-': -1 };

/** Punktsumme der Leistungsbeobachtungen eines Schülers in einer Stunde. */
export function punkte(stufen: LeistungsStufe[]): number {
  return stufen.reduce((summe, s) => summe + PUNKTE[s], 0);
}

/** Vorschlag für den Stundeneindruck aus den Leistungsbeobachtungen der Stunde. */
export function vorschlag(
  stufen: LeistungsStufe[],
  einst: Pick<Einstellungen, 'schwellePlusPlus' | 'schwelleMinusMinus'>,
): Stufe {
  const p = punkte(stufen);
  if (p >= einst.schwellePlusPlus) return '++';
  if (p > 0) return '+';
  if (p <= einst.schwelleMinusMinus) return '--';
  if (p < 0) return '-';
  return 'o';
}

export const STUFEN_ANZEIGE: Record<Stufe, string> = {
  '++': '++',
  '+': '+',
  o: '○',
  '-': '−',
  '--': '−−',
};
