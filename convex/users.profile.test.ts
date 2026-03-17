import { describe, expect, it } from 'vitest';
import { resolveUserProfileFields } from './users.profile';

describe('resolveUserProfileFields', () => {
  it('uses identity fields when present', () => {
    const resolved = resolveUserProfileFields(
      {
        email: 'identity@example.com',
        emailVerified: true,
        name: 'Identity Name',
      },
      {
        email: 'client@example.com',
        emailVerified: false,
        name: 'Client Name',
      }
    );

    expect(resolved).toEqual({
      email: 'identity@example.com',
      emailVerified: true,
      name: 'Identity Name',
    });
  });

  it('falls back to client fields when identity fields are missing', () => {
    const resolved = resolveUserProfileFields(
      {},
      {
        email: 'client@example.com',
        emailVerified: true,
        givenName: 'Javier',
        familyName: 'Fernandes',
        pictureUrl: 'https://img.example/avatar.png',
      }
    );

    expect(resolved).toEqual({
      email: 'client@example.com',
      emailVerified: true,
      givenName: 'Javier',
      familyName: 'Fernandes',
      pictureUrl: 'https://img.example/avatar.png',
    });
  });

  it('omits empty strings and invalid values', () => {
    const resolved = resolveUserProfileFields(
      {
        email: '   ',
      },
      {
        email: '',
        name: '  ',
        preferredUsername: 'javierf',
      }
    );

    expect(resolved).toEqual({
      preferredUsername: 'javierf',
    });
  });
});
