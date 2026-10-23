import { zeigeSnackbar } from '../daten/store.svelte';
import { leseZahl, type Grenzen } from '../domain/zahl';

function erlaubt(g: Grenzen): string {
  const zahl = (n: number) => String(n).replace('.', ',');
  const art = g.ganz ? 'ganze Zahl' : 'Zahl';
  if (g.min !== undefined && g.max !== undefined) return `erlaubt: ${art} von ${zahl(g.min)} bis ${zahl(g.max)}`;
  if (g.min !== undefined) return `erlaubt: ${art} ab ${zahl(g.min)}`;
  if (g.max !== undefined) return `erlaubt: ${art} bis ${zahl(g.max)}`;
  return `erlaubt: ${art}`;
}

/**
 * Liest die Zahl aus einem Eingabefeld. Bei leerer oder ungültiger Eingabe kommt der bisherige Wert
 * zurück ins Feld, ein Hinweis erscheint und das Ergebnis ist undefined (dann nichts speichern).
 */
export function zahlAusFeld(feld: HTMLInputElement, grenzen: Grenzen, bisher: number): number | undefined {
  const n = leseZahl(feld.value, grenzen);
  if (n === undefined) {
    feld.value = String(bisher);
    zeigeSnackbar(`Ungültiger Wert (${erlaubt(grenzen)}).`, undefined, 4000);
  }
  return n;
}
