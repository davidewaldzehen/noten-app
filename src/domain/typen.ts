// Datentypen der Noten-App. Die Begriffe folgen CONTEXT.md.

export type Id = string;

/** Datum als 'YYYY-MM-DD' in lokaler Zeit. */
export type Datum = string;

/** Stufe eines Stundeneindrucks. 'o' ist der Neutrale Eindruck (○). */
export type Stufe = '++' | '+' | 'o' | '-' | '--';
export const STUFEN: Stufe[] = ['++', '+', 'o', '-', '--'];

/** Stufe einer Leistungsbeobachtung. */
export type LeistungsStufe = '++' | '+' | '-';

export type Eindruck =
  | { art: 'stufe'; stufe: Stufe }
  | { art: 'ohne' }
  | { art: 'abwesend' };

export type Bewertungszeitraum = 'hj1' | 'hj2';

export interface Schueler {
  id: Id;
  vorname: string;
  nachname: string;
  klasse: string;
}

export interface Mitgliedschaft {
  schuelerId: Id;
  ausgeschieden: boolean;
}

export interface Platz {
  spalte: number;
  reihe: number;
  schuelerId?: Id;
}

export interface Sitzplan {
  spalten: number;
  reihen: number;
  plaetze: Platz[];
  tafelOben: boolean;
}

export interface Notenbereich {
  id: Id;
  name: string;
  /** Relatives Gewicht, z. B. 50. */
  gewicht: number;
  art: 'muendlich' | 'nachweise';
}

export interface Verhaltenskategorie {
  id: Id;
  name: string;
  symbol: string;
  positiv: boolean;
}

export interface Zeugnisnoteneintrag {
  note: number;
  begruendung?: string;
}

/** Freitext der Lehrkraft zu einem Schüler in einer Lerngruppe. Fließt nie in die Note ein. */
export interface Notiz {
  id: Id;
  schuelerId: Id;
  datum: Datum;
  text: string;
}

export interface Lerngruppe {
  id: Id;
  name: string;
  fach: string;
  /** z. B. '2026/27' */
  schuljahr: string;
  /** Erster Tag des 2. Halbjahres. */
  beginnHj2: Datum;
  /** Anteil des 1. Halbjahres an der Jahresnote, 0..1. */
  anteilHj1: number;
  notenbereiche: Notenbereich[];
  verhaltenskategorien: Verhaltenskategorie[];
  mitglieder: Mitgliedschaft[];
  sitzplan: Sitzplan;
  zeugnisnoten: {
    hj1: Record<Id, Zeugnisnoteneintrag>;
    jahr: Record<Id, Zeugnisnoteneintrag>;
  };
  notizen: Notiz[];
  archiviert: boolean;
  zuletztBenutzt: number;
}

export interface Stunde {
  id: Id;
  lerngruppeId: Id;
  datum: Datum;
  /** Einzelstunde 1, Doppelstunde 2. */
  gewicht: number;
  abgeschlossen: boolean;
  /** Nur bei abgeschlossenen Stunden gefüllt. */
  eindruecke: Record<Id, Eindruck>;
}

export type Beobachtung =
  | {
      id: Id;
      stundeId: Id;
      lerngruppeId: Id;
      schuelerId: Id;
      zeit: number;
      art: 'leistung';
      stufe: LeistungsStufe;
    }
  | {
      id: Id;
      stundeId: Id;
      lerngruppeId: Id;
      schuelerId: Id;
      zeit: number;
      art: 'verhalten';
      kategorieId: Id;
    };

export type Verhaltensbeobachtung = Extract<Beobachtung, { art: 'verhalten' }>;
export type Leistungsbeobachtung = Extract<Beobachtung, { art: 'leistung' }>;

export interface Notenschluessel {
  /** Mindestprozent für die Noten 1 bis 5, streng fallend; darunter 6. */
  grenzen: number[];
  /** Notenbereiche dritteln: oberes Drittel +, unteres Drittel −. */
  tendenzen: boolean;
}

export interface Schluesselvorlage extends Notenschluessel {
  name: string;
}

/** Rohpunkte eines Leistungsnachweises; die Noten ergeben sich daraus über den Notenschlüssel. */
export interface Punkteerfassung {
  max: number;
  schluessel: Notenschluessel;
  /** Eingetragene Punkte als Text, z. B. '23,5'. */
  werte: Record<Id, string>;
}

export interface Leistungsnachweis {
  id: Id;
  lerngruppeId: Id;
  notenbereichId: Id;
  titel: string;
  datum: Datum;
  /** Gewicht innerhalb des Notenbereichs, z. B. 1 oder 0,5. */
  gewicht: number;
  /** Eingetragene Noten als Text, z. B. '2-'. Bei Punkteerfassung aus den Punkten berechnet. */
  noten: Record<Id, string>;
  punkte?: Punkteerfassung;
}

export interface Einstellungen {
  /** Notenwert je Stufe des Stundeneindrucks. */
  stufenNoten: Record<Stufe, number>;
  /** Punktsumme, ab der ++ vorgeschlagen wird. */
  schwellePlusPlus: number;
  /** Punktsumme, ab der (nach unten) −− vorgeschlagen wird, z. B. -3. */
  schwelleMinusMinus: number;
  /** Häufungshinweis: so oft ... */
  haeufungAnzahl: number;
  /** ... innerhalb so vieler Tage. */
  haeufungTage: number;
  /** Abstand zu x,5, innerhalb dessen eine Fachnote ein Grenzfall ist. */
  grenzfallBreite: number;
  /** Gespeicherte Notenschlüssel; der erste ist die Vorbelegung für neue Punkteerfassungen. */
  schluesselvorlagen: Schluesselvorlage[];
  /** Blendet Beobachtungen und Hinweise aus, z. B. wenn das Gerät an einen Beamer gespiegelt wird. */
  markierungenVerbergen: boolean;
  /** Zeitpunkt der letzten Sicherung (ms) oder null. */
  letzteSicherung: number | null;
}

export interface Fachvorlage {
  fach: string;
  notenbereiche: Notenbereich[];
}

export const STANDARD_NOTENSCHLUESSEL: Notenschluessel = { grenzen: [92, 81, 67, 50, 30], tendenzen: true };

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  stufenNoten: { '++': 1, '+': 2, o: 3, '-': 4, '--': 5 },
  schwellePlusPlus: 3,
  schwelleMinusMinus: -3,
  haeufungAnzahl: 3,
  haeufungTage: 14,
  grenzfallBreite: 0.1,
  schluesselvorlagen: [{ name: 'Standard', ...STANDARD_NOTENSCHLUESSEL }],
  markierungenVerbergen: false,
  letzteSicherung: null,
};

/** Erlaubte Werte der Einstellungen. Gilt für die Eingabe und beim Laden gespeicherter Daten. */
export const EINSTELLUNGEN_GRENZEN = {
  stufenNote: { min: 1, max: 6 },
  schwellePlusPlus: { min: 1, ganz: true },
  schwelleMinusMinus: { max: -1, ganz: true },
  haeufungAnzahl: { min: 2, ganz: true },
  haeufungTage: { min: 1, ganz: true },
  grenzfallBreite: { min: 0, max: 0.5 },
} as const;
