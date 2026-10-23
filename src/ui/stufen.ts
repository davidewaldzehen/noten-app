import type { Eindruck, Stufe } from '../domain/typen';
import { STUFEN_ANZEIGE } from '../domain/vorschlag';

const KLASSEN: Record<Stufe, string> = { '++': 'stufe-pp', '+': 'stufe-p', o: 'stufe-o', '-': 'stufe-m', '--': 'stufe-mm' };

export function stufenKlasse(stufe: Stufe): string {
  return KLASSEN[stufe];
}

export function eindruckText(e: Eindruck | undefined): string {
  if (!e) return '';
  if (e.art === 'abwesend') return 'abw.';
  if (e.art === 'ohne') return '–';
  return STUFEN_ANZEIGE[e.stufe];
}
