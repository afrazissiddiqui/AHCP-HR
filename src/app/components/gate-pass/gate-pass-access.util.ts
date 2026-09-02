export const GATE_PASS_ROUTE_CANDIDATES = [
  { moduleSlug: 'igp_form', actions: ['list', 'add', 'update'] as const, route: '/gate-pass/igp' },
  { moduleSlug: 'ogp_form', actions: ['list', 'add', 'update'] as const, route: '/gate-pass/ogp' },
  { moduleSlug: 'agp_form', actions: ['list', 'add', 'update'] as const, route: '/gate-pass/agp' },
] as const;

export function getGatePassDefaultRoute(can: (moduleSlug: string, action: string) => boolean): string {
  for (const candidate of GATE_PASS_ROUTE_CANDIDATES) {
    if (candidate.actions.some((action) => can(candidate.moduleSlug, action))) {
      return candidate.route;
    }
  }

  return '/dashboard';
}
