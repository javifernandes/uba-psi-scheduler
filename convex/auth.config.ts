import type { AuthConfig } from 'convex/server';

const decodeIssuerFromPublishableKey = (publishableKey: string | undefined) => {
  if (!publishableKey) return null;
  const encoded = publishableKey.split('_').slice(2).join('_');
  if (!encoded) return null;
  try {
    const decoded = atob(encoded).replace(/\$/g, '');
    if (!decoded.includes('.')) return null;
    return `https://${decoded}`;
  } catch {
    return null;
  }
};

const issuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ||
  decodeIssuerFromPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

if (!issuerDomain) {
  console.warn(
    '[convex/auth.config] Missing CLERK issuer. Set CLERK_JWT_ISSUER_DOMAIN to enable authenticated Convex access.'
  );
}

export default {
  providers: issuerDomain
    ? [
        {
          domain: issuerDomain,
          applicationID: 'convex',
        },
      ]
    : [],
} satisfies AuthConfig;
