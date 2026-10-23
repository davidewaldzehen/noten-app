import { datumVon, plusTage } from './datum';
import type { Datum, Id, Verhaltensbeobachtung } from './typen';

export interface Haeufung {
  schuelerId: Id;
  kategorieId: Id;
  anzahl: number;
}

/**
 * Häufungshinweise: Schüler, bei denen dieselbe Verhaltenskategorie
 * in den letzten `tage` Tagen (bis einschließlich `stichtag`) mindestens `anzahl`-mal beobachtet wurde.
 */
export function haeufungen(
  beobachtungen: Verhaltensbeobachtung[],
  stichtag: Datum,
  anzahl: number,
  tage: number,
): Haeufung[] {
  const ab = plusTage(stichtag, -(tage - 1));
  const zaehler = new Map<string, Haeufung>();
  for (const b of beobachtungen) {
    const datum = datumVon(new Date(b.zeit));
    if (datum < ab || datum > stichtag) continue;
    const schluessel = `${b.schuelerId}|${b.kategorieId}`;
    const h = zaehler.get(schluessel) ?? { schuelerId: b.schuelerId, kategorieId: b.kategorieId, anzahl: 0 };
    h.anzahl++;
    zaehler.set(schluessel, h);
  }
  return [...zaehler.values()].filter((h) => h.anzahl >= anzahl).sort((a, b) => b.anzahl - a.anzahl);
}
