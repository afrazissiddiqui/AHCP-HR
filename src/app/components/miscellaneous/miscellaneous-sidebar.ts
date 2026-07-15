import { SidebarItem, SidebarSection } from '../sidebar/sidebar';

export const MISCELLANEOUS_SIDEBAR_ITEMS: SidebarItem[] = [];

export const MISCELLANEOUS_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'miscellaneous-actions',
    title: 'SAP Form',
    items: [
      {
        id: 'miscellaneous-good-receipt-note',
        label: 'Good Receipt',
        route: '/miscellaneous/good-receipt-note',
      },
      {
        id: 'miscellaneous-good-issue',
        label: 'Good Issue',
        route: '/miscellaneous/good-issue',
      },
      {
        id: 'miscellaneous-delivery',
        label: 'Delivery',
        route: '/miscellaneous/delivery',
      },
      {
        id: 'miscellaneous-inventory-transfer',
        label: 'Inventory transfer',
        route: '/miscellaneous/inventory-transfer',
      },
      {
        id: 'miscellaneous-inventory-transfer-request',
        label: 'Inventory transfer Request',
        route: '/miscellaneous/inventory-transfer-request',
      },
      {
        id: 'miscellaneous-receipt-from-production',
        label: 'Receipt From Production',
        route: '/miscellaneous/receipt-from-production',
      },
      {
        id: 'miscellaneous-sample-inspection-request',
        label: 'Sample Inspection Request',
        route: '/miscellaneous/sample-inspection-request',
      },
    ],
  },
];

export function miscellaneousActiveItemFromUrl(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  if (/\/miscellaneous\/?$/.test(path)) {
    return '';
  }
  if (url.includes('/miscellaneous/sample-inspection-request')) {
    return 'miscellaneous-sample-inspection-request';
  }
  if (url.includes('/miscellaneous/receipt-from-production')) {
    return 'miscellaneous-receipt-from-production';
  }
  if (url.includes('/miscellaneous/delivery')) {
    return 'miscellaneous-delivery';
  }
  if (url.includes('/miscellaneous/inventory-transfer-request')) {
    return 'miscellaneous-inventory-transfer-request';
  }
  if (url.includes('/miscellaneous/inventory-transfer')) {
    return 'miscellaneous-inventory-transfer';
  }
  if (url.includes('/miscellaneous/good-issue')) {
    return 'miscellaneous-good-issue';
  }
  if (url.includes('/miscellaneous/good-receipt-note')) {
    return 'miscellaneous-good-receipt-note';
  }
  return '';
}
