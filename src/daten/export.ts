/** iPad/iPhone; iPadOS gibt sich als Mac aus, hat aber einen Touchscreen. */
export const istIos =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));

/**
 * Bietet einen Text als Datei zum Speichern an. Auf dem iPad über das Teilen-Menü („In Dateien sichern“),
 * weil Downloads in einer App vom Home-Bildschirm nicht zuverlässig funktionieren. Muss direkt aus einem Tippen heraus
 * aufgerufen werden, sonst verweigert Safari das Teilen.
 */
export async function speichereDatei(inhalt: string, dateiname: string, typ: string) {
  if (istIos) {
    const datei = new File([inhalt], dateiname, { type: typ });
    if (navigator.canShare?.({ files: [datei] })) {
      try {
        await navigator.share({ files: [datei] });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
  }
  ladeHerunter(inhalt, dateiname, typ);
}

function ladeHerunter(inhalt: string, dateiname: string, typ: string) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** CSV für Excel mit deutschen Einstellungen: Semikolon, Komma als Dezimaltrenner, BOM. */
export function alsCsv(zeilen: (string | number | undefined)[][]): string {
  const zelle = (w: string | number | undefined) => {
    const t = w === undefined ? '' : typeof w === 'number' ? String(w).replace('.', ',') : w;
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + zeilen.map((z) => z.map(zelle).join(';')).join('\r\n');
}
