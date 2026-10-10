import { stripDataUrl, toDataUrl } from './base64';
import { formatBRL, formatMeters, parseMeters } from './units';

describe('units', () => {
  it('parses meters typed with comma or dot', () => {
    expect(parseMeters('3,5')).toBe(3.5);
    expect(parseMeters(' 2.755 ')).toBe(2.76);
    expect(parseMeters('')).toBeUndefined();
    expect(parseMeters('abc')).toBeUndefined();
    expect(parseMeters('0')).toBeUndefined();
    expect(parseMeters('80')).toBeUndefined();
  });

  it('formats values for Brazilian Portuguese', () => {
    expect(formatMeters(3.5)).toBe('3,5 m');
    expect(formatMeters(undefined)).toBe('—');
    expect(formatBRL(1500)).toMatch(/^R\$\s1\.500$/);
  });
});

describe('data URLs', () => {
  it('round-trips base64 and mime type', () => {
    expect(stripDataUrl(toDataUrl('QUJD', 'image/png'))).toEqual({ base64: 'QUJD', mimeType: 'image/png' });
    expect(stripDataUrl('QUJD')).toEqual({ base64: 'QUJD', mimeType: null });
  });
});
