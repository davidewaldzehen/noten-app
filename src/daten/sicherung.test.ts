import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN } from '../domain/typen';
import { entschluessele, SicherungsFehler, VERSCHLUESSELUNG, verschluessele, type Datenstand } from './sicherung';

const stand: Datenstand = {
  schueler: [{ id: '1', vorname: 'Mia', nachname: 'Wolf', klasse: '7a' }],
  lerngruppen: [],
  stunden: [],
  beobachtungen: [],
  nachweise: [],
  einstellungen: STANDARD_EINSTELLUNGEN,
  fachvorlagen: [],
};

describe('Sicherung', () => {
  it('stellt mit richtigem Passwort den Datenstand wieder her', async () => {
    const datei = await verschluessele(stand, 'geheim');
    expect(datei).not.toContain('Mia');
    expect(await entschluessele(datei, 'geheim')).toEqual(stand);
  });

  it('verschlüsselt so, wie es die Datenschutz-Seite beschreibt: AES-256-GCM, Schlüssel über PBKDF2-SHA-256', async () => {
    const datei = JSON.parse(await verschluessele(stand, 'geheim123'));
    expect(JSON.stringify(datei)).not.toContain('geheim123');
    const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const basis = await crypto.subtle.importKey('raw', new TextEncoder().encode('geheim123'), 'PBKDF2', false, ['deriveKey']);
    const schluessel = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: bytes(datei.salt), iterations: 600_000, hash: 'SHA-256' },
      basis,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const klartext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(datei.iv) }, schluessel, bytes(datei.daten));
    expect(JSON.parse(new TextDecoder().decode(klartext))).toEqual(stand);
    expect(VERSCHLUESSELUNG).toMatchObject({ verfahren: 'AES-GCM', schluesselBits: 256, iterationen: 600_000 });
    expect(bytes(datei.salt)).toHaveLength(16);
  });

  it('lehnt ein falsches Passwort ab', async () => {
    const datei = await verschluessele(stand, 'geheim');
    await expect(entschluessele(datei, 'falsch')).rejects.toBeInstanceOf(SicherungsFehler);
  });

  it('lehnt fremde Dateien ab', async () => {
    await expect(entschluessele('{"hallo":1}', 'x')).rejects.toBeInstanceOf(SicherungsFehler);
    await expect(entschluessele('kein json', 'x')).rejects.toBeInstanceOf(SicherungsFehler);
  });
});
