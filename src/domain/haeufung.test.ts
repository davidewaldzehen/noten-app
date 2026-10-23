import { describe, expect, it } from 'vitest';
import { haeufungen } from './haeufung';
import type { Verhaltensbeobachtung } from './typen';

function b(schuelerId: string, kategorieId: string, datum: string): Verhaltensbeobachtung {
  const [j, m, t] = datum.split('-').map(Number);
  return {
    id: Math.random().toString(),
    stundeId: 's',
    lerngruppeId: 'lg',
    schuelerId,
    zeit: new Date(j, m - 1, t, 10).getTime(),
    art: 'verhalten',
    kategorieId,
  };
}

describe('haeufungen', () => {
  it('meldet 3× dieselbe Kategorie innerhalb von 14 Tagen', () => {
    const beob = [b('ben', 'ha', '2026-10-09'), b('ben', 'ha', '2026-10-15'), b('ben', 'ha', '2026-10-22')];
    expect(haeufungen(beob, '2026-10-22', 3, 14)).toEqual([{ schuelerId: 'ben', kategorieId: 'ha', anzahl: 3 }]);
  });

  it('ignoriert Beobachtungen außerhalb des Zeitraums', () => {
    const beob = [b('ben', 'ha', '2026-10-08'), b('ben', 'ha', '2026-10-15'), b('ben', 'ha', '2026-10-22')];
    expect(haeufungen(beob, '2026-10-22', 3, 14)).toEqual([]);
  });

  it('zählt Kategorien und Schüler getrennt', () => {
    const beob = [b('ben', 'ha', '2026-10-20'), b('ben', 'st', '2026-10-21'), b('mia', 'ha', '2026-10-22')];
    expect(haeufungen(beob, '2026-10-22', 2, 14)).toEqual([]);
  });
});
