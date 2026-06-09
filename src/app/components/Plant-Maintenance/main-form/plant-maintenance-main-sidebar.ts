import { SidebarItem, SidebarSection } from '../../sidebar/sidebar';

export const PLANT_MAINTENANCE_MAIN_SIDEBAR_ITEMS: SidebarItem[] = [];

export const PLANT_MAINTENANCE_MAIN_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'plant-maintenance-main-modules',
    title: 'Main Form',
    items: [
      {
        id: 'plant-maintenance-master-form',
        label: 'Plant Maintenance Master Form',
        route: '/plant-maintenance/main-form/plant-maintenance-master-form',
      },
      {
        id: 'husky-form',
        label: 'Husky Form',
        route: '/plant-maintenance/main-form/husky-form',
      },
    ],
  },
];

export function plantMaintenanceMainActiveItemFromUrl(url: string): string {
  if (url.includes('/plant-maintenance/main-form/husky-form')) {
    return 'husky-form';
  }
  if (url.includes('/plant-maintenance/main-form/plant-maintenance-master-form')) {
    return 'plant-maintenance-master-form';
  }
  return 'plant-maintenance-master-form';
}
