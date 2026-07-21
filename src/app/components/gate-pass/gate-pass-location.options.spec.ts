import { resolveGatePassLocation, resolveGatePassLocationFromBplId } from './gate-pass-location.options';

describe('gate-pass location resolver', () => {
  it('does not force a location from a numeric BPL id', () => {
    expect(resolveGatePassLocation('1')).toBe('');
    expect(resolveGatePassLocation('2')).toBe('');
    expect(resolveGatePassLocation('3')).toBe('');
  });

  it('still resolves known location aliases', () => {
    expect(resolveGatePassLocation('PSH')).toBe('PSH');
    expect(resolveGatePassLocation('Head Office')).toBe('Head Office');
    expect(resolveGatePassLocation('faisalabad')).toBe('FSD');
  });

  it('resolves BPL ids to branch labels', () => {
    expect(resolveGatePassLocationFromBplId('1')).toBe('Peshawar');
    expect(resolveGatePassLocationFromBplId(2)).toBe('HO');
    expect(resolveGatePassLocationFromBplId('3')).toBe('Faisalabad');
  });
});
