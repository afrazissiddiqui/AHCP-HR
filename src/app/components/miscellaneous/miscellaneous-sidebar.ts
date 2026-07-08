import { SidebarItem, SidebarSection } from '../sidebar/sidebar';

export const MISCELLANEOUS_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'miscellaneous-good-receipt-note',
    label: 'Good Receipt Note',
    route: '/miscellaneous/good-receipt-note',
    access: { moduleSlug: 'good_receipt_note_form', action: 'list' },
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
        access: { moduleSlug: 'good_receipt_note_form', action: 'list' },
      },
      {
        id: 'miscellaneous-delivery',
        label: 'Delivery',
        route: '/miscellaneous/delivery',
        access: { moduleSlug: 'delivery_form', action: 'list' },
      },
      {
        id: 'miscellaneous-inventory-transfer',
        label: 'Inventory transfer',
        route: '/miscellaneous/inventory-transfer',
        access: { moduleSlug: 'inventory_transfer_form', action: 'list' },
      },
      {
        id: 'miscellaneous-good-issue',
        label: 'Good Issue',
        route: '/miscellaneous/good-issue',
        access: { moduleSlug: 'good_issue_form', action: 'list' },
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
