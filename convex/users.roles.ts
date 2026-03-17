export const DEFAULT_USER_ROLE = 'user';
export const ADMIN_ROLE = 'admin';

const normalizeRole = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized : null;
};

export const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) return [];
  const unique = new Set<string>();
  for (const role of roles) {
    const normalized = normalizeRole(role);
    if (!normalized) continue;
    unique.add(normalized);
  }
  return [...unique];
};

export const ensureUserRoles = (roles: unknown): string[] => {
  const normalized = normalizeRoles(roles);
  if (normalized.length) return normalized;
  return [DEFAULT_USER_ROLE];
};

export const hasRole = (roles: unknown, role: string) => {
  const target = normalizeRole(role);
  if (!target) return false;
  return normalizeRoles(roles).includes(target);
};

export const isAdminRole = (roles: unknown) => hasRole(roles, ADMIN_ROLE);
