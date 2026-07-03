export type CrudBucket = 'create' | 'read' | 'update' | 'delete' | 'other';

export interface CrudPermissionEntry {
  key: string;
  actionKey: string;
  actionLabel: string;
  value: number;
  granted: boolean;
  bucket: CrudBucket;
}

export interface UserAuthorizationModuleRow {
  moduleName: string;
  moduleSlug: string;
  create: CrudPermissionEntry[];
  read: CrudPermissionEntry[];
  update: CrudPermissionEntry[];
  delete: CrudPermissionEntry[];
  other: CrudPermissionEntry[];
  grantedCount: number;
  totalCount: number;
}

export interface UserAuthorizationSummary {
  total: number;
  granted: number;
  modules: UserAuthorizationModuleRow[];
}

const CRUD_ACTION_MAP: Record<string, CrudBucket> = {
  add: 'create',
  create: 'create',
  list: 'read',
  view: 'read',
  detail: 'read',
  read: 'read',
  update: 'update',
  edit: 'update',
  delete: 'delete',
  remove: 'delete',
};

const EXTRA_ACTIONS = new Set(['export', 'import', 'approve', 'reject', 'print', 'download', 'upload']);

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

function splitPermissionKey(key: string): { moduleSlug: string; moduleName: string; actionKey: string; actionLabel: string } {
  const parts = key.split('_').filter(Boolean);
  if (parts.length < 2) {
    return {
      moduleSlug: key,
      moduleName: humanizeSlug(key),
      actionKey: key,
      actionLabel: 'Access',
    };
  }

  const actionKey = parts[parts.length - 1].toLowerCase();
  const moduleSlug = parts.slice(0, -1).join('_');
  return {
    moduleSlug,
    moduleName: humanizeSlug(moduleSlug),
    actionKey,
    actionLabel: capitalize(actionKey),
  };
}

function resolveCrudBucket(actionKey: string): CrudBucket {
  if (CRUD_ACTION_MAP[actionKey]) {
    return CRUD_ACTION_MAP[actionKey];
  }
  if (EXTRA_ACTIONS.has(actionKey)) {
    return 'other';
  }
  return 'other';
}

function normalizePermissionValue(value: unknown): number {
  if (value === true) {
    return 1;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
      return 1;
    }
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function isGranted(value: number): boolean {
  return value === 1;
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

function emptyModuleRow(moduleSlug: string, moduleName: string): UserAuthorizationModuleRow {
  return {
    moduleSlug,
    moduleName,
    create: [],
    read: [],
    update: [],
    delete: [],
    other: [],
    grantedCount: 0,
    totalCount: 0,
  };
}

function pushToBucket(row: UserAuthorizationModuleRow, bucket: CrudBucket, entry: CrudPermissionEntry): void {
  row[bucket].push(entry);
  row.totalCount += 1;
  if (entry.granted) {
    row.grantedCount += 1;
  }
}

export function parseUserAuthorization(value: unknown): UserAuthorizationSummary | null {
  const objects = normalizeAuthorizationObjects(value);
  if (!objects.length) {
    return null;
  }

  const moduleMap = new Map<string, UserAuthorizationModuleRow>();

  for (const object of objects) {
    for (const [key, permissionValue] of Object.entries(object)) {
      const { moduleSlug, moduleName, actionKey, actionLabel } = splitPermissionKey(key);
      const numericValue = normalizePermissionValue(permissionValue);
      const bucket = resolveCrudBucket(actionKey);
      const row = moduleMap.get(moduleSlug) ?? emptyModuleRow(moduleSlug, moduleName);

      pushToBucket(row, bucket, {
        key,
        actionKey,
        actionLabel,
        value: numericValue,
        granted: isGranted(numericValue),
        bucket,
      });

      moduleMap.set(moduleSlug, row);
    }
  }

  const modules = [...moduleMap.values()].sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  const allPermissions = modules.flatMap((module) => [
    ...module.create,
    ...module.read,
    ...module.update,
    ...module.delete,
    ...module.other,
  ]);

  return {
    total: allPermissions.length,
    granted: allPermissions.filter((permission) => permission.granted).length,
    modules,
  };
}

export function crudBucketLabel(bucket: CrudBucket): string {
  switch (bucket) {
    case 'create':
      return 'Create';
    case 'read':
      return 'Read';
    case 'update':
      return 'Update';
    case 'delete':
      return 'Delete';
    default:
      return 'Other';
  }
}

export function crudBucketEntries(
  module: UserAuthorizationModuleRow,
  bucket: CrudBucket,
): CrudPermissionEntry[] {
  return module[bucket];
}
