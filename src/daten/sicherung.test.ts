import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN } from '../domain/typen';
import { entschluessele, SicherungsFehler, verschluessele, type Datenstand } from './sicherung';

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

  it('lehnt ein falsches Passwort ab', async () => {
    const datei = await verschluessele(stand, 'geheim');
    await expect(entschluessele(datei, 'falsch')).rejects.toBeInstanceOf(SicherungsFehler);
  });

  it('lehnt fremde Dateien ab', async () => {
    await expect(entschluessele('{"hallo":1}', 'x')).rejects.toBeInstanceOf(SicherungsFehler);
    await expect(entschluessele('kein json', 'x')).rejects.toBeInstanceOf(SicherungsFehler);
  });
});
