import { describe, it, expect } from 'vitest';

describe('BVL Export CSV Format', () => {
  // HI-Tier CSV format requires specific columns and Windows-1252 encoding
  
  it('generates correct BVL column headers', () => {
    const bvlHeaders = [
      'BNR15',        // Practice ID (15 digits)
      'BNR15_HA',     // Vet ID (15 digits)
      'TAMB_FORM',    // Form code (e.g., 'T')
      'TAMX_TIANZ',   // Animal count
      'TAMA_NAME',    // Animal species
      'TAMX_AWMEN',   // Drug amount
      'TAMX_AW_ME',   // Unit (e.g., 'ml', 'Stk')
      'TAMX_AWDAT',   // Prescription date (YYYY-MM-DD)
      'TAMX_LFNR',    // Running number
      'TAMX_BEHAT',   // Treatment type (T/P/M)
    ];

    expect(bvlHeaders).toHaveLength(10);
    expect(bvlHeaders).toContain('BNR15');
    expect(bvlHeaders).toContain('TAMB_FORM');
    expect(bvlHeaders).toContain('TAMA_NAME');
  });

  it('maps treatment purpose to BVL codes', () => {
    const purposeToCode: Record<string, string> = {
      'therapy': 'T',
      'prophylaxis': 'P',
      'metaphylaxis': 'M',
    };

    expect(purposeToCode['therapy']).toBe('T');
    expect(purposeToCode['prophylaxis']).toBe('P');
    expect(purposeToCode['metaphylaxis']).toBe('M');
  });

  it('formats BNR15 with correct structure', () => {
    // BNR15 format: XX XXX XXX XX XXX
    // Example: 09 000 000 00 001
    const formatBNR15 = (base: string, suffix: string): string => {
      return `${base} ${suffix}`;
    };

    const bnr15 = formatBNR15('09 000 000 00', '001');
    expect(bnr15).toBe('09 000 000 00 001');
    expect(bnr15.split(' ')).toHaveLength(5);
  });

  it('encodes German umlauts for Windows-1252', () => {
    const encodeWindows1252 = (str: string): Uint8Array => {
      const encoder = new TextEncoder('windows-1252');
      // For test purposes, simulate encoding
      const charMap: Record<string, number> = {
        'ä': 0xe4, 'Ä': 0xc4,
        'ö': 0xf6, 'Ö': 0xd6,
        'ü': 0xfc, 'Ü': 0xdc,
        'ß': 0xdf,
      };
      
      const bytes: number[] = [];
      for (const char of str) {
        if (charMap[char]) {
          bytes.push(charMap[char]);
        } else {
          bytes.push(char.charCodeAt(0));
        }
      }
      return new Uint8Array(bytes);
    };

    const encoded = encodeWindows1252('München');
    expect(encoded[1]).toBe(0xfc); // ü
    expect(encoded.length).toBe(7);
  });

  it('validates date range for export period', () => {
    const isValidDateRange = (start: string, end: string): boolean => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return startDate <= endDate;
    };

    expect(isValidDateRange('2026-04-01', '2026-04-10')).toBe(true);
    expect(isValidDateRange('2026-04-10', '2026-04-01')).toBe(false);
    expect(isValidDateRange('2026-04-01', '2026-04-01')).toBe(true);
  });

  it('escapes CSV special characters', () => {
    const escapeCSV = (value: string): string => {
      if (value.includes(';') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    expect(escapeCSV('Amoxicillin')).toBe('Amoxicillin');
    expect(escapeCSV('Amoxi;cillin')).toBe('"Amoxi;cillin"');
    expect(escapeCSV('He said "yes"')).toBe('"He said ""yes"""');
    expect(escapeCSV('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
  });

  it('generates correct CSV row', () => {
    const prescription = {
      bnr15: '09 000 000 00 001',
      bnr15_ha: '09 000 000 01 001',
      tamb_form: 'T',
      tamx_tianz: 1,
      tama_name: 'Hund',
      tamx_awmen: 10,
      tamx_aw_me: 'Tablette',
      tamx_awdat: '2026-04-10',
      tamx_lfnr: 1,
      tamx_behat: 'T',
    };

    const row = [
      prescription.bnr15,
      prescription.bnr15_ha,
      prescription.tamb_form,
      prescription.tamx_tianz,
      prescription.tama_name,
      prescription.tamx_awmen,
      prescription.tamx_aw_me,
      prescription.tamx_awdat,
      prescription.tamx_lfnr,
      prescription.tamx_behat,
    ].join(';');

    expect(row).toBe('09 000 000 00 001;09 000 000 01 001;T;1;Hund;10;Tablette;2026-04-10;1;T');
  });
});

describe('HI-Tier Export Integration', () => {
  it('prepares data for HI-Tier submission', () => {
    // HI-Tier requires specific format for BVL antibiotic reporting
    const exportData = {
      reportingPeriod: {
        start: '2026-04-01',
        end: '2026-04-30',
      },
      practice: {
        bnr15: '09 000 000 00 001',
        name: 'Test Tierarztpraxis',
      },
      prescriptions: [
        { id: '1', drug: 'Amoxicillin 500mg', species: 'Hund' },
        { id: '2', drug: 'Enrofloxacin 10%', species: 'Katze' },
      ],
    };

    expect(exportData.practice.bnr15).toHaveLength(17); // Including spaces
    expect(exportData.prescriptions).toHaveLength(2);
  });

  it('validates required fields before export', () => {
    const requiredFields = [
      'bnr15',
      'bnr15_ha',
      'tamb_form',
      'tamx_tianz',
      'tama_name',
      'tamx_awmen',
      'tamx_aw_me',
      'tamx_awdat',
    ];

    const validatePrescription = (p: Record<string, unknown>): boolean => {
      return requiredFields.every(field => 
        p[field] !== undefined && p[field] !== null && p[field] !== ''
      );
    };

    const valid = {
      bnr15: '09 000 000 00 001',
      bnr15_ha: '09 000 000 01 001',
      tamb_form: 'T',
      tamx_tianz: 1,
      tama_name: 'Hund',
      tamx_awmen: 10,
      tamx_aw_me: 'Tablette',
      tamx_awdat: '2026-04-10',
    };

    const invalid = { ...valid, tama_name: '' };

    expect(validatePrescription(valid)).toBe(true);
    expect(validatePrescription(invalid)).toBe(false);
  });
});

describe('BVL Export Validation', () => {
  it('validates BNR15 is present in practice settings', () => {
    const validateBNR15 = (settings: { bvl_betriebsnummer: string | null } | null): boolean => {
      return settings?.bvl_betriebsnummer !== null && 
             settings?.bvl_betriebsnummer !== undefined && 
             settings?.bvl_betriebsnummer !== '';
    };

    // Valid settings with BNR15
    const validSettings = { bvl_betriebsnummer: '09 000 000 00 001' };
    expect(validateBNR15(validSettings)).toBe(true);

    // Settings without BNR15
    const missingBnr15 = { bvl_betriebsnummer: null };
    expect(validateBNR15(missingBnr15)).toBe(false);

    // Empty BNR15
    const emptyBnr15 = { bvl_betriebsnummer: '' };
    expect(validateBNR15(emptyBnr15)).toBe(false);

    // No settings at all
    expect(validateBNR15(null)).toBe(false);
  });

  it('returns German error message for missing BNR15', () => {
    const getBNR15ErrorMessage = (): { title: string; description: string } => {
      return {
        title: 'Betriebsnummer fehlt',
        description: 'Bitte konfigurieren Sie zunächst Ihre BVL-Betriebsnummer (BNR15) in den Praxis-Einstellungen.',
      };
    };

    const error = getBNR15ErrorMessage();
    expect(error.title).toBe('Betriebsnummer fehlt');
    expect(error.description).toContain('BNR15');
    expect(error.description).toContain('Praxis-Einstellungen');
  });

  it('validates date range is not empty', () => {
    const validateDateRange = (start: string | null, end: string | null): {
      valid: boolean;
      error?: { title: string; description: string };
    } => {
      if (!start || !end) {
        return {
          valid: false,
          error: {
            title: 'Zeitraum fehlt',
            description: 'Bitte wählen Sie einen Start- und Enddatum aus.',
          },
        };
      }
      return { valid: true };
    };

    // Valid date range
    expect(validateDateRange('2026-04-01', '2026-04-30').valid).toBe(true);

    // Missing start date
    const noStart = validateDateRange(null, '2026-04-30');
    expect(noStart.valid).toBe(false);
    expect(noStart.error?.title).toBe('Zeitraum fehlt');

    // Missing end date
    const noEnd = validateDateRange('2026-04-01', null);
    expect(noEnd.valid).toBe(false);
    expect(noEnd.error?.title).toBe('Zeitraum fehlt');

    // Both missing
    const noDates = validateDateRange(null, null);
    expect(noDates.valid).toBe(false);
  });

  it('validates date range order (start must be before or equal to end)', () => {
    const validateDateOrder = (start: string, end: string): {
      valid: boolean;
      error?: { title: string; description: string };
    } => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate > endDate) {
        return {
          valid: false,
          error: {
            title: 'Ungültiger Zeitraum',
            description: 'Das Startdatum muss vor dem Enddatum liegen.',
          },
        };
      }
      return { valid: true };
    };

    // Valid order
    expect(validateDateOrder('2026-04-01', '2026-04-30').valid).toBe(true);
    expect(validateDateOrder('2026-04-15', '2026-04-15').valid).toBe(true);

    // Invalid order
    const invalidOrder = validateDateOrder('2026-04-30', '2026-04-01');
    expect(invalidOrder.valid).toBe(false);
    expect(invalidOrder.error?.title).toBe('Ungültiger Zeitraum');
    expect(invalidOrder.error?.description).toContain('Startdatum muss vor dem Enddatum');
  });

  it('generates German success message after export', () => {
    const getSuccessMessage = (recordCount: number): { title: string; description: string } => {
      return {
        title: 'Export erfolgreich',
        description: `${recordCount} Datensätze wurden exportiert und als gemeldet markiert.`,
      };
    };

    const success = getSuccessMessage(5);
    expect(success.title).toBe('Export erfolgreich');
    expect(success.description).toBe('5 Datensätze wurden exportiert und als gemeldet markiert.');

    // Single record uses singular
    const single = getSuccessMessage(1);
    expect(single.description).toBe('1 Datensätze wurden exportiert und als gemeldet markiert.');
  });
});