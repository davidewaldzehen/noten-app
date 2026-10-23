import { describe, expect, it } from 'vitest';
import { leseSchuelerliste } from './import';

describe('leseSchuelerliste', () => {
  it('liest „Vorname Nachname“ je Zeile', () => {
    expect(leseSchuelerliste('Anna Müller\nLeon Ben Schulz\n', '7a')).toEqual([
      { vorname: 'Anna', nachname: 'Müller', klasse: '7a' },
      { vorname: 'Leon Ben', nachname: 'Schulz', klasse: '7a' },
    ]);
  });

  it('liest „Nachname, Vorname“', () => {
    expect(leseSchuelerliste('Müller, Anna\nSchulz, Leon')).toEqual([
      { vorname: 'Anna', nachname: 'Müller', klasse: '' },
      { vorname: 'Leon', nachname: 'Schulz', klasse: '' },
    ]);
  });

  it('liest eine Tabelle mit Kopfzeile (Tabs)', () => {
    const text = 'Nr\tName\tVorname\tKlasse\n1\tMüller\tAnna\t7a\n2\tSchulz\tLeon\t7b';
    expect(leseSchuelerliste(text)).toEqual([
      { vorname: 'Anna', nachname: 'Müller', klasse: '7a' },
      { vorname: 'Leon', nachname: 'Schulz', klasse: '7b' },
    ]);
  });

  it('erkennt eine Klasse am Zeilenende', () => {
    expect(leseSchuelerliste('Anna Müller 7a')).toEqual([{ vorname: 'Anna', nachname: 'Müller', klasse: '7a' }]);
  });

  it('hält „Klassen“ als Nachnamen nicht für eine Kopfzeile', () => {
    expect(leseSchuelerliste('Anna Klassen\nLeon Name')).toEqual([
      { vorname: 'Anna', nachname: 'Klassen', klasse: '' },
      { vorname: 'Leon', nachname: 'Name', klasse: '' },
    ]);
  });

  it('ignoriert Leerzeilen', () => {
    expect(leseSchuelerliste('\n\n')).toEqual([]);
  });
});
