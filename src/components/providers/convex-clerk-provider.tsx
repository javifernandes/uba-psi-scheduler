'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { ConvexReactClient, useMutation } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useEffect, useRef } from 'react';
import { api } from '../../../convex/_generated/api';
import { buildUserProfileArgs } from './convex-clerk-provider.helpers';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
let didWarnMissingConvexUrl = false;

const ConvexAuthSync = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      lastSyncedUserId.current = null;
      return;
    }
    if (lastSyncedUserId.current === user.id) return;
    lastSyncedUserId.current = user.id;
    void upsertCurrentUser(buildUserProfileArgs(user)).catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ConvexClerkProvider] Failed to sync user to Convex', error);
      }
      lastSyncedUserId.current = null;
    });
  }, [isLoaded, isSignedIn, user, upsertCurrentUser]);

  return null;
};

export const ConvexClerkProvider = ({ children }: { children: React.ReactNode }) => {
  if (!convex) {
    if (process.env.NODE_ENV !== 'production' && !didWarnMissingConvexUrl) {
      didWarnMissingConvexUrl = true;
      console.warn(
        '[ConvexClerkProvider] Missing NEXT_PUBLIC_CONVEX_URL. User sync to Convex is disabled.'
      );
    }
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
      <ConvexAuthSync />
    </ConvexProviderWithClerk>
  );
};
