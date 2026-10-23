// Übernahme einer Lerngruppe ins neue Schuljahr.

import { standardBeginnHj2 } from './datum';
import type { Id, Lerngruppe } from './typen';

/** '2026/27' → '2027/28'. Ein nicht lesbares Schuljahr bleibt, wie es ist. */
export function naechstesSchuljahr(schuljahr: string): string {
  const m = /^(\d{4})/.exec(schuljahr.trim());
  if (!m) return schuljahr;
  const start = Number(m[1]) + 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Zählt die erste Jahrgangszahl hoch: '7a' → '8a', '7a Mathe' → '8a Mathe', 'WPK Französisch 7' → 'WPK Französisch 8'. */
export function jahrgangHochzaehlen(text: string): string {
  return text.replace(/(?<![\p{L}\d])(\d{1,2})(?=\p{L}?(?![\p{L}\d]))/u, (j) => String(Number(j) + 1));
}

/**
 * Neue Lerngruppe für das nächste Schuljahr: dieselben aktiven Schüler, derselbe Sitzplan, dieselben Notenbereiche
 * und Verhaltenskategorien, aber ohne Zeugnisnoten und Notizen. Stunden, Beobachtungen und Leistungsnachweise
 * hängen an der alten Lerngruppe und kommen nicht mit.
 */
export function lerngruppeFuersNeueSchuljahr(alt: Lerngruppe, name: string, schuljahr: string, neueId: () => Id, jetzt: number): Lerngruppe {
  const kopie = structuredClone(alt);
  return {
    ...kopie,
    id: neueId(),
    name: name.trim(),
    schuljahr,
    beginnHj2: standardBeginnHj2(schuljahr),
    notenbereiche: kopie.notenbereiche.map((b) => ({ ...b, id: neueId() })),
    verhaltenskategorien: kopie.verhaltenskategorien.map((k) => ({ ...k, id: neueId() })),
    mitglieder: kopie.mitglieder.filter((m) => !m.ausgeschieden),
    zeugnisnoten: { hj1: {}, jahr: {} },
    notizen: [],
    archiviert: false,
    zuletztBenutzt: jetzt,
  };
}

/**
 * Schüler der Lerngruppe, deren Klasse beim Übernehmen hochgezählt wird. Wer schon in einer Lerngruppe des neuen
 * Schuljahres ist, wurde bereits mit einer anderen Lerngruppe übernommen und wird nicht ein zweites Mal hochgezählt.
 */
export function hochzuzaehlendeSchueler(alt: Lerngruppe, lerngruppen: Lerngruppe[], schuljahr: string): Id[] {
  const schonUebernommen = new Set(
    lerngruppen.filter((l) => l.id !== alt.id && l.schuljahr === schuljahr).flatMap((l) => l.mitglieder.map((m) => m.schuelerId)),
  );
  return alt.mitglieder.filter((m) => !m.ausgeschieden && !schonUebernommen.has(m.schuelerId)).map((m) => m.schuelerId);
}
