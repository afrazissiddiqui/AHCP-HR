/** Maps route path (no leading slash) to the single HR portal shellbar title. */
const EXACT_TITLES: Record<string, string> = {
  dashboard: 'Home',
  profile: 'View profile',
  'forms-hub': 'All Forms',
  login: 'Sign in',
  recruitment: 'Recruitment',
  'recruitment/create': 'Application Form',
  'job-specification-form': 'Job Specification',
  'job-specification-form/create': 'Create Job Specification',
  'job-specification-form/edit': 'Update Job Specification',
  'employee-action': 'Employee Action',
  'employee-action/approval-authority-setup': 'Approval Setup',
  'employee-action/probation-evaluation-form': 'Probation Evaluation Form',
  'employee-action/probation-evaluation-form/create': 'Probation Evaluation Form',
  'employee-action/probation-evaluation-form/edit': 'Update Probation Evaluation',
  'employee-action/training-development-form': 'Training & Development Form',
  'employee-action/training-development-form/create': 'Training & Development Form',
  'employee-action/training-development-form/edit': 'Update Training & Development',
  'employee-action/performance-appraisal-form': 'Performance Appraisal Form',
  'employee-action/performance-appraisal-form/create': 'Performance Appraisal Form',
  'employee-action/performance-appraisal-form/edit': 'Update Performance Appraisal',
  'employee-action/expense-reimbursement-form': 'Expense Reimbursement Form',
  'employee-action/expense-reimbursement-form/create': 'Expense Reimbursement Form',
  'employee-action/expense-reimbursement-form/edit': 'Update Expense Reimbursement',
  'employee-action/loan-advance-form': 'Loan / Advance Form',
  'employee-action/loan-advance-form/create': 'Loan / Advance Form',
  'employee-action/leave-application-form': 'Leave Application Form',
  'employee-action/leave-application-form/create': 'Leave Application Form',
  'employee-action/leave-application-form/edit': 'Update Leave Request',
  termination: 'Termination',
  'termination/create': 'Termination Form',
  'payroll-master': 'Payroll Master',
  'payroll-master/attendance-managment': 'Attendance Management',
  'payroll-master/tax-managment': 'Tax Allowance Form',
  'payroll-master/tax-computation': 'Tax Computation',
  'payroll-master/payroll-processing': 'Payroll Processing',
  'payroll-master/payroll-setup': 'Payroll Setup',
  miscellaneous: 'Miscellaneous',
  'miscellaneous/good-receipt-note': 'Good Receipt Note',
  'miscellaneous/delivery': 'Delivery',
  'miscellaneous/inventory-transfer': 'Inventory transfer',
  'miscellaneous/good-issue': 'Good Issue',
  'gate-pass': 'Gate Pass',
  'gate-pass/ogp': 'OGP',
  'gate-pass/agp': 'AGP',
  'gate-pass/igp': 'IGP',
  'plant-maintenance/main-form': 'Main Form',
  'plant-maintenance/main-form/plant-maintenance-master-form': 'Plant Maintenance Master Form',
  'plant-maintenance/main-form/plant-maintenance-master-form/create': 'Add Machine',
  'plant-maintenance/main-form/husky-form': 'Husky Form',
  'plant-maintenance/main-form/husky-form/create': 'Add Husky Form',
  'plant-maintenance/setup-form': 'Setup Form',
  'plant-maintenance/setup-form/sub-component-definition': 'Sub Component Defination',
  'plant-maintenance/setup-form/sub-component-definition/create': 'Add Machine',
  'plant-maintenance/setup-form/maintenance-activity-definition': 'Maintenance Activity Defination',
  'plant-maintenance/setup-form/maintenance-activity-definition/create': 'Add Machine',
};

const PREFIX_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: 'gate-pass/ogp', title: 'OGP' },
  { prefix: 'gate-pass/agp', title: 'AGP' },
  { prefix: 'gate-pass/igp', title: 'IGP' },
  { prefix: 'payroll-master', title: 'Payroll Master' },
  { prefix: 'miscellaneous', title: 'Miscellaneous' },
  { prefix: 'employee-action', title: 'Employee Action' },
  { prefix: 'termination', title: 'Termination' },
  { prefix: 'job-specification-form', title: 'Job Specification' },
  { prefix: 'recruitment', title: 'Recruitment' },
  { prefix: 'gate-pass', title: 'Gate Pass' },
  { prefix: 'plant-maintenance/setup-form/sub-component-definition/edit', title: 'Update Machine' },
  { prefix: 'plant-maintenance/setup-form/maintenance-activity-definition/edit', title: 'Update Machine' },
  { prefix: 'plant-maintenance/main-form/plant-maintenance-master-form/edit', title: 'Update Machine' },
  { prefix: 'plant-maintenance/main-form/husky-form/edit', title: 'Update Husky Form' },
  { prefix: 'plant-maintenance', title: 'Plant maintenance' },
];

const NON_SEARCH_ROUTE_KEYS = new Set([
  '',
  'login',
  'dashboard',
  'profile',
  'forms-hub',
  'employee-action/approval-authority-setup',
]);

export function isShellbarSearchRoute(routeKey: string): boolean {
  const key = routeKey.replace(/^\//, '').replace(/\/$/, '');
  if (NON_SEARCH_ROUTE_KEYS.has(key)) {
    return false;
  }
  if (/(^|\/)(create|edit)(\/|$)/.test(key)) {
    return false;
  }
  return true;
}

export function resolveShellbarSearchPlaceholder(routeKey: string): string {
  const title = resolveShellbarTitle(routeKey);
  return `Search ${title} list…`;
}

export function resolveShellbarTitle(routeKey: string): string {
  const key = routeKey.replace(/^\//, '').replace(/\/$/, '');
  if (!key) {
    return 'Home';
  }
  if (EXACT_TITLES[key]) {
    return EXACT_TITLES[key];
  }
  for (const { prefix, title } of PREFIX_TITLES) {
    if (key === prefix || key.startsWith(`${prefix}/`)) {
      return title;
    }
  }
  return 'Home';
}
