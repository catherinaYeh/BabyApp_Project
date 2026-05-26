import { ageInMonths } from '../../src/lib/ageInMonths.js';

describe('ageInMonths', () => {
  test('exact 6 months on the birthday', () => {
    expect(ageInMonths(new Date('2025-11-15'), new Date('2026-05-15'))).toBe(6);
  });

  test('one day before birthday rolls back', () => {
    expect(ageInMonths(new Date('2025-11-15'), new Date('2026-05-14'))).toBe(5);
  });

  test('0 months when same month as birth', () => {
    expect(ageInMonths(new Date('2026-05-20'), new Date('2026-05-26'))).toBe(0);
  });

  test('cross-year calculation', () => {
    expect(ageInMonths(new Date('2025-03-10'), new Date('2026-05-26'))).toBe(14);
  });

  test('passes "on" date defaulting to now does not throw', () => {
    expect(typeof ageInMonths(new Date('2025-01-01'))).toBe('number');
  });
});
