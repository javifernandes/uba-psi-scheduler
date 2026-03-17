import { describe, expect, it } from 'vitest';
import {
  ADMIN_ROLE,
  DEFAULT_USER_ROLE,
  ensureUserRoles,
  hasRole,
  isAdminRole,
  normalizeRoles,
} from './users.roles';

describe('users.roles helpers', () => {
  it('normalizes roles and removes invalid/duplicate entries', () => {
    expect(normalizeRoles([' Admin ', 'admin', 'USER', '', null, 1])).toEqual(['admin', 'user']);
  });

  it('returns default role when missing or empty', () => {
    expect(ensureUserRoles(undefined)).toEqual([DEFAULT_USER_ROLE]);
    expect(ensureUserRoles([])).toEqual([DEFAULT_USER_ROLE]);
  });

  it('detects role membership case-insensitively', () => {
    const roles = ['admin', 'reviewer'];
    expect(hasRole(roles, 'Admin')).toBe(true);
    expect(hasRole(roles, 'user')).toBe(false);
  });

  it('detects admin role', () => {
    expect(isAdminRole([ADMIN_ROLE])).toBe(true);
    expect(isAdminRole(['user'])).toBe(false);
  });
});
