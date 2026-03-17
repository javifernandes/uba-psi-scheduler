export type ClerkUserLike = {
  id: string;
  username?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  } | null;
};

export type UserProfileArgs = {
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  nickname?: string;
  preferredUsername?: string;
  pictureUrl?: string;
};

const maybeString = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim() ? value : undefined;

export const buildUserProfileArgs = (user: ClerkUserLike): UserProfileArgs => {
  const email = maybeString(user.primaryEmailAddress?.emailAddress ?? undefined);
  const verificationStatus = user.primaryEmailAddress?.verification?.status;
  const emailVerified = verificationStatus === 'verified' ? true : undefined;
  const name = maybeString(user.fullName ?? undefined);
  const givenName = maybeString(user.firstName ?? undefined);
  const familyName = maybeString(user.lastName ?? undefined);
  const preferredUsername = maybeString(user.username ?? undefined);
  const pictureUrl = maybeString(user.imageUrl ?? undefined);

  return {
    ...(email ? { email } : {}),
    ...(typeof emailVerified === 'boolean' ? { emailVerified } : {}),
    ...(name ? { name } : {}),
    ...(givenName ? { givenName } : {}),
    ...(familyName ? { familyName } : {}),
    ...(preferredUsername ? { preferredUsername } : {}),
    ...(preferredUsername ? { nickname: preferredUsername } : {}),
    ...(pictureUrl ? { pictureUrl } : {}),
  };
};
