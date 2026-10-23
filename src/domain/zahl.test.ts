import { describe, expect, it } from 'vitest';
import { leseZahl, zahlOder } from './zahl';

describe('leseZahl', () => {
  it('liest Komma und Punkt', () => {
    expect(leseZahl('2,5')).toBe(2.5);
    expect(leseZahl('2.5')).toBe(2.5);
    expect(leseZahl(' 3 ')).toBe(3);
    expect(leseZahl('−3')).toBe(-3);
  });

  it('leer oder ungültig ergibt undefined', () => {
    expect(leseZahl('')).toBeUndefined();
    expect(leseZahl(null)).toBeUndefined();
    expect(leseZahl('abc')).toBeUndefined();
    expect(leseZahl('Infinity')).toBeUndefined();
  });

  it('prüft Grenzen und ganze Zahlen', () => {
    expect(leseZahl('0', { min: 1 })).toBeUndefined();
    expect(leseZahl('7', { max: 6 })).toBeUndefined();
    expect(leseZahl('6', { min: 1, max: 6 })).toBe(6);
    expect(leseZahl('2,5', { ganz: true })).toBeUndefined();
  });
});

describe('zahlOder', () => {
  it('ersetzt gespeicherte ungültige Werte', () => {
    expect(zahlOder(null, 3)).toBe(3);
    expect(zahlOder(undefined, 3)).toBe(3);
    expect(zahlOder(0, 3, { min: 1 })).toBe(3);
    expect(zahlOder(2, 3, { min: 1 })).toBe(2);
    expect(zahlOder({}, 3)).toBe(3);
  });
});
