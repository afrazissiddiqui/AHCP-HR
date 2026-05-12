import { SidebarItem, SidebarSection } from '../../sidebar/sidebar';

export const PAYROLL_MASTER_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'payroll-master-list', label: 'Payroll Master', route: '/payroll-master' }
];

export const PAYROLL_MASTER_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'payroll-sub-modules',
    title: 'Payroll Sub Modules',
    items: [
      { id: 'attendance-managment', label: 'Attendance Managment', route: '/payroll-master/attendance-managment' },
      { id: 'tax-managment', label: 'Tax Managment', route: '/payroll-master/tax-managment' },
      { id: 'payroll-processing', label: 'Payroll Processing', route: '/payroll-master/payroll-processing' },
      { id: 'payroll-setup', label: 'Payroll Setup', route: '/payroll-master/payroll-setup' }
    ]
  }
];
