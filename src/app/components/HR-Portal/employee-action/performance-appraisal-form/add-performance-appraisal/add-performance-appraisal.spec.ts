import { pickKpiFieldValue } from './add-performance-appraisal';

describe('pickKpiFieldValue', () => {
  it('returns the definition text from the commonly used KPI field names', () => {
    const row = {
      defination_measurement: 'Monthly production target achievement',
    };

    expect(pickKpiFieldValue(row, ['defination_measurement', 'definition_measurement', 'definition_measure'])).toBe(
      'Monthly production target achievement',
    );
  });

  it('falls back to a case-insensitive match when the payload uses a different casing', () => {
    const row = {
      Definition_Measurement: 'Quality compliance checks',
    };

    expect(pickKpiFieldValue(row, ['defination_measurement', 'definition_measurement', 'definition_measure'])).toBe(
      'Quality compliance checks',
    );
  });
});
