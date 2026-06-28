import { SidebarItem, SidebarSection } from '../../sidebar/sidebar';

export const PAYROLL_MASTER_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'payroll-processing', label: 'Payroll Processing', route: '/payroll-master' }
];

export const PAYROLL_MASTER_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'payroll-sub-modules',
    title: 'Payroll Sub Modules',
    items: [
      { id: 'attendance-managment', label: 'Attendance Managment', route: '/payroll-master/attendance-managment' },
      { id: 'tax-managment', label: 'Tax Allowance Form', route: '/payroll-master/tax-managment' },
      { id: 'tax-computation', label: 'Tax Computation', route: '/payroll-master/tax-computation' },
      { id: 'payroll-setup', label: 'Payroll Setup', route: '/payroll-master/payroll-setup' }
    ]
  }
];

export function payrollMasterActiveItemFromUrl(url: string): string {
  if (url.includes('/payroll-master/attendance-managment')) {
    return 'attendance-managment';
  }
  if (url.includes('/payroll-master/tax-managment')) {
    return 'tax-managment';
  }
  if (url.includes('/payroll-master/tax-computation')) {
    return 'tax-computation';
  }
  if (url.includes('/payroll-master/payroll-setup')) {
    return 'payroll-setup';
  }
  return 'payroll-processing';
}

