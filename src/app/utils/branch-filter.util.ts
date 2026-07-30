import { LoginApiUser } from '../services/auth.service';
import { resolveBranchNameFromBplId } from './branch-name.util';

export type BranchFieldValue = string | number | undefined | null;

export interface BranchSessionUser {
  is_admin?: boolean;
  branch?: Array<number | string> | number | string | null;
  branches?: Array<number | string> | number | string | null;
  Branch?: Array<number | string> | number | string | null;
  Branches?: Array<number | string> | number | string | null;
}

function normalizeBranchValues(rawBranches: unknown): string[] {
  const branchArray = Array.isArray(rawBranches)
    ? rawBranches
    : rawBranches !== undefined && rawBranches !== null
    ? [rawBranches]
    : [];

  return branchArray
    .map((value) => resolveBranchNameFromBplId(value as string | number))
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0);
}

export function getAllowedBranches(sessionUser: BranchSessionUser | LoginApiUser | null): Set<string> {
  if (!sessionUser || sessionUser.is_admin) {
    return new Set();
  }

  const rawBranches =
    sessionUser.branch ??
    sessionUser.branches ??
    sessionUser.Branch ??
    sessionUser.Branches;

  return new Set(normalizeBranchValues(rawBranches));
}

export function filterRecordsBySessionBranches<T>(
  records: T[],
  getBranchValue: (record: T) => BranchFieldValue,
  sessionUser: BranchSessionUser | LoginApiUser | null,
): T[] {
  const allowedBranches = getAllowedBranches(sessionUser);
  if (!allowedBranches.size) {
    return records;
  }

  return records.filter((record) => {
    const branchName = resolveBranchNameFromBplId(getBranchValue(record));
    return branchName && allowedBranches.has(branchName.toLowerCase());
  });
}
