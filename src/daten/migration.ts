// Bringt gespeicherte Daten und Sicherungen auf den Stand der aktuellen App-Version.
// Ändert sich die Form der Daten, wird DATENVERSION erhöht und in MIGRATIONEN ein Schritt ergänzt,
// der einen Datenstand der vorigen Version umbaut. Alte Sicherungen bleiben so dauerhaft lesbar.

import { heute, schuljahrVon, standardBeginnHj2 } from '../domain/datum';
import {
  EINSTELLUNGEN_GRENZEN,
  STANDARD_EINSTELLUNGEN,
  STUFEN,
  type Beobachtung,
  type Einstellungen,
  type Leistungsnachweis,
  type Lerngruppe,
  type Schueler,
  type Stufe,
  type Stunde,
} from '../domain/typen';
import { zahlOder } from '../domain/zahl';
import type { Datenstand } from './sicherung';

export const DATENVERSION = 1;

/** Baut einen Datenstand von Version n auf Version n + 1 um (Schlüssel = n). */
export type Migration = (stand: any) => void;

export const MIGRATIONEN: Record<number, Migration> = {};

/** Daten, die die App nicht lesen kann. Die Meldung ist für die Lehrkraft gedacht. */
export class DatenFehler extends Error {}

type Roh = any;

const istObjekt = (x: unknown): boolean => typeof x === 'object' && x !== null && !Array.isArray(x);
const istText = (x: unknown): x is string => typeof x === 'string';
const istDatum = (x: unknown): x is string => istText(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);

function pruefe(bedingung: boolean, was: string): asserts bedingung {
  if (!bedingung) throw new DatenFehler(`Die Daten sind beschädigt (${was}).`);
}

/** Datenversion einer Sicherung; Sicherungen von vor der Einführung haben keine und sind Version 1. */
export function versionVon(roh: unknown): number {
  const r: Roh = roh;
  return istObjekt(r) && typeof r.datenversion === 'number' ? r.datenversion : 1;
}

/**
 * Prüft einen Datenstand der angegebenen Version, führt die nötigen Migrationen aus und ergänzt fehlende Felder.
 * Wirft DatenFehler, wenn die Daten unbrauchbar oder von einer neueren App-Version sind.
 */
export function aufAktuellenStand(
  roh: unknown,
  version: number,
  migrationen: Record<number, Migration> = MIGRATIONEN,
  ziel: number = DATENVERSION,
): Datenstand {
  if (version > ziel) {
    throw new DatenFehler('Diese Daten stammen aus einer neueren Version der App. Bitte die App schließen und neu öffnen.');
  }
  pruefe(istObjekt(roh), 'kein Datenstand');
  const stand: Roh = structuredClone(roh);
  for (const teil of ['schueler', 'lerngruppen', 'stunden', 'beobachtungen', 'nachweise']) {
    pruefe(Array.isArray(stand[teil]), `${teil} fehlt`);
  }
  for (let v = version; v < ziel; v++) {
    const schritt = migrationen[v];
    pruefe(!!schritt, `keine Umwandlung von Version ${v}`);
    schritt(stand);
  }
  return {
    schueler: stand.schueler.map(ergaenzeSchueler),
    lerngruppen: stand.lerngruppen.map(ergaenzeLerngruppe),
    stunden: stand.stunden.map(ergaenzeStunde),
    beobachtungen: stand.beobachtungen.map(ergaenzeBeobachtung),
    nachweise: stand.nachweise.map(ergaenzeNachweis),
    einstellungen: ergaenzeEinstellungen(stand.einstellungen),
    fachvorlagen: Array.isArray(stand.fachvorlagen) ? stand.fachvorlagen.filter(istObjekt) : [],
  };
}

/** Füllt fehlende oder ungültige Einstellungen mit den Standardwerten. */
export function ergaenzeEinstellungen(roh: unknown): Einstellungen {
  const e: Roh = istObjekt(roh) ? roh : {};
  const s = STANDARD_EINSTELLUNGEN;
  const g = EINSTELLUNGEN_GRENZEN;
  return {
    stufenNoten: Object.fromEntries(
      STUFEN.map((st) => [st, zahlOder(e.stufenNoten?.[st], s.stufenNoten[st], g.stufenNote)]),
    ) as Record<Stufe, number>,
    schwellePlusPlus: zahlOder(e.schwellePlusPlus, s.schwellePlusPlus, g.schwellePlusPlus),
    schwelleMinusMinus: zahlOder(e.schwelleMinusMinus, s.schwelleMinusMinus, g.schwelleMinusMinus),
    haeufungAnzahl: zahlOder(e.haeufungAnzahl, s.haeufungAnzahl, g.haeufungAnzahl),
    haeufungTage: zahlOder(e.haeufungTage, s.haeufungTage, g.haeufungTage),
    grenzfallBreite: zahlOder(e.grenzfallBreite, s.grenzfallBreite, g.grenzfallBreite),
    letzteSicherung: typeof e.letzteSicherung === 'number' ? e.letzteSicherung : null,
  };
}

function ergaenzeSchueler(s: Roh): Schueler {
  pruefe(istObjekt(s) && istText(s.id), 'Schüler ohne Id');
  return { ...s, vorname: istText(s.vorname) ? s.vorname : '', nachname: istText(s.nachname) ? s.nachname : '', klasse: istText(s.klasse) ? s.klasse : '' };
}

function ergaenzeLerngruppe(lg: Roh): Lerngruppe {
  pruefe(istObjekt(lg) && istText(lg.id), 'Lerngruppe ohne Id');
  const schuljahr = istText(lg.schuljahr) && lg.schuljahr ? lg.schuljahr : schuljahrVon(heute());
  const sitzplan = istObjekt(lg.sitzplan) && Array.isArray(lg.sitzplan.plaetze) ? lg.sitzplan : null;
  return {
    ...lg,
    name: istText(lg.name) ? lg.name : '',
    fach: istText(lg.fach) ? lg.fach : '',
    schuljahr,
    beginnHj2: istDatum(lg.beginnHj2) ? lg.beginnHj2 : standardBeginnHj2(schuljahr),
    anteilHj1: zahlOder(lg.anteilHj1, 0.5, { min: 0, max: 1 }),
    notenbereiche: (Array.isArray(lg.notenbereiche) ? lg.notenbereiche : []).map((b: Roh) => {
      pruefe(istObjekt(b) && istText(b.id), 'Notenbereich ohne Id');
      return { ...b, gewicht: zahlOder(b.gewicht, 0, { min: 0 }) };
    }),
    verhaltenskategorien: Array.isArray(lg.verhaltenskategorien) ? lg.verhaltenskategorien : [],
    mitglieder: Array.isArray(lg.mitglieder) ? lg.mitglieder : [],
    sitzplan: sitzplan
      ? { ...sitzplan, tafelOben: sitzplan.tafelOben !== false }
      : { spalten: 0, reihen: 0, plaetze: [], tafelOben: true },
    zeugnisnoten: {
      hj1: istObjekt(lg.zeugnisnoten?.hj1) ? lg.zeugnisnoten.hj1 : {},
      jahr: istObjekt(lg.zeugnisnoten?.jahr) ? lg.zeugnisnoten.jahr : {},
    },
    archiviert: lg.archiviert === true,
    zuletztBenutzt: zahlOder(lg.zuletztBenutzt, 0),
  };
}

function ergaenzeStunde(s: Roh): Stunde {
  pruefe(istObjekt(s) && istText(s.id) && istText(s.lerngruppeId) && istDatum(s.datum), 'Stunde unvollständig');
  return {
    ...s,
    gewicht: zahlOder(s.gewicht, 1, { min: 0 }),
    abgeschlossen: s.abgeschlossen === true,
    eindruecke: istObjekt(s.eindruecke) ? s.eindruecke : {},
  };
}

function ergaenzeBeobachtung(b: Roh): Beobachtung {
  pruefe(
    istObjekt(b) && istText(b.id) && istText(b.stundeId) && istText(b.lerngruppeId) && istText(b.schuelerId),
    'Beobachtung unvollständig',
  );
  pruefe(b.art === 'leistung' || b.art === 'verhalten', 'Beobachtung unbekannter Art');
  return { ...b, zeit: zahlOder(b.zeit, 0) };
}

function ergaenzeNachweis(n: Roh): Leistungsnachweis {
  pruefe(istObjekt(n) && istText(n.id) && istText(n.lerngruppeId) && istDatum(n.datum), 'Leistungsnachweis unvollständig');
  return {
    ...n,
    titel: istText(n.titel) ? n.titel : '',
    gewicht: zahlOder(n.gewicht, 1, { min: 0 }),
    noten: istObjekt(n.noten) ? n.noten : {},
  };
}
