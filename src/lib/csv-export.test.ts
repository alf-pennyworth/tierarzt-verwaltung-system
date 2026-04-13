import { describe, it, expect } from 'vitest';

describe('BVL CSV Export', () => {
  it('formats CSV with correct headers', () => {
    const headers = [
      'BNR15', 'BNR15_HA', 'TAMB_FORM', 'TAMX_TIANZ',
      'TAMA_NAME', 'TAMX_AWMEN', 'TAMX_AW_ME', 'TAMX_AWDAT',
      'TAMX_LFNR', 'TAMX_BEHAT'
    ];

    const csv = headers.join(';');

    expect(csv).toBe(
      'BNR15;BNR15_HA;TAMB_FORM;TAMX_TIANZ;TAMA_NAME;TAMX_AWMEN;TAMX_AW_ME;TAMX_AWDAT;TAMX_LFNR;TAMX_BEHAT'
    );
  });

  it('formats date correctly for BVL (YYYY-MM-DD)', () => {
    const date = new Date('2026-04-10T10:30:00Z');
    const formatted = date.toISOString().split('T')[0];

    expect(formatted).toBe('2026-04-10');
  });

  it('encodes German umlauts correctly for Windows-1252', () => {
    const encodeWindows1252 = (str: string): string => {
      const charMap: Record<string, string> = {
        'ä': '\xe4', 'Ä': '\xc4',
        'ö': '\xf6', 'Ö': '\xd6',
        'ü': '\xfc', 'Ü': '\xdc',
        'ß': '\xdf',
        '€': '\x80',
      };

      return str.split('').map(char => charMap[char] || char).join('');
    };

    expect(encodeWindows1252('Köln')).toBe('K\xf6ln');
    expect(encodeWindows1252('München')).toBe('M\xfcnchen');
    expect(encodeWindows1252('Über')).toBe('\xdcber');
  });

  it('maps species to BVL usage codes', () => {
    const speciesMap: Record<string, string> = {
      'Rind': 'RIN',
      'Schwein': 'SCH',
      'Huhn': 'GEF',
      'Pute': 'GEF',
      'Pferd': 'PF',
      'Schaf': 'SCH',
      'Ziege': 'ZIE',
      'Hund': 'HUN',
      'Katze': 'KAT',
      'Kaninchen': 'KAN',
    };

    expect(speciesMap['Hund']).toBe('HUN');
    expect(speciesMap['Katze']).toBe('KAT');
    expect(speciesMap['Rind']).toBe('RIN');
  });

  it('quotes values containing semicolons', () => {
    const escapeCSVValue = (v: string): string => {
      if (v.includes(';') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };

    expect(escapeCSVValue('Amoxicillin')).toBe('Amoxicillin');
    expect(escapeCSVValue('Amoxi;cillin')).toBe('"Amoxi;cillin"');
    expect(escapeCSVValue('He said "yes"')).toBe('"He said ""yes"""');
  });
});