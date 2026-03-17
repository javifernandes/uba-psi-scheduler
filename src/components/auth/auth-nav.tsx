'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

type AuthNavMode = 'floating' | 'scheduler';

type AuthNavProps = {
  mode?: AuthNavMode;
};

const buttonClass =
  'rounded-full border border-[#d9bfd0] bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#5a1740] shadow-sm transition hover:border-[#c08ca9] hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:border-zinc-400';

const schedulerButtonClass =
  'inline-flex items-center rounded-md border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/15';

export const AuthNav = ({ mode = 'floating' }: AuthNavProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const isSchedulerRoute = pathname.startsWith('/oferta');

  if (!isLoaded) return null;
  if (mode === 'floating' && isSchedulerRoute) return null;

  if (!isSignedIn) {
    if (mode === 'scheduler') {
      return (
        <SignInButton mode="modal">
          <button type="button" className={schedulerButtonClass}>
            Ingresar
          </button>
        </SignInButton>
      );
    }

    return (
      <div className="flex items-center gap-2 rounded-full border border-[#ead8e2] bg-white/75 px-2 py-1 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70">
        <SignInButton mode="modal">
          <button type="button" className={buttonClass}>
            Ingresar
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className={buttonClass}>
            Crear cuenta
          </button>
        </SignUpButton>
      </div>
    );
  }

  if (mode === 'scheduler') {
    return (
      <div className="inline-flex items-center rounded-md border border-white/25 bg-white/10 px-1 py-0.5">
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-6 w-6',
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#ead8e2] bg-white/75 px-2 py-1 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70">
      <span className="text-xs font-semibold text-[#5a1740] dark:text-zinc-100">Sesion activa</span>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
};
