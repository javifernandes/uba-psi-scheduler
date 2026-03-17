'use client';

import { usePathname } from 'next/navigation';
import { AuthNav } from '@/components/auth/auth-nav';

export const FloatingAuthHeader = () => {
  const pathname = usePathname();
  if (pathname.startsWith('/oferta')) return null;

  return (
    <header className="pointer-events-none sticky top-0 z-40 px-4 pt-4">
      <div className="mx-auto flex max-w-6xl justify-end">
        <div className="pointer-events-auto">
          <AuthNav mode="floating" />
        </div>
      </div>
    </header>
  );
};
