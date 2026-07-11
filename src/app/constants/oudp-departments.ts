export interface OudpDepartment {
  code: string;
  name: string;
}

export function findOudpDepartment(
  code: string,
  departments: OudpDepartment[],
): OudpDepartment | undefined {
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return departments.find(
    (dept) =>
      dept.code.trim().toLowerCase() === normalized ||
      dept.name.trim().toLowerCase() === normalized,
  );
}

export function resolveOudpDepartmentCode(
  value: string,
  departments: OudpDepartment[],
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const match = findOudpDepartment(trimmed, departments);
  return match?.code ?? trimmed;
}

export function formatOudpDepartment(
  code: string,
  departments: OudpDepartment[],
): string {
  const match = findOudpDepartment(code, departments);
  if (!match) {
    const trimmed = code.trim();
    return trimmed || '—';
  }
  return `${match.code} — ${match.name}`;
}
