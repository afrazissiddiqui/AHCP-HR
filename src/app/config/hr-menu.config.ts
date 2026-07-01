export interface HrMenuOption {
  label: string;
  value: string;
  icon: string;
  route?: string;
  children?: HrMenuOption[];
}

export interface HrMenuAction {
  label: string;
  icon: string;
  route: string;
  value: string;
}

/** HR shellbar dropdown — single source for navigation targets. */
export const HR_MENU_OPTIONS: HrMenuOption[] = [
  { label: 'Home', value: 'dashboard', icon: 'home', route: '/dashboard' },
  {
    label: 'HR',
    value: 'hr',
    icon: 'employee',
    children: [
      { label: 'Recruitment', value: 'recruitment', icon: 'employee-pane', route: '/recruitment' },
      { label: 'Employee Action', value: 'employee-action', icon: 'employee', route: '/employee-action' },
      { label: 'Payroll', value: 'payroll-master', icon: 'opportunities', route: '/payroll-master' },
      { label: 'Termination', value: 'termination', icon: 'feedback', route: '/termination' },
    ],
  },
  { label: 'Gate Pass', value: 'gate-pass/ogp', icon: 'shipping-status', route: '/gate-pass' },
  { label: 'Miscellaneous', value: 'miscellaneous', icon: 'grid', route: '/miscellaneous' },
  {
    label: 'Plant maintenance',
    value: 'plant-maintenance',
    icon: 'factory',
    children: [
      {
        label: 'Main Form',
        value: 'plant-maintenance/main-form',
        icon: 'form',
        route: '/plant-maintenance/main-form',
      },
      {
        label: 'Setup Form',
        value: 'plant-maintenance/setup-form',
        icon: 'settings',
        route: '/plant-maintenance/setup-form',
      },
    ],
  },
  {
    label: 'Setup',
    value: 'setup',
    icon: 'settings',
    children: [
      {
        label: 'GL Account Determination',
        value: 'setup/gl-account-determination',
        icon: 'account',
        route: '/setup/gl-account-determination',
      },
      {
        label: 'User Setup',
        value: 'setup/user-setup',
        icon: 'employee',
        route: '/setup/user-setup',
      },
    ],
  },
  { label: 'Continuous Performance', value: 'continuous-performance', icon: 'performance' },
  { label: 'Development', value: 'development', icon: 'learning-assistant' },
  { label: 'Goals', value: 'goals', icon: 'goal' },
  
  { label: 'Learning', value: 'learning', icon: 'learning-assistant' },
  { label: 'Org Chart', value: 'org-chart', icon: 'org-chart' },
  { label: 'Performance', value: 'performance', icon: 'performance' },
  { label: 'Succession', value: 'succession', icon: 'family-care' },
];

/** Flat list of menu entries that have a route (for dashboard action bar, etc.). */
export function getNavigableHrMenuActions(options: HrMenuOption[] = HR_MENU_OPTIONS): HrMenuAction[] {
  const actions: HrMenuAction[] = [];

  for (const option of options) {
    if (option.value === 'login') {
      continue;
    }

    if (option.children?.length) {
      for (const child of option.children) {
        if (child.route) {
          actions.push({
            label: child.label,
            icon: child.icon,
            route: child.route,
            value: child.value,
          });
        }
      }
      continue;
    }

    if (option.route) {
      actions.push({
        label: option.label,
        icon: option.icon,
        route: option.route,
        value: option.value,
      });
    }
  }

  return actions;
}
