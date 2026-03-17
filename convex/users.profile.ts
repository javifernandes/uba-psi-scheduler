export type UserProfileFields = {
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  nickname?: string;
  preferredUsername?: string;
  pictureUrl?: string;
};

const nonEmpty = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;

const normalizeProfileFields = (fields: UserProfileFields): UserProfileFields => {
  const normalized: UserProfileFields = {};
  const email = nonEmpty(fields.email);
  const name = nonEmpty(fields.name);
  const givenName = nonEmpty(fields.givenName);
  const familyName = nonEmpty(fields.familyName);
  const nickname = nonEmpty(fields.nickname);
  const preferredUsername = nonEmpty(fields.preferredUsername);
  const pictureUrl = nonEmpty(fields.pictureUrl);

  if (email) normalized.email = email;
  if (typeof fields.emailVerified === 'boolean') normalized.emailVerified = fields.emailVerified;
  if (name) normalized.name = name;
  if (givenName) normalized.givenName = givenName;
  if (familyName) normalized.familyName = familyName;
  if (nickname) normalized.nickname = nickname;
  if (preferredUsername) normalized.preferredUsername = preferredUsername;
  if (pictureUrl) normalized.pictureUrl = pictureUrl;

  return normalized;
};

const pickString = (identityValue: unknown, clientValue: unknown) =>
  nonEmpty(identityValue) ?? nonEmpty(clientValue);

const pickBoolean = (identityValue: unknown, clientValue: unknown) =>
  typeof identityValue === 'boolean'
    ? identityValue
    : typeof clientValue === 'boolean'
      ? clientValue
      : undefined;

export const resolveUserProfileFields = (
  identityFields: UserProfileFields,
  clientFields: UserProfileFields
): UserProfileFields =>
  normalizeProfileFields({
    email: pickString(identityFields.email, clientFields.email),
    emailVerified: pickBoolean(identityFields.emailVerified, clientFields.emailVerified),
    name: pickString(identityFields.name, clientFields.name),
    givenName: pickString(identityFields.givenName, clientFields.givenName),
    familyName: pickString(identityFields.familyName, clientFields.familyName),
    nickname: pickString(identityFields.nickname, clientFields.nickname),
    preferredUsername: pickString(identityFields.preferredUsername, clientFields.preferredUsername),
    pictureUrl: pickString(identityFields.pictureUrl, clientFields.pictureUrl),
  });
