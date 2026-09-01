import { buildMachinePayload } from './sub-component-definition.service';

describe('buildMachinePayload', () => {
  it('includes the selected location in the payload', () => {
    expect(
      buildMachinePayload({
        machineId: 'M-001',
        machineName: 'Main Machine',
        machineType: 'Blowing',
        location: 'AHCP_Peshawar',
        subComponents: ['Rotor', 'Gear'],
      }),
    ).toEqual({
      machine_id: 'M-001',
      machine_name: 'Main Machine',
      machine_type: 'Blowing',
      location: 'AHCP_Peshawar',
      sub_components: [{ name: 'Rotor' }, { name: 'Gear' }],
    });
  });
});
