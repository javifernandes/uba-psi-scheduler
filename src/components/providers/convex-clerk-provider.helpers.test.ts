import { describe, expect, it } from 'vitest';
import { buildUserProfileArgs } from './convex-clerk-provider.helpers';

describe('buildUserProfileArgs', () => {
  it('maps Clerk user fields into Convex profile payload', () => {
    const payload = buildUserProfileArgs({
      id: 'user_123',
      username: 'javierf',
      fullName: 'Javier Fernandes',
      firstName: 'Javier',
      lastName: 'Fernandes',
      imageUrl: 'https://img.example/avatar.png',
      primaryEmailAddress: {
        emailAddress: 'javier@example.com',
        verification: { status: 'verified' },
      },
    });

    expect(payload).toEqual({
      email: 'javier@example.com',
      emailVerified: true,
      name: 'Javier Fernandes',
      givenName: 'Javier',
      familyName: 'Fernandes',
      preferredUsername: 'javierf',
      nickname: 'javierf',
      pictureUrl: 'https://img.example/avatar.png',
    });
  });

  it('omits empty values and keeps payload minimal', () => {
    const payload = buildUserProfileArgs({
      id: 'user_456',
      username: '',
      fullName: '   ',
      firstName: null,
      lastName: undefined,
      imageUrl: undefined,
      primaryEmailAddress: {
        emailAddress: '',
        verification: { status: 'unverified' },
      },
    });

    expect(payload).toEqual({});
  });
});
