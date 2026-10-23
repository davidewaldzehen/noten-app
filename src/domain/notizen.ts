import type { Id, Notiz } from './typen';

/** Notizen eines Schülers nach Datum, bei gleichem Datum in der Reihenfolge des Eintragens. */
export function notizenZu(notizen: Notiz[], schuelerId: Id): Notiz[] {
  return notizen
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.schuelerId === schuelerId)
    .sort((a, b) => a.n.datum.localeCompare(b.n.datum) || a.i - b.i)
    .map(({ n }) => n);
}
