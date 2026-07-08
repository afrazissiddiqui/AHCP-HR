import { AccessRequirement } from '../../utils/access-requirement.util';

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
  access?: AccessRequirement;
};

export const HR_FORM_TABS: HrFormTab[] = [
  { id: 'recruitment', tabText: 'Recruitment', title: 'Recruitment List', category: 'Recruitment', description: 'Review hiring pipeline and maintain application records.', route: '/recruitment', access: { moduleSlug: 'application_form', action: 'list' } },
  { id: 'recruitment-create', tabText: 'Job Req.', title: 'Create Job Requisition', category: 'Recruitment', description: 'Raise a new requisition to initiate a hiring request.', route: '/recruitment/create', access: { moduleSlug: 'application_form', action: 'add' } },
  { id: 'job-spec', tabText: 'Job Spec', title: 'Job Specification Form', category: 'Recruitment', description: 'Define role responsibilities, skills, and requirements.', route: '/job-specification-form', access: { moduleSlug: 'job_specification', action: 'list' } },
  { id: 'job-spec-create', tabText: 'New Job Spec', title: 'Create Job Specification', category: 'Recruitment', description: 'Create a fresh job specification for open positions.', route: '/job-specification-form/create', access: { moduleSlug: 'job_specification', action: 'add' } },
  { id: 'leave-mgmt', tabText: 'Leave Mgmt', title: 'Leave Management', category: 'Leave', description: 'Configure and administer leave rules and requests.', route: '/employee-action/leave-application-form', access: { moduleSlug: 'leave_application_form', action: 'list' } },
  { id: 'employee-action', tabText: 'Emp. Action', title: 'Employee Action List', category: 'Employee Action', description: 'Track all actionable employee forms in one queue.', route: '/employee-action', access: { anyOf: [
    { moduleSlug: 'probation_evaluation_form', action: 'list' },
    { moduleSlug: 'training_development_form', action: 'list' },
    { moduleSlug: 'performance_appraisal_form', action: 'list' },
    { moduleSlug: 'expense_reimbursment_form', action: 'list' },
    { moduleSlug: 'loan_advance_form', action: 'list' },
    { moduleSlug: 'leave_application_form', action: 'list' },
  ] } },
  { id: 'probation', tabText: 'Probation', title: 'Probation Evaluation Form', category: 'Employee Action', description: 'Evaluate probation outcomes for newly hired employees.', route: '/employee-action/probation-evaluation-form', access: { moduleSlug: 'probation_evaluation_form', action: 'list' } },
  { id: 'training', tabText: 'Training', title: 'Training & Development Form', category: 'Employee Action', description: 'Capture capability-building and development needs.', route: '/employee-action/training-development-form', access: { moduleSlug: 'training_development_form', action: 'list' } },
  { id: 'appraisal', tabText: 'Appraisal', title: 'Performance Appraisal Form', category: 'Employee Action', description: 'Record periodic performance assessments and ratings.', route: '/employee-action/performance-appraisal-form', access: { moduleSlug: 'performance_appraisal_form', action: 'list' } },
  { id: 'expense', tabText: 'Expense', title: 'Expense Reimbursement Form', category: 'Employee Action', description: 'Manage reimbursement submissions and approval flow.', route: '/employee-action/expense-reimbursement-form', access: { moduleSlug: 'expense_reimbursment_form', action: 'list' } },
  { id: 'loan', tabText: 'Loan', title: 'Loan / Advance Form', category: 'Employee Action', description: 'Process employee loan and salary advance requests.', route: '/employee-action/loan-advance-form', access: { moduleSlug: 'loan_advance_form', action: 'list' } },
  { id: 'leave-app', tabText: 'Leave App.', title: 'Leave Application Form', category: 'Leave', description: 'Submit and review individual leave applications.', route: '/employee-action/leave-application-form', access: { moduleSlug: 'leave_application_form', action: 'list' } },
  { id: 'processing', tabText: 'Processing', title: 'Payroll Processing', category: 'Payroll', description: 'Run payroll cycles and review processing outcomes.', route: '/payroll-master', access: { moduleSlug: 'payroll_processing_form', action: 'list' } },
  { id: 'attendance', tabText: 'Attendance', title: 'Attendance Management', category: 'Payroll', description: 'Maintain attendance input used for payroll calculations.', route: '/payroll-master/attendance-managment', access: { moduleSlug: 'attendance_managment_form', action: 'list' } },
  { id: 'tax', tabText: 'Tax Allowance', title: 'Tax Allowance Form', category: 'Payroll', description: 'Map payroll components to GL codes for tax allowance posting.', route: '/payroll-master/tax-managment', access: { moduleSlug: 'tax_allowance_form', action: 'list' } },
  { id: 'tax-computation', tabText: 'Tax Compute', title: 'Tax Computation', category: 'Payroll', description: 'Review employee payroll components and compute tax from salary breakdown.', route: '/payroll-master/tax-computation', access: { moduleSlug: 'tax_computation_form', action: 'list' } },
  // { id: 'setup', tabText: 'Setup', title: 'Payroll Setup', category: 'Payroll', description: 'Define payroll settings, periods, and core defaults.', route: '/payroll-master/payroll-setup' },
];
