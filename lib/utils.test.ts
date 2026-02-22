import { COUNTRIES } from './utils';

describe('COUNTRIES Constant Integrity', () => {
  it('should be an array', () => {
    expect(Array.isArray(COUNTRIES)).toBe(true);
  });

  it('should contain strings only', () => {
    COUNTRIES.forEach((country) => {
      expect(typeof country).toBe('string');
      expect(country.length).toBeGreaterThan(0);
    });
  });

  it('should not be empty', () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
  });

  it('should contain expected key countries', () => {
    const expectedCountries = [
      "United States",
      "United Kingdom",
      "Canada",
      "Australia",
      "Germany",
      "France",
    ];
    expectedCountries.forEach((country) => {
      expect(COUNTRIES).toContain(country);
    });
  });

  it('should have at least the initial set of countries', () => {
     expect(COUNTRIES.length).toBeGreaterThanOrEqual(14);
  });

  it('should not contain duplicates', () => {
     const uniqueCountries = new Set(COUNTRIES);
     expect(uniqueCountries.size).toBe(COUNTRIES.length);
  });
});
