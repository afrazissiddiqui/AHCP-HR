/** Routes and labels for every navigable HR form / screen in the app. */
export type HrFormTab = {
  id: string;
  /** Short label for the tab strip (overflows into "More" when needed). */
  tabText: string;
  /** Full title inside the panel. */
  title: string;
  /** Business domain shown as a visual badge in the panel. */
  category: 'Recruitment' | 'Employee Action' | 'Payroll' | 'Leave';
  /** One-line helper to explain form purpose. */
  description: string;
  route: string;
};

export const HR_FORM_TABS: HrFormTab[] = [
  { id: 'recruitment', tabText: 'Recruitment', title: 'Recruitment List', category: 'Recruitment', description: 'Review hiring pipeline and maintain application records.', route: '/recruitment' },
  { id: 'recruitment-create', tabText: 'Job Req.', title: 'Create Job Requisition', category: 'Recruitment', description: 'Raise a new requisition to initiate a hiring request.', route: '/recruitment/create' },
  { id: 'job-spec', tabText: 'Job Spec', title: 'Job Specification Form', category: 'Recruitment', description: 'Define role responsibilities, skills, and requirements.', route: '/job-specification-form' },
  { id: 'job-spec-create', tabText: 'New Job Spec', title: 'Create Job Specification', category: 'Recruitment', description: 'Create a fresh job specification for open positions.', route: '/job-specification-form/create' },
  { id: 'leave-mgmt', tabText: 'Leave Mgmt', title: 'Leave Management', category: 'Leave', description: 'Configure and administer leave rules and requests.', route: '/leave-managment/create' },
  { id: 'employee-action', tabText: 'Emp. Action', title: 'Employee Action List', category: 'Employee Action', description: 'Track all actionable employee forms in one queue.', route: '/employee-action' },
  { id: 'probation', tabText: 'Probation', title: 'Probation Evaluation Form', category: 'Employee Action', description: 'Evaluate probation outcomes for newly hired employees.', route: '/employee-action/probation-evaluation-form' },
  { id: 'training', tabText: 'Training', title: 'Training & Development Form', category: 'Employee Action', description: 'Capture capability-building and development needs.', route: '/employee-action/training-development-form' },
  { id: 'appraisal', tabText: 'Appraisal', title: 'Performance Appraisal Form', category: 'Employee Action', description: 'Record periodic performance assessments and ratings.', route: '/employee-action/performance-appraisal-form' },
  { id: 'expense', tabText: 'Expense', title: 'Expense Reimbursement Form', category: 'Employee Action', description: 'Manage reimbursement submissions and approval flow.', route: '/employee-action/expense-reimbursement-form' },
  { id: 'loan', tabText: 'Loan', title: 'Loan / Advance Form', category: 'Employee Action', description: 'Process employee loan and salary advance requests.', route: '/employee-action/loan-advance-form' },
  { id: 'leave-app', tabText: 'Leave App.', title: 'Leave Application Form', category: 'Leave', description: 'Submit and review individual leave applications.', route: '/employee-action/leave-application-form' },
  { id: 'payroll', tabText: 'Payroll', title: 'Payroll Master', category: 'Payroll', description: 'Access core payroll controls and master setup.', route: '/payroll-master' },
  { id: 'attendance', tabText: 'Attendance', title: 'Attendance Management', category: 'Payroll', description: 'Maintain attendance input used for payroll calculations.', route: '/payroll-master/attendance-managment' },
  { id: 'tax', tabText: 'Tax', title: 'Tax Management', category: 'Payroll', description: 'Configure tax slabs and statutory payroll deductions.', route: '/payroll-master/tax-managment' },
  { id: 'processing', tabText: 'Processing', title: 'Payroll Processing', category: 'Payroll', description: 'Run payroll cycles and review processing outcomes.', route: '/payroll-master/payroll-processing' },
  { id: 'setup', tabText: 'Setup', title: 'Payroll Setup', category: 'Payroll', description: 'Define payroll settings, periods, and core defaults.', route: '/payroll-master/payroll-setup' },
];
