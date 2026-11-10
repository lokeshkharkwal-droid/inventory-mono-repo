import { isBloodCompatible } from './bloodbank.service';

describe('isBloodCompatible (ABO/Rh donor → recipient)', () => {
  it('O- is the universal donor', () => {
    for (const r of ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']) {
      expect(isBloodCompatible('O-', r)).toBe(true);
    }
  });

  it('AB+ is the universal recipient', () => {
    for (const d of ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']) {
      expect(isBloodCompatible(d, 'AB+')).toBe(true);
    }
  });

  it('an Rh+ donor cannot give to an Rh- recipient', () => {
    expect(isBloodCompatible('O+', 'O-')).toBe(false);
    expect(isBloodCompatible('A+', 'A-')).toBe(false);
  });

  it('enforces ABO compatibility', () => {
    expect(isBloodCompatible('A+', 'B+')).toBe(false);
    expect(isBloodCompatible('B+', 'A+')).toBe(false);
    expect(isBloodCompatible('A+', 'AB+')).toBe(true);
    expect(isBloodCompatible('A-', 'A+')).toBe(true);
  });

  it('matches same-type donations', () => {
    expect(isBloodCompatible('AB-', 'AB-')).toBe(true);
    expect(isBloodCompatible('B-', 'B+')).toBe(true);
  });
});
