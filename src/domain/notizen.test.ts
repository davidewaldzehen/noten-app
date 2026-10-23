import { describe, expect, it } from 'vitest';
import { notizenZu } from './notizen';
import type { Notiz } from './typen';

const notiz = (id: string, schuelerId: string, datum: string): Notiz => ({ id, schuelerId, datum, text: id });

describe('notizenZu', () => {
  it('liefert nur die Notizen des Schülers, nach Datum sortiert', () => {
    const notizen = [notiz('c', 'mia', '2026-11-03'), notiz('x', 'tom', '2026-09-01'), notiz('a', 'mia', '2026-09-15'), notiz('b', 'mia', '2026-11-03')];
    expect(notizenZu(notizen, 'mia').map((n) => n.id)).toEqual(['a', 'c', 'b']);
  });
});
