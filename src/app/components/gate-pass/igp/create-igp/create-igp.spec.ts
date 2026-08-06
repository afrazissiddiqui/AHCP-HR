import { normalizeGatePassString } from './create-igp';

describe('normalizeGatePassString', () => {
  it('converts undefined and dash placeholders to empty strings', () => {
    expect(normalizeGatePassString(undefined)).toBe('');
    expect(normalizeGatePassString('—')).toBe('');
    expect(normalizeGatePassString('  ')).toBe('');
  });

  it('trims normal string values', () => {
    expect(normalizeGatePassString('  ABC  ')).toBe('ABC');
  });
});
