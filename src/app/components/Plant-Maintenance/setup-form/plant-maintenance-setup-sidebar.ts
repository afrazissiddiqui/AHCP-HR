import { SidebarItem, SidebarSection } from '../../sidebar/sidebar';

export const PLANT_MAINTENANCE_SETUP_SIDEBAR_ITEMS: SidebarItem[] = [];

export const PLANT_MAINTENANCE_SETUP_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'plant-maintenance-setup-modules',
    title: 'Setup Form',
    items: [
      {
        id: 'sub-component-definition',
        label: 'Sub Component Defination',
        route: '/plant-maintenance/setup-form/sub-component-definition',
        access: { moduleSlug: 'sub_component_defination_form', action: 'list' },
      },
      {
        id: 'maintenance-activity-definition',
        label: 'Maintenance Activity Defination',
        route: '/plant-maintenance/setup-form/maintenance-activity-definition',
        access: { moduleSlug: 'maintenance_activity_defination_form', action: 'list' },
      },
    ],
  },
];

export function plantMaintenanceSetupActiveItemFromUrl(url: string): string {
  if (url.includes('/plant-maintenance/setup-form/maintenance-activity-definition')) {
    return 'maintenance-activity-definition';
  }
  if (url.includes('/plant-maintenance/setup-form/sub-component-definition')) {
    return 'sub-component-definition';
  }
  return 'sub-component-definition';
}
