import { SidebarItem, SidebarSection } from '../sidebar/sidebar';

export const GATE_PASS_SIDEBAR_ITEMS: SidebarItem[] = [];

export const GATE_PASS_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'gate-pass-actions',
    title: 'Gate pass',
    items: [
      { id: 'igp-list', label: 'IGP (Inward)', route: '/gate-pass/igp' },
      { id: 'ogp-list', label: 'OGP (Outward)', route: '/gate-pass/ogp' },
      { id: 'agp-list', label: 'AGP (Article)', route: '/gate-pass/agp' },
    ],
  },
];

export function gatePassActiveItemFromUrl(url: string): string {
  if (url.includes('/gate-pass/ogp')) {
    return 'ogp-list';
  }
  if (url.includes('/gate-pass/agp')) {
    return 'agp-list';
  }
  return 'igp-list';
}
