import { UserAuthorizationModule, isPermissionGranted } from './user-authorization.util';

export interface PermissionRequirement {
  moduleSlug: string;
  action: string;
}

export interface AnyPermissionRequirement {
  anyOf: PermissionRequirement[];
}

export interface AllPermissionRequirement {
  allOf: PermissionRequirement[];
}

export type AccessRequirement =
  | PermissionRequirement
  | AnyPermissionRequirement
  | AllPermissionRequirement
  | null
  | undefined;

function isAnyRequirement(value: AccessRequirement): value is AnyPermissionRequirement {
  return !!value && typeof value === 'object' && 'anyOf' in value;
}

function isAllRequirement(value: AccessRequirement): value is AllPermissionRequirement {
  return !!value && typeof value === 'object' && 'allOf' in value;
}

function isSingleRequirement(value: AccessRequirement): value is PermissionRequirement {
  return !!value && typeof value === 'object' && 'moduleSlug' in value && 'action' in value;
}

export function hasAccessRequirement(
  authorization: UserAuthorizationModule[] | null | undefined,
  requirement: AccessRequirement,
): boolean {
  if (!requirement) {
    return true;
  }

  if (isAnyRequirement(requirement)) {
    return requirement.anyOf.some((entry) => hasAccessRequirement(authorization, entry));
  }

  if (isAllRequirement(requirement)) {
    return requirement.allOf.every((entry) => hasAccessRequirement(authorization, entry));
  }

  if (isSingleRequirement(requirement)) {
    return isPermissionGranted(authorization, requirement.moduleSlug, requirement.action);
  }

  return true;
}
