import { initials, stringToHslColor } from './string';

describe('initials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initials('Ana Souza')).toBe('AS');
  });

  it('handles a single word', () => {
    expect(initials('Madonna')).toBe('M');
  });

  it('caps at two letters for long names', () => {
    expect(initials('Ana Beatriz Costa Souza')).toBe('AB');
  });

  it('collapses extra whitespace and trims', () => {
    expect(initials('  ana   souza  ')).toBe('AS');
  });

  it('returns an empty string for an empty name', () => {
    expect(initials('')).toBe('');
  });
});

describe('stringToHslColor', () => {
  it('is deterministic for the same input', () => {
    expect(stringToHslColor('Ana Souza')).toBe(stringToHslColor('Ana Souza'));
  });

  it('produces different hues for different inputs', () => {
    expect(stringToHslColor('Ana')).not.toBe(stringToHslColor('Bruno'));
  });

  it('emits a valid hsl() string within the hue range', () => {
    const match = /^hsl\((\d+), 60%, 45%\)$/.exec(stringToHslColor('X'));
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(0);
    expect(Number(match?.[1])).toBeLessThan(360);
  });
});
