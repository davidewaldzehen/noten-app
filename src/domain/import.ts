export interface ImportZeile {
  vorname: string;
  nachname: string;
  klasse: string;
}

const KLASSE = /^\d{1,2}[a-zA-Z]{0,2}$/;

function trenner(zeilen: string[]): string | RegExp {
  if (zeilen.some((z) => z.includes('\t'))) return '\t';
  if (zeilen.some((z) => z.includes(';'))) return ';';
  if (zeilen.every((z) => z.split(',').length >= 2)) return ',';
  return /\s+/;
}

/**
 * Liest eine eingefügte Schülerliste (z. B. aus WebUntis kopiert).
 * Erkennt Kopfzeilen (Vorname/Nachname/Name/Klasse), Tabs, Semikolons,
 * „Nachname, Vorname“ und „Vorname Nachname“.
 */
export function leseSchuelerliste(text: string, standardKlasse = ''): ImportZeile[] {
  const zeilen = text
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter((z) => z !== '');
  if (zeilen.length === 0) return [];

  const t = trenner(zeilen);
  const spalten = (z: string) => z.split(t).map((s) => s.trim());

  const kopf = spalten(zeilen[0]).map((s) => s.toLowerCase());
  const hatKopf = kopf.some((s) => /^(vor|nach|familien|schüler)?name$|^klasse$/.test(s));
  if (hatKopf) {
    const iVor = kopf.findIndex((s) => s.includes('vorname'));
    let iNach = kopf.findIndex((s) => s.includes('nachname') || s.includes('familienname'));
    if (iNach < 0) iNach = kopf.findIndex((s, i) => s.includes('name') && i !== iVor);
    const iKlasse = kopf.findIndex((s) => s.includes('klasse'));
    return zeilen
      .slice(1)
      .map(spalten)
      .map((s) => ({
        vorname: iVor >= 0 ? (s[iVor] ?? '') : '',
        nachname: iNach >= 0 ? (s[iNach] ?? '') : '',
        klasse: (iKlasse >= 0 ? s[iKlasse] : '') || standardKlasse,
      }))
      .filter((z) => z.vorname || z.nachname);
  }

  return zeilen.map((zeile) => {
    const s = spalten(zeile).filter((x) => x !== '');
    let klasse = standardKlasse;
    if (s.length >= 3 && KLASSE.test(s[s.length - 1])) klasse = s.pop()!;
    if (typeof t !== 'string') {
      // „Vorname Nachname“: letztes Wort ist der Nachname
      const nachname = s.length > 1 ? s.pop()! : '';
      return { vorname: s.join(' '), nachname, klasse };
    }
    // Tabelle oder „Nachname, Vorname“
    return { nachname: s[0] ?? '', vorname: s.slice(1).join(' '), klasse };
  });
}
