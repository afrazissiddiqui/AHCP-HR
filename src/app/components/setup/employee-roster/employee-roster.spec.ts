import { ApplicationFormRecord, EmployeeRosterListRecord } from '../../../services/application-form.service';
import { findUnassignedEmployees } from './employee-roster';

describe('findUnassignedEmployees', () => {
  it('does not mark an employee unassigned when a roster record has no shift value', () => {
    const employee = {
      EmployeeCode: 'Emp-00000042',
      detail: { hrSettings: { attendanceShiftManagement: 'Yes' } },
    } as ApplicationFormRecord;
    const rosterEntry = {
      employee_id: 'Emp-00000042',
      shift: '',
    } as EmployeeRosterListRecord;

    expect(findUnassignedEmployees([employee], [rosterEntry])).toEqual([]);
  });

  it('matches legacy employee IDs to their canonical roster ID', () => {
    const employee = {
      EmployeeCode: 'Emp-00003283',
      detail: { hrSettings: { attendanceShiftManagement: 'Yes' } },
    } as ApplicationFormRecord;
    const rosterEntry = {
      employee_id: 'Emp-00000254',
      shift: 'M',
    } as EmployeeRosterListRecord;

    expect(findUnassignedEmployees([employee], [rosterEntry])).toEqual([]);
  });
});