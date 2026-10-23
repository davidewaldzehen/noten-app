export interface Grenzen {
  min?: number;
  max?: number;
  ganz?: boolean;
}

/** Liest eine eingetippte Zahl ('2,5' oder '2.5'). Leer, ungültig oder außerhalb der Grenzen → undefined. */
export function leseZahl(text: string | number | null | undefined, grenzen: Grenzen = {}): number | undefined {
  const t = String(text ?? '').trim().replace(',', '.').replace(/[–−]/g, '-');
  if (t === '') return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  if (grenzen.ganz && !Number.isInteger(n)) return undefined;
  if (grenzen.min !== undefined && n < grenzen.min) return undefined;
  if (grenzen.max !== undefined && n > grenzen.max) return undefined;
  return n;
}

/** Wie leseZahl, aber für schon gespeicherte Werte: Ungültiges wird durch `ersatz` ersetzt. */
export function zahlOder(wert: unknown, ersatz: number, grenzen: Grenzen = {}): number {
  return typeof wert === 'number' || typeof wert === 'string' ? (leseZahl(wert, grenzen) ?? ersatz) : ersatz;
}
