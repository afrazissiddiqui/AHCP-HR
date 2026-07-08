import { SidebarItem, SidebarSection } from '../../sidebar/sidebar';

export const EMPLOYEE_ACTION_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'employee-action-list', label: 'Employee Action List', route: '/employee-action' },
];

export const EMPLOYEE_ACTION_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'employee-sub-modules',
    title: 'Employee Sub Modules',
    items: [
      { id: 'probation-evaluation-form', label: 'Probation Evaluation Form', route: '/employee-action/probation-evaluation-form', access: { moduleSlug: 'probation_evaluation_form', action: 'list' } },
      { id: 'training-development-form', label: 'Training & Development Form', route: '/employee-action/training-development-form', access: { moduleSlug: 'training_development_form', action: 'list' } },
      { id: 'performance-appraisal-form', label: 'Performance Appraisal Form', route: '/employee-action/performance-appraisal-form', access: { moduleSlug: 'performance_appraisal_form', action: 'list' } },
      { id: 'expense-reimbursement-form', label: 'Expense Reimbursment Form', route: '/employee-action/expense-reimbursement-form', access: { moduleSlug: 'expense_reimbursment_form', action: 'list' } },
      { id: 'loan-advance-form', label: 'Loan/Advance Form', route: '/employee-action/loan-advance-form', access: { moduleSlug: 'loan_advance_form', action: 'list' } },
      { id: 'leave-application-form', label: 'Leave Application Form', route: '/employee-action/leave-application-form', access: { moduleSlug: 'leave_application_form', action: 'list' } }
    ]
  }
];
