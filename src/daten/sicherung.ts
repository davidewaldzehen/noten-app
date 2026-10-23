import type {
  Beobachtung,
  Einstellungen,
  Fachvorlage,
  Leistungsnachweis,
  Lerngruppe,
  Schueler,
  Stunde,
} from '../domain/typen';

/** Vollständiger Datenstand der App, wie er in einer Sicherung steckt. */
export interface Datenstand {
  schueler: Schueler[];
  lerngruppen: Lerngruppe[];
  stunden: Stunde[];
  beobachtungen: Beobachtung[];
  nachweise: Leistungsnachweis[];
  einstellungen: Einstellungen;
  fachvorlagen: Fachvorlage[];
  /** Form der Daten (siehe migration.ts); fehlt bei Sicherungen der ersten Version. */
  datenversion?: number;
}

interface Sicherungsdatei {
  format: 'noten-app-sicherung';
  version: 1;
  erstellt: string;
  salt: string;
  iv: string;
  daten: string;
}

/** Verfahren der Sicherung; die Datenschutz-Seite nennt dieselben Werte. */
export const VERSCHLUESSELUNG = { verfahren: 'AES-GCM', schluesselBits: 256, ableitung: 'PBKDF2', hash: 'SHA-256', iterationen: 600_000 } as const;

export const PASSWORT_MINDESTLAENGE = 6;

function zuBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function vonBase64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function schluessel(passwort: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const v = VERSCHLUESSELUNG;
  const basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(passwort), v.ableitung, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: v.ableitung, salt, iterations: v.iterationen, hash: v.hash },
    basis,
    { name: v.verfahren, length: v.schluesselBits },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Verschlüsselt den Datenstand mit dem Passwort (PBKDF2 + AES-GCM) und liefert den Dateiinhalt. */
export async function verschluessele(stand: Datenstand, passwort: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const klartext = new TextEncoder().encode(JSON.stringify(stand));
  const geheim = await crypto.subtle.encrypt({ name: VERSCHLUESSELUNG.verfahren, iv }, await schluessel(passwort, salt), klartext);
  const datei: Sicherungsdatei = {
    format: 'noten-app-sicherung',
    version: 1,
    erstellt: new Date().toISOString(),
    salt: zuBase64(salt),
    iv: zuBase64(iv),
    daten: zuBase64(new Uint8Array(geheim)),
  };
  return JSON.stringify(datei);
}

export class SicherungsFehler extends Error {}

/**
 * Entschlüsselt eine Sicherungsdatei. Wirft SicherungsFehler bei falschem Passwort oder fremder Datei.
 * Liefert den Datenstand ungeprüft; vor dem Verwenden muss er durch aufAktuellenStand (migration.ts).
 */
export async function entschluessele(dateiinhalt: string, passwort: string): Promise<unknown> {
  let datei: Sicherungsdatei;
  try {
    datei = JSON.parse(dateiinhalt);
  } catch {
    throw new SicherungsFehler('Das ist keine Sicherungsdatei der Noten-App.');
  }
  if (datei?.format !== 'noten-app-sicherung') throw new SicherungsFehler('Das ist keine Sicherungsdatei der Noten-App.');
  if (datei.version !== 1) throw new SicherungsFehler('Diese Sicherung stammt aus einer neueren Version der App.');
  let klartext: ArrayBuffer;
  try {
    klartext = await crypto.subtle.decrypt(
      { name: VERSCHLUESSELUNG.verfahren, iv: vonBase64(datei.iv) },
      await schluessel(passwort, vonBase64(datei.salt)),
      vonBase64(datei.daten),
    );
  } catch {
    throw new SicherungsFehler('Falsches Passwort – oder die Datei ist beschädigt.');
  }
  try {
    return JSON.parse(new TextDecoder().decode(klartext));
  } catch {
    throw new SicherungsFehler('Die Sicherungsdatei ist beschädigt.');
  }
}
