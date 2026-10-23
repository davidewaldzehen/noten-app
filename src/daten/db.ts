import Dexie, { type Table } from 'dexie';
import type { Beobachtung, Leistungsnachweis, Lerngruppe, Schueler, Stunde } from '../domain/typen';

export interface MetaEintrag {
  schluessel: string;
  wert: unknown;
}

/** Lokale Datenbank im Browser (IndexedDB). Verlässt nie das Gerät. */
export class NotenDB extends Dexie {
  schueler!: Table<Schueler, string>;
  lerngruppen!: Table<Lerngruppe, string>;
  stunden!: Table<Stunde, string>;
  beobachtungen!: Table<Beobachtung, string>;
  nachweise!: Table<Leistungsnachweis, string>;
  meta!: Table<MetaEintrag, string>;

  constructor() {
    super('noten-app');
    this.version(1).stores({
      schueler: 'id',
      lerngruppen: 'id',
      stunden: 'id, lerngruppeId',
      beobachtungen: 'id, stundeId, lerngruppeId',
      nachweise: 'id, lerngruppeId',
      meta: 'schluessel',
    });
  }
}

export const db = new NotenDB();
