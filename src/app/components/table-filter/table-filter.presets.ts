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

/** Job Specification Form list — import and pass to `app-table-filter`. */
export const JOB_SPECIFICATION_TABLE_FILTER: TableFilterConfig = {
  id: 'job-specification-form',
  title: 'Filter job specifications',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'department' },
    { type: 'select', key: 'employmentCategory', label: 'Employment category', fieldKey: 'employmentCategory' },
    { type: 'select', key: 'employmentNature', label: 'Employment nature', fieldKey: 'employmentNature' },
    { type: 'select', key: 'employmentType', label: 'Employment type', fieldKey: 'employmentType' },
    { type: 'select', key: 'gradeWorkLevel', label: 'Grade / work level', fieldKey: 'gradeWorkLevel' },
    {
      type: 'numberRange',
      key: 'vacancyCount',
      label: 'Vacancy count range',
      fieldKey: 'vacancyCount',
      fromPlaceholder: 'Min count',
      toPlaceholder: 'Max count',
    },
    {
      type: 'numberRange',
      key: 'jobId',
      label: 'Job ID range',
      fieldKey: 'Id',
      fromPlaceholder: 'Min ID',
      toPlaceholder: 'Max ID',
    },
  ],
};

/** Employee Action main list — same fields as application form records. */
export const EMPLOYEE_ACTION_TABLE_FILTER: TableFilterConfig = {
  id: 'employee-action',
  title: 'Filter employees',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'employeeNature', label: 'Employee nature', fieldKey: 'EmployeeNature' },
    { type: 'select', key: 'designation', label: 'Designation', fieldKey: 'Designation' },
    { type: 'select', key: 'reportingManager', label: 'Reporting manager', fieldKey: 'ReportingManager' },
    { type: 'select', key: 'employmentType', label: 'Employment type', fieldKey: 'EmploymentType' },
    { type: 'select', key: 'employmentCategory', label: 'Employment category', fieldKey: 'EmploymentCategory' },
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

/** Leave Application Form list. */
export const LEAVE_APPLICATION_TABLE_FILTER: TableFilterConfig = {
  id: 'leave-application-form',
  title: 'Filter leave applications',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'leaveType', label: 'Leave type', fieldKey: 'LeaveType' },
    { type: 'select', key: 'approvalStatus', label: 'Approval status', fieldKey: 'ApprovalStatus' },
    {
      type: 'numberRange',
      key: 'employeeId',
      label: 'Employee ID range',
      fieldKey: 'EmployeeID',
      fromPlaceholder: 'Min ID',
      toPlaceholder: 'Max ID',
    },
  ],
};

/** Loan / Advance Form list. */
export const LOAN_ADVANCE_TABLE_FILTER: TableFilterConfig = {
  id: 'loan-advance-form',
  title: 'Filter loan / advance requests',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'requestType', label: 'Request type', fieldKey: 'RequestType' },
    { type: 'select', key: 'approvalStatus', label: 'Approval status', fieldKey: 'ApprovalStatus' },
    {
      type: 'numberRange',
      key: 'employeeId',
      label: 'Employee ID range',
      fieldKey: 'EmployeeID',
      fromPlaceholder: 'Min ID',
      toPlaceholder: 'Max ID',
    },
  ],
};

/** Expense Reimbursement Form list. */
export const EXPENSE_REIMBURSEMENT_TABLE_FILTER: TableFilterConfig = {
  id: 'expense-reimbursement-form',
  title: 'Filter expense claims',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'expenseType', label: 'Expense type', fieldKey: 'ExpenseType' },
    { type: 'select', key: 'approvalStatus', label: 'Approval status', fieldKey: 'ApprovalStatus' },
    { type: 'select', key: 'employeeId', label: 'Employee ID', fieldKey: 'EmployeeId' },
  ],
};

/** Performance Appraisal Form list. */
export const PERFORMANCE_APPRAISAL_TABLE_FILTER: TableFilterConfig = {
  id: 'performance-appraisal-form',
  title: 'Filter performance appraisals',
  fields: [
    { type: 'select', key: 'employeeCategory', label: 'Employee category', fieldKey: 'EmployeeCategory' },
    { type: 'select', key: 'employmentType', label: 'Employment type', fieldKey: 'EmploymentType' },
    { type: 'select', key: 'appraisalAuthority', label: 'Appraisal authority', fieldKey: 'AppraisalAuthority' },
    { type: 'select', key: 'employeeId', label: 'Employee ID', fieldKey: 'EmployeeId' },
  ],
};

/** Training & Development Form list. */
export const TRAINING_DEVELOPMENT_TABLE_FILTER: TableFilterConfig = {
  id: 'training-development-form',
  title: 'Filter training records',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'employmentNature', label: 'Employment nature', fieldKey: 'EmploymentNature' },
    { type: 'select', key: 'trainingCategory', label: 'Training category', fieldKey: 'TrainingCategory' },
    { type: 'select', key: 'trainingStage', label: 'Training stage', fieldKey: 'TrainingStage' },
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

/** Probation Evaluation Form list. */
export const PROBATION_EVALUATION_TABLE_FILTER: TableFilterConfig = {
  id: 'probation-evaluation-form',
  title: 'Filter probation evaluations',
  fields: [
    { type: 'select', key: 'department', label: 'Department', fieldKey: 'Department' },
    { type: 'select', key: 'designation', label: 'Designation', fieldKey: 'Designation' },
    { type: 'select', key: 'employeeNature', label: 'Employment nature', fieldKey: 'EmployeeNature' },
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
