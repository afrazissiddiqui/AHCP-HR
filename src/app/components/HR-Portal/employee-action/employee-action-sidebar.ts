import { SidebarItem, SidebarSection } from '../../sidebar/sidebar';

export const EMPLOYEE_ACTION_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'employee-action-list', label: 'Employee Action List', route: '/employee-action' },
  { id: 'approval-authority-setup', label: 'Approval Authority Setup', route: '/employee-action/approval-authority-setup' }
];

export const EMPLOYEE_ACTION_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'employee-sub-modules',
    title: 'Employee Sub Modules',
    items: [
      { id: 'probation-evaluation-form', label: 'Probation Evaluation Form', route: '/employee-action/probation-evaluation-form' },
      { id: 'training-development-form', label: 'Training & Development Form', route: '/employee-action/training-development-form' },
      { id: 'performance-appraisal-form', label: 'Performance Appraisal Form', route: '/employee-action/performance-appraisal-form' },
      { id: 'expense-reimbursement-form', label: 'Expense Reimbursment Form', route: '/employee-action/expense-reimbursement-form' },
      { id: 'loan-advance-form', label: 'Loan/Advance Form', route: '/employee-action/loan-advance-form' },
      { id: 'leave-application-form', label: 'Leave Application Form', route: '/employee-action/leave-application-form' }
    ]
  }
];
