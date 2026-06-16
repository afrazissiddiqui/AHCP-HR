import { SidebarItem, SidebarSection } from '../sidebar/sidebar';

export const MISCELLANEOUS_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'miscellaneous-good-receipt-note',
    label: 'Good Receipt Note',
    route: '/miscellaneous/good-receipt-note',
  },
];

export const MISCELLANEOUS_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'miscellaneous-actions',
    title: 'Miscellaneous',
    items: [
      {
        id: 'miscellaneous-good-receipt-note',
        label: 'Good Receipt Note',
        route: '/miscellaneous/good-receipt-note',
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
        id: 'miscellaneous-good-issue',
        label: 'Good Issue',
        route: '/miscellaneous/good-issue',
      },
    ],
  },
];

export function miscellaneousActiveItemFromUrl(url: string): string {
  if (url.includes('/miscellaneous/delivery')) {
    return 'miscellaneous-delivery';
  }
  if (url.includes('/miscellaneous/inventory-transfer')) {
    return 'miscellaneous-inventory-transfer';
  }
  if (url.includes('/miscellaneous/good-issue')) {
    return 'miscellaneous-good-issue';
  }
  return 'miscellaneous-good-receipt-note';
}
