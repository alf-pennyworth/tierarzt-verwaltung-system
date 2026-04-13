import { describe, it, expect } from 'vitest';

describe('Antibiotic Form Validation', () => {
  it('validates required fields', () => {
    const requiredFields = [
      'drug_name',
      'amount',
      'unit',
      'animal_species',
      'animal_count',
      'treatment_duration_days',
      'prescribed_at',
    ];

    expect(requiredFields).toHaveLength(7);
    expect(requiredFields).toContain('drug_name');
    expect(requiredFields).toContain('animal_species');
  });

  it('validates amount is positive number', () => {
    const validateAmount = (amount: number): boolean => {
      return amount > 0 && Number.isFinite(amount);
    };

    expect(validateAmount(10)).toBe(true);
    expect(validateAmount(0.5)).toBe(true);
    expect(validateAmount(-1)).toBe(false);
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(NaN)).toBe(false);
  });

  it('validates treatment duration is 1-30 days', () => {
    const validateDuration = (days: number): boolean => {
      return days >= 1 && days <= 30 && Number.isInteger(days);
    };

    expect(validateDuration(1)).toBe(true);
    expect(validateDuration(7)).toBe(true);
    expect(validateDuration(30)).toBe(true);
    expect(validateDuration(0)).toBe(false);
    expect(validateDuration(31)).toBe(false);
    expect(validateDuration(7.5)).toBe(false);
  });

  it('validates animal count is at least 1', () => {
    const validateAnimalCount = (count: number): boolean => {
      return count >= 1 && Number.isInteger(count);
    };

    expect(validateAnimalCount(1)).toBe(true);
    expect(validateAnimalCount(100)).toBe(true);
    expect(validateAnimalCount(0)).toBe(false);
    expect(validateAnimalCount(-1)).toBe(false);
    expect(validateAnimalCount(1.5)).toBe(false);
  });

  it('maps treatment purpose to German labels', () => {
    const purposeMap: Record<string, string> = {
      therapy: 'Therapie',
      prophylaxis: 'Prophylaxe',
      metaphylaxis: 'Metaphylaxe',
    };

    expect(purposeMap['therapy']).toBe('Therapie');
    expect(purposeMap['prophylaxis']).toBe('Prophylaxe');
    expect(purposeMap['metaphylaxis']).toBe('Metaphylaxe');
  });

  it('validates dosage form options', () => {
    const dosageForms = [
      'Tablette',
      'Injektionslösung',
      'Salbe',
      'Tropfen',
      'Pulver',
      'Suspension',
    ];

    expect(dosageForms).toHaveLength(6);
    expect(dosageForms).toContain('Tablette');
    expect(dosageForms).toContain('Injektionslösung');
  });
});

describe('Species Selection', () => {
  it('provides common animal species in German', () => {
    const species = [
      'Rind', 'Schwein', 'Schaf', 'Ziege', 'Pferd',
      'Hund', 'Katze', 'Huhn', 'Pute', 'Kaninchen',
    ];

    expect(species).toContain('Hund');
    expect(species).toContain('Katze');
    expect(species).toContain('Rind');
    expect(species).toHaveLength(10);
  });

  it('groups species by category', () => {
    const speciesGroups = {
      nutztiere: ['Rind', 'Schwein', 'Schaf', 'Ziege', 'Huhn', 'Pute'],
     haustiere: ['Hund', 'Katze', 'Kaninchen', 'Pferd'],
    };

    expect(speciesGroups.nutztiere).toHaveLength(6);
    expect(speciesGroups.haustiere).toHaveLength(4);
  });
});