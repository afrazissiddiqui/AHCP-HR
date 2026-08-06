import { LoginApiUser } from '../services/auth.service';
import { resolveBranchNameFromBplId } from './branch-name.util';

export type BranchFieldValue = string | number | undefined | null;

export interface BranchSessionUser {
  is_admin?: boolean | number | string | null;
  branch?: Array<number | string> | number | string | null;
  branches?: Array<number | string> | number | string | null;
  Branch?: Array<number | string> | number | string | null;
  Branches?: Array<number | string> | number | string | null;
}

function normalizeAdminFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      return false;
    }

    return !['0', 'false', 'no', 'n', 'off'].includes(trimmed);
  }

  return false;
}

function normalizeBranchValues(rawBranches: unknown): string[] {
  const branchArray = Array.isArray(rawBranches)
    ? rawBranches
    : rawBranches !== undefined && rawBranches !== null
    ? [rawBranches]
    : [];

  const collected: string[] = [];

  for (const value of branchArray) {
    if (value === undefined || value === null) {
      continue;
    }

    const text = String(value).trim();
    if (!text) {
      continue;
    }

    const parts = text
      .split(/[;,/]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    for (const part of parts) {
      const branchName = resolveBranchNameFromBplId(part as string | number);
      const normalized = branchName.trim().toLowerCase();
      if (normalized.length > 0) {
        collected.push(normalized);
      }
    }
  }

  return collected;
}

export function getAllowedBranches(sessionUser: BranchSessionUser | LoginApiUser | null): Set<string> {
  if (!sessionUser || normalizeAdminFlag(sessionUser.is_admin)) {
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
