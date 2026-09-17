import { filterTableItems } from './table-filter.util';
import { TableFilterConfig } from './table-filter.types';

describe('filterTableItems', () => {
  it('treats an empty employee code range as the whole list', () => {
    const config: TableFilterConfig = {
      id: 'application-form',
      title: 'Filter applications',
      fields: [
        { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
        { type: 'numberRange', key: 'employeeCode', label: 'Employee code range', fieldKey: 'EmployeeCode' },
      ],
    };

    const records = [
      { Department: 'HR', EmployeeCode: 'Emp-00000001' },
      { Department: 'HR', EmployeeCode: '' },
      { Department: 'IT', EmployeeCode: 'Emp-00000002' },
    ];

    expect(
      filterTableItems(records, config, {
        department: 'HR',
        employeeCode: { from: null, to: null },
      }),
    ).toEqual(records.slice(0, 2));
  });
});