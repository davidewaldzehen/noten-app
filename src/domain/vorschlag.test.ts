import { describe, expect, it } from 'vitest';
import { punkte, vorschlag } from './vorschlag';

const einst = { schwellePlusPlus: 3, schwelleMinusMinus: -3 };

describe('vorschlag', () => {
  it('ohne Beobachtung ist der Vorschlag neutral', () => {
    expect(vorschlag([], einst)).toBe('o');
  });

  it('Tom: zwei gute Beiträge ergeben +', () => {
    expect(vorschlag(['+', '+'], einst)).toBe('+');
  });

  it('drei gute Beiträge ergeben ++', () => {
    expect(vorschlag(['+', '+', '+'], einst)).toBe('++');
  });

  it('Ben: ein herausragender Beitrag allein ergibt +', () => {
    expect(vorschlag(['++'], einst)).toBe('+');
  });

  it('Lea: + und − heben sich auf', () => {
    expect(punkte(['+', '-'])).toBe(0);
    expect(vorschlag(['+', '-'], einst)).toBe('o');
  });

  it('negative Summen ergeben − bzw. −−', () => {
    expect(vorschlag(['-'], einst)).toBe('-');
    expect(vorschlag(['-', '-'], einst)).toBe('-');
    expect(vorschlag(['-', '-', '-'], einst)).toBe('--');
  });

  it('Schwelle ist einstellbar', () => {
    expect(vorschlag(['+', '+'], { schwellePlusPlus: 2, schwelleMinusMinus: -2 })).toBe('++');
  });
});
