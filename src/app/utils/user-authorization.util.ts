export interface UserPermissionItem {
  key: string;
  actionLabel: string;
  granted: boolean;
}

export interface UserAuthorizationModule {
  moduleName: string;
  permissions: UserPermissionItem[];
}

export interface UserAuthorizationSummary {
  total: number;
  granted: number;
  modules: UserAuthorizationModule[];
}

const PERMISSION_ACTIONS = new Set([
  'add',
  'list',
  'view',
  'delete',
  'update',
  'edit',
  'detail',
  'create',
  'export',
  'import',
  'approve',
  'reject',
]);

function humanizeSlug(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function splitPermissionKey(key: string): { moduleName: string; actionLabel: string } {
  const parts = key.split('_').filter(Boolean);
  if (parts.length < 2) {
    return { moduleName: humanizeSlug(key), actionLabel: 'Access' };
  }

  const action = parts[parts.length - 1].toLowerCase();
  if (PERMISSION_ACTIONS.has(action)) {
    return {
      moduleName: humanizeSlug(parts.slice(0, -1).join('_')),
      actionLabel: capitalize(action),
    };
  }

  return { moduleName: humanizeSlug(key), actionLabel: 'Access' };
}

function isGranted(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

function normalizeAuthorizationObjects(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      return normalizeAuthorizationObjects(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');
  }

  if (typeof value === 'object') {
    return [value as Record<string, unknown>];
  }

  return [];
}

export function parseUserAuthorization(value: unknown): UserAuthorizationSummary | null {
  const objects = normalizeAuthorizationObjects(value);
  if (!objects.length) {
    return null;
  }

  const moduleMap = new Map<string, UserPermissionItem[]>();

  for (const object of objects) {
    for (const [key, permissionValue] of Object.entries(object)) {
      const { moduleName, actionLabel } = splitPermissionKey(key);
      const permissions = moduleMap.get(moduleName) ?? [];
      permissions.push({
        key,
        actionLabel,
        granted: isGranted(permissionValue),
      });
      moduleMap.set(moduleName, permissions);
    }
  }

  const modules = [...moduleMap.entries()]
    .map(([moduleName, permissions]) => ({
      moduleName,
      permissions: permissions.sort((a, b) => a.actionLabel.localeCompare(b.actionLabel)),
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));

  const allPermissions = modules.flatMap((module) => module.permissions);
  const granted = allPermissions.filter((permission) => permission.granted).length;

  return {
    total: allPermissions.length,
    granted,
    modules,
  };
}
