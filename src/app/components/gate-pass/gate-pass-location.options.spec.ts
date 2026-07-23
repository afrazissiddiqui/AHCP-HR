import { resolveGatePassLocation, resolveGatePassLocationFromBplId } from './gate-pass-location.options';

describe('gate-pass location resolver', () => {
  it('resolves numeric BPL ids to known dropdown values', () => {
    expect(resolveGatePassLocation('1')).toBe('PSH');
    expect(resolveGatePassLocation('2')).toBe('Head Office');
    expect(resolveGatePassLocation('3')).toBe('FSD');
  });

  it('still resolves known location aliases', () => {
    expect(resolveGatePassLocation('PSH')).toBe('PSH');
    expect(resolveGatePassLocation('Head Office')).toBe('Head Office');
    expect(resolveGatePassLocation('faisalabad')).toBe('FSD');
    expect(resolveGatePassLocation('AHCP_Peshawar')).toBe('PSH');
    expect(resolveGatePassLocation('AHCP_Faisalabad')).toBe('FSD');
  });

  it('resolves BPL ids to branch labels', () => {
    expect(resolveGatePassLocationFromBplId('1')).toBe('PSH');
    expect(resolveGatePassLocationFromBplId(2)).toBe('Head Office');
    expect(resolveGatePassLocationFromBplId('3')).toBe('FSD');
  });
});
