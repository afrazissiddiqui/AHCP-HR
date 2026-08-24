import {
  calculateIncrementAmount,
  calculateIncrementPercentage,
  pickKpiFieldValue,
} from './add-performance-appraisal';

describe('increment calculations', () => {
  it('calculates the increment amount from the percentage', () => {
    expect(calculateIncrementAmount(50000, 7.5)).toBe(3750);
  });

  it('calculates the increment percentage from the amount', () => {
    expect(calculateIncrementPercentage(50000, 3750)).toBe(7.5);
  });

  it('returns zero when there is no usable current salary', () => {
    expect(calculateIncrementAmount(0, 7.5)).toBe(0);
    expect(calculateIncrementPercentage(0, 3750)).toBe(0);
  });
});

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
