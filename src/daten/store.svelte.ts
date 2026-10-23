// Zentraler Datenstand der App: liegt im Speicher (reaktiv) und wird bei jeder Änderung
// in die lokale Datenbank geschrieben. Die Oberfläche ändert Daten nur über diese Funktionen.

import { heute, schuljahrVon, standardBeginnHj2 } from '../domain/datum';
import type { ImportZeile } from '../domain/import';
import { sitzplanAus } from '../domain/sitzplan';
import {
  STANDARD_EINSTELLUNGEN,
  type Beobachtung,
  type Eindruck,
  type Einstellungen,
  type Fachvorlage,
  type Id,
  type Leistungsnachweis,
  type LeistungsStufe,
  type Lerngruppe,
  type Notenbereich,
  type Schueler,
  type Stunde,
  type Verhaltenskategorie,
} from '../domain/typen';
import { db } from './db';
import { entschluessele, verschluessele, type Datenstand } from './sicherung';

export const daten = $state({
  geladen: false,
  schueler: [] as Schueler[],
  lerngruppen: [] as Lerngruppe[],
  stunden: [] as Stunde[],
  beobachtungen: [] as Beobachtung[],
  nachweise: [] as Leistungsnachweis[],
  einstellungen: { ...STANDARD_EINSTELLUNGEN } as Einstellungen,
  fachvorlagen: [] as Fachvorlage[],
});

/** Meldungen an die Oberfläche (Snackbar mit „Rückgängig“, Fehler). */
export const ui = $state({
  snackbar: null as null | { text: string; rueckgaengig?: () => void; nr: number },
  fehler: null as null | string,
});

let snackbarTimer: ReturnType<typeof setTimeout> | undefined;

export function zeigeSnackbar(text: string, rueckgaengig?: () => void, dauer = 3000) {
  clearTimeout(snackbarTimer);
  const nr = (ui.snackbar?.nr ?? 0) + 1;
  ui.snackbar = { text, rueckgaengig, nr };
  snackbarTimer = setTimeout(() => {
    if (ui.snackbar?.nr === nr) ui.snackbar = null;
  }, dauer);
}

function fehler(e: unknown) {
  console.error(e);
  ui.fehler = `Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`;
}

function snap<T>(x: T): T {
  return $state.snapshot(x) as T;
}

export function neueId(): Id {
  return crypto.randomUUID();
}

// ---------- Laden ----------

export async function laden() {
  const [schueler, lerngruppen, stunden, beobachtungen, nachweise, einst, vorlagen] = await Promise.all([
    db.schueler.toArray(),
    db.lerngruppen.toArray(),
    db.stunden.toArray(),
    db.beobachtungen.toArray(),
    db.nachweise.toArray(),
    db.meta.get('einstellungen'),
    db.meta.get('fachvorlagen'),
  ]);
  daten.schueler = schueler;
  daten.lerngruppen = lerngruppen;
  daten.stunden = stunden;
  daten.beobachtungen = beobachtungen;
  daten.nachweise = nachweise;
  daten.einstellungen = { ...STANDARD_EINSTELLUNGEN, ...((einst?.wert as Einstellungen) ?? {}) };
  daten.fachvorlagen = (vorlagen?.wert as Fachvorlage[]) ?? [];
  daten.geladen = true;
  // Bittet den Browser, die Daten nicht automatisch zu löschen.
  navigator.storage?.persist?.().catch(() => {});
}

// ---------- Abfragen ----------

export function lerngruppe(id: Id): Lerngruppe | undefined {
  return daten.lerngruppen.find((l) => l.id === id);
}

export function schuelerMitId(id: Id): Schueler | undefined {
  return daten.schueler.find((s) => s.id === id);
}

/** Aktive (nicht ausgeschiedene) Schüler einer Lerngruppe. */
export function mitglieder(lg: Lerngruppe): Schueler[] {
  return lg.mitglieder
    .filter((m) => !m.ausgeschieden)
    .map((m) => schuelerMitId(m.schuelerId))
    .filter((s): s is Schueler => !!s);
}

export function ausgeschiedene(lg: Lerngruppe): Schueler[] {
  return lg.mitglieder
    .filter((m) => m.ausgeschieden)
    .map((m) => schuelerMitId(m.schuelerId))
    .filter((s): s is Schueler => !!s);
}

export function stundenVon(lgId: Id): Stunde[] {
  return daten.stunden.filter((s) => s.lerngruppeId === lgId).sort((a, b) => a.datum.localeCompare(b.datum));
}

export function offeneStunde(lgId: Id): Stunde | undefined {
  return daten.stunden.find((s) => s.lerngruppeId === lgId && !s.abgeschlossen);
}

export function beobachtungenVon(stundeId: Id): Beobachtung[] {
  return daten.beobachtungen.filter((b) => b.stundeId === stundeId);
}

export function nachweiseVon(lgId: Id): Leistungsnachweis[] {
  return daten.nachweise.filter((n) => n.lerngruppeId === lgId).sort((a, b) => a.datum.localeCompare(b.datum));
}

// ---------- Lerngruppen ----------

export const STANDARD_VERHALTENSKATEGORIEN: Omit<Verhaltenskategorie, 'id'>[] = [
  { name: 'stört', symbol: '⚡', positiv: false },
  { name: 'Material fehlt', symbol: '🎒', positiv: false },
  { name: 'Hausaufgaben fehlen', symbol: '📓', positiv: false },
  { name: 'nicht bei der Sache', symbol: '💤', positiv: false },
  { name: 'hilft anderen', symbol: '🤝', positiv: true },
];

function standardNotenbereiche(fach: string): Notenbereich[] {
  const vorlage = daten.fachvorlagen.find((v) => v.fach.toLowerCase() === fach.trim().toLowerCase());
  if (vorlage) return vorlage.notenbereiche.map((b) => ({ ...snap(b), id: neueId() }));
  return [
    { id: neueId(), name: 'Klassenarbeiten', gewicht: 50, art: 'nachweise' },
    { id: neueId(), name: 'Mündliche Note', gewicht: 50, art: 'muendlich' },
  ];
}

export function speichereLerngruppe(lg: Lerngruppe) {
  db.lerngruppen.put(snap(lg)).catch(fehler);
}

export function lerngruppeAnlegen(name: string, fach: string, schuljahr = schuljahrVon(heute())): Lerngruppe {
  const lg: Lerngruppe = {
    id: neueId(),
    name: name.trim(),
    fach: fach.trim(),
    schuljahr,
    beginnHj2: standardBeginnHj2(schuljahr),
    anteilHj1: 0.5,
    notenbereiche: standardNotenbereiche(fach),
    verhaltenskategorien: STANDARD_VERHALTENSKATEGORIEN.map((k) => ({ ...k, id: neueId() })),
    mitglieder: [],
    sitzplan: sitzplanAus('reihen', 30),
    zeugnisnoten: { hj1: {}, jahr: {} },
    archiviert: false,
    zuletztBenutzt: Date.now(),
  };
  daten.lerngruppen.push(lg);
  speichereLerngruppe(lg);
  return lerngruppe(lg.id)!;
}

export function lerngruppeBenutzt(lg: Lerngruppe) {
  lg.zuletztBenutzt = Date.now();
  speichereLerngruppe(lg);
}

export function fachvorlageSpeichern(fach: string, bereiche: Notenbereich[]) {
  const vorlage: Fachvorlage = { fach: fach.trim(), notenbereiche: snap(bereiche) };
  const i = daten.fachvorlagen.findIndex((v) => v.fach.toLowerCase() === vorlage.fach.toLowerCase());
  if (i >= 0) daten.fachvorlagen[i] = vorlage;
  else daten.fachvorlagen.push(vorlage);
  db.meta.put({ schluessel: 'fachvorlagen', wert: snap(daten.fachvorlagen) }).catch(fehler);
}

/** Löscht eine Lerngruppe mit allen Stunden, Beobachtungen und Leistungsnachweisen. */
export async function lerngruppeLoeschen(lgId: Id) {
  daten.lerngruppen = daten.lerngruppen.filter((l) => l.id !== lgId);
  daten.stunden = daten.stunden.filter((s) => s.lerngruppeId !== lgId);
  daten.beobachtungen = daten.beobachtungen.filter((b) => b.lerngruppeId !== lgId);
  daten.nachweise = daten.nachweise.filter((n) => n.lerngruppeId !== lgId);
  const verwaist = daten.schueler
    .filter((s) => !daten.lerngruppen.some((l) => l.mitglieder.some((m) => m.schuelerId === s.id)))
    .map((s) => s.id);
  daten.schueler = daten.schueler.filter((s) => !verwaist.includes(s.id));
  await db
    .transaction('rw', [db.lerngruppen, db.stunden, db.beobachtungen, db.nachweise, db.schueler], async () => {
      await db.lerngruppen.delete(lgId);
      await db.stunden.where('lerngruppeId').equals(lgId).delete();
      await db.beobachtungen.where('lerngruppeId').equals(lgId).delete();
      await db.nachweise.where('lerngruppeId').equals(lgId).delete();
      await db.schueler.bulkDelete(verwaist);
    })
    .catch(fehler);
}

// ---------- Schüler ----------

/** Fügt Schüler aus einer Liste hinzu. Bereits bekannte Schüler (gleicher Name und Klasse) werden wiederverwendet. */
export function schuelerHinzufuegen(lg: Lerngruppe, zeilen: ImportZeile[]): number {
  let neu = 0;
  for (const z of zeilen) {
    const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    let s = daten.schueler.find((x) => gleich(x.vorname, z.vorname) && gleich(x.nachname, z.nachname) && gleich(x.klasse, z.klasse));
    if (!s) {
      s = { id: neueId(), vorname: z.vorname.trim(), nachname: z.nachname.trim(), klasse: z.klasse.trim() };
      daten.schueler.push(s);
      db.schueler.put(snap(s)).catch(fehler);
    }
    if (aufnehmen(lg, s.id)) neu++;
  }
  speichereLerngruppe(lg);
  return neu;
}

function aufnehmen(lg: Lerngruppe, schuelerId: Id): boolean {
  const m = lg.mitglieder.find((x) => x.schuelerId === schuelerId);
  if (m && !m.ausgeschieden) return false;
  if (m) m.ausgeschieden = false;
  else lg.mitglieder.push({ schuelerId, ausgeschieden: false });
  return true;
}

export function schuelerUebernehmen(lg: Lerngruppe, ids: Id[]): number {
  const neu = ids.filter((id) => aufnehmen(lg, id)).length;
  speichereLerngruppe(lg);
  return neu;
}

export function speichereSchueler(s: Schueler) {
  db.schueler.put(snap(s)).catch(fehler);
}

/** Schüler verlässt die Lerngruppe: Daten bleiben, Platz wird frei. */
export function schuelerAusscheiden(lg: Lerngruppe, schuelerId: Id) {
  const m = lg.mitglieder.find((x) => x.schuelerId === schuelerId);
  if (m) m.ausgeschieden = true;
  for (const p of lg.sitzplan.plaetze) if (p.schuelerId === schuelerId) p.schuelerId = undefined;
  speichereLerngruppe(lg);
}

export function schuelerWiederAufnehmen(lg: Lerngruppe, schuelerId: Id) {
  aufnehmen(lg, schuelerId);
  speichereLerngruppe(lg);
}

// ---------- Stunden und Beobachtungen ----------

function speichereStunde(s: Stunde) {
  db.stunden.put(snap(s)).catch(fehler);
}

export function stundeBeginnen(lgId: Id): Stunde {
  const s: Stunde = { id: neueId(), lerngruppeId: lgId, datum: heute(), gewicht: 1, abgeschlossen: false, eindruecke: {} };
  daten.stunden.push(s);
  speichereStunde(s);
  return daten.stunden.find((x) => x.id === s.id)!;
}

export type Beobachtungsinhalt =
  | { art: 'leistung'; stufe: LeistungsStufe }
  | { art: 'verhalten'; kategorieId: Id };

/** Hält eine Beobachtung fest; beginnt bei Bedarf die Stunde. Liefert die Id (für „Rückgängig“). */
export function beobachten(lgId: Id, schuelerId: Id, inhalt: Beobachtungsinhalt): Id {
  const stunde = offeneStunde(lgId) ?? stundeBeginnen(lgId);
  const b = { id: neueId(), stundeId: stunde.id, lerngruppeId: lgId, schuelerId, zeit: Date.now(), ...inhalt } as Beobachtung;
  daten.beobachtungen.push(b);
  db.beobachtungen.put(snap(b)).catch(fehler);
  return b.id;
}

export function beobachtungLoeschen(id: Id) {
  daten.beobachtungen = daten.beobachtungen.filter((b) => b.id !== id);
  db.beobachtungen.delete(id).catch(fehler);
}

export function stundeAbschliessen(stunde: Stunde, eindruecke: Record<Id, Eindruck>, datum: string, gewicht: number) {
  stunde.eindruecke = eindruecke;
  stunde.datum = datum;
  stunde.gewicht = gewicht;
  stunde.abgeschlossen = true;
  speichereStunde(stunde);
}

export function stundeLoeschen(stundeId: Id) {
  daten.stunden = daten.stunden.filter((s) => s.id !== stundeId);
  daten.beobachtungen = daten.beobachtungen.filter((b) => b.stundeId !== stundeId);
  db.transaction('rw', [db.stunden, db.beobachtungen], async () => {
    await db.stunden.delete(stundeId);
    await db.beobachtungen.where('stundeId').equals(stundeId).delete();
  }).catch(fehler);
}

// ---------- Leistungsnachweise und Zeugnisnoten ----------

export function nachweisAnlegen(lg: Lerngruppe, notenbereichId: Id): Leistungsnachweis {
  const anzahl = daten.nachweise.filter((n) => n.notenbereichId === notenbereichId).length;
  const bereich = lg.notenbereiche.find((b) => b.id === notenbereichId);
  const titel = bereich?.name === 'Klassenarbeiten' ? `Klassenarbeit ${anzahl + 1}` : `${bereich?.name ?? 'Leistungsnachweis'} ${anzahl + 1}`;
  const n: Leistungsnachweis = { id: neueId(), lerngruppeId: lg.id, notenbereichId, titel, datum: heute(), gewicht: 1, noten: {} };
  daten.nachweise.push(n);
  speichereNachweis(n);
  return daten.nachweise.find((x) => x.id === n.id)!;
}

export function speichereNachweis(n: Leistungsnachweis) {
  db.nachweise.put(snap(n)).catch(fehler);
}

export function nachweisLoeschen(id: Id) {
  daten.nachweise = daten.nachweise.filter((n) => n.id !== id);
  db.nachweise.delete(id).catch(fehler);
}

export function zeugnisnoteSetzen(lg: Lerngruppe, zeitraum: 'hj1' | 'jahr', schuelerId: Id, note: number | undefined, begruendung?: string) {
  if (note === undefined) delete lg.zeugnisnoten[zeitraum][schuelerId];
  else lg.zeugnisnoten[zeitraum][schuelerId] = { note, begruendung: begruendung?.trim() || undefined };
  speichereLerngruppe(lg);
}

// ---------- Einstellungen ----------

export function speichereEinstellungen() {
  db.meta.put({ schluessel: 'einstellungen', wert: snap(daten.einstellungen) }).catch(fehler);
}

// ---------- Sicherung ----------

function datenstand(): Datenstand {
  return snap({
    schueler: daten.schueler,
    lerngruppen: daten.lerngruppen,
    stunden: daten.stunden,
    beobachtungen: daten.beobachtungen,
    nachweise: daten.nachweise,
    einstellungen: daten.einstellungen,
    fachvorlagen: daten.fachvorlagen,
  });
}

export async function sicherungErstellen(passwort: string): Promise<string> {
  const datei = await verschluessele(datenstand(), passwort);
  daten.einstellungen.letzteSicherung = Date.now();
  speichereEinstellungen();
  return datei;
}

/** Ersetzt alle Daten durch den Stand aus der Sicherung. */
export async function sicherungWiederherstellen(dateiinhalt: string, passwort: string) {
  const stand = await entschluessele(dateiinhalt, passwort);
  await alleDatenErsetzen(stand);
}

export async function alleDatenErsetzen(stand: Datenstand) {
  await db.transaction('rw', [db.schueler, db.lerngruppen, db.stunden, db.beobachtungen, db.nachweise, db.meta], async () => {
    await Promise.all([db.schueler.clear(), db.lerngruppen.clear(), db.stunden.clear(), db.beobachtungen.clear(), db.nachweise.clear(), db.meta.clear()]);
    await db.schueler.bulkPut(stand.schueler);
    await db.lerngruppen.bulkPut(stand.lerngruppen);
    await db.stunden.bulkPut(stand.stunden);
    await db.beobachtungen.bulkPut(stand.beobachtungen);
    await db.nachweise.bulkPut(stand.nachweise);
    await db.meta.bulkPut([
      { schluessel: 'einstellungen', wert: stand.einstellungen },
      { schluessel: 'fachvorlagen', wert: stand.fachvorlagen },
    ]);
  });
  await laden();
}

/** Fügt einen Datenstand zu den vorhandenen Daten hinzu (z. B. Beispieldaten). */
export async function datenHinzufuegen(stand: Omit<Datenstand, 'einstellungen' | 'fachvorlagen'>) {
  await db.transaction('rw', [db.schueler, db.lerngruppen, db.stunden, db.beobachtungen, db.nachweise], async () => {
    await db.schueler.bulkPut(stand.schueler);
    await db.lerngruppen.bulkPut(stand.lerngruppen);
    await db.stunden.bulkPut(stand.stunden);
    await db.beobachtungen.bulkPut(stand.beobachtungen);
    await db.nachweise.bulkPut(stand.nachweise);
  });
  await laden();
}
