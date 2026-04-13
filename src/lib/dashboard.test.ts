import { describe, it, expect } from 'vitest';

describe('TAMG Dashboard Calculations', () => {
  it('calculates total prescriptions correctly', () => {
    const prescriptions = [
      { id: '1', drug_name: 'Amoxicillin', amount: 10 },
      { id: '2', drug_name: 'Enrofloxacin', amount: 5 },
      { id: '3', drug_name: 'Doxycyclin', amount: 7 },
    ];

    const total = prescriptions.length;
    expect(total).toBe(3);
  });

  it('groups prescriptions by drug', () => {
    const prescriptions = [
      { drug_name: 'Amoxicillin', amount: 10 },
      { drug_name: 'Amoxicillin', amount: 15 },
      { drug_name: 'Enrofloxacin', amount: 5 },
    ];

    const grouped = prescriptions.reduce((acc, p) => {
      acc[p.drug_name] = (acc[p.drug_name] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

    expect(grouped['Amoxicillin']).toBe(25);
    expect(grouped['Enrofloxacin']).toBe(5);
  });

  it('calculates percentage by species', () => {
    const prescriptions = [
      { animal_species: 'Hund' },
      { animal_species: 'Hund' },
      { animal_species: 'Katze' },
      { animal_species: 'Katze' },
      { animal_species: 'Rind' },
    ];

    const total = prescriptions.length;
    const bySpecies = prescriptions.reduce((acc, p) => {
      acc[p.animal_species] = (acc[p.animal_species] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hundPercent = (bySpecies['Hund'] / total) * 100;
    expect(hundPercent).toBe(40);
    expect(bySpecies['Hund']).toBe(2);
    expect(bySpecies['Katze']).toBe(2);
    expect(bySpecies['Rind']).toBe(1);
  });

  it('filters prescriptions by date range', () => {
    const prescriptions = [
      { prescribed_at: '2026-04-01' },
      { prescribed_at: '2026-04-05' },
      { prescribed_at: '2026-04-10' },
    ];

    const startDate = '2026-04-01';
    const endDate = '2026-04-07';

    const filtered = prescriptions.filter(p => {
      return p.prescribed_at >= startDate && p.prescribed_at <= endDate;
    });

    expect(filtered).toHaveLength(2);
  });

  it('sorts prescriptions by date descending', () => {
    const prescriptions = [
      { prescribed_at: '2026-04-01', drug_name: 'A' },
      { prescribed_at: '2026-04-10', drug_name: 'B' },
      { prescribed_at: '2026-04-05', drug_name: 'C' },
    ];

    const sorted = [...prescriptions].sort((a, b) =>
      b.prescribed_at.localeCompare(a.prescribed_at)
    );

    expect(sorted[0].drug_name).toBe('B');
    expect(sorted[1].drug_name).toBe('C');
    expect(sorted[2].drug_name).toBe('A');
  });
});

describe('Time Range Filtering', () => {
  it('calculates last 7 days range', () => {
    const now = new Date('2026-04-10');
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);

    expect(last7Days.toISOString().split('T')[0]).toBe('2026-04-03');
  });

  it('calculates last 30 days range', () => {
    const now = new Date('2026-04-10');
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);

    expect(last30Days.toISOString().split('T')[0]).toBe('2026-03-11');
  });

  it('calculates current month range', () => {
    const now = new Date('2026-04-15');
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    expect(startOfMonth.toISOString().split('T')[0]).toBe('2026-04-01');
  });

  it('calculates current quarter range', () => {
    const now = new Date('2026-04-15');
    const quarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);

    expect(startOfQuarter.toISOString().split('T')[0]).toBe('2026-04-01');
  });
});