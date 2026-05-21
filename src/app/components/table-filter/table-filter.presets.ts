import { TableFilterConfig } from './table-filter.types';

/** Application Form / Recruitment list — import and pass to `app-table-filter`. */
export const APPLICATION_FORM_TABLE_FILTER: TableFilterConfig = {
  id: 'application-form',
  title: 'Filter applications',
  fields: [
    { type: 'select', key: 'employeeNature', label: 'Employee nature', fieldKey: 'EmployeeNature' },
    { type: 'select', key: 'reportingManager', label: 'Reporting manager', fieldKey: 'ReportingManager' },
    { type: 'select', key: 'employmentType', label: 'Employment type', fieldKey: 'EmploymentType' },
    { type: 'status', key: 'status', label: 'Status', fieldKey: 'status' },
    {
      type: 'numberRange',
      key: 'employeeCode',
      label: 'Employee code range',
      fieldKey: 'EmployeeCode',
      fromPlaceholder: 'Min code',
      toPlaceholder: 'Max code',
    },
  ],
};

/**
 * Example: Termination list — add `app-table-filter` to toolbar and call
 * `tableFilterService.filterItems(list, TERMINATION_TABLE_FILTER)` in `filteredList`.
 */
export const TERMINATION_TABLE_FILTER: TableFilterConfig = {
  id: 'termination-form',
  title: 'Filter terminations',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'designation', label: 'Designation', fieldKey: 'Designation' },
    { type: 'select', key: 'branchLocation', label: 'Branch / location', fieldKey: 'BranchLocation' },
    {
      type: 'numberRange',
      key: 'employeeId',
      label: 'Employee ID range',
      fieldKey: 'EmployeeId',
      fromPlaceholder: 'Min ID',
      toPlaceholder: 'Max ID',
    },
  ],
};
