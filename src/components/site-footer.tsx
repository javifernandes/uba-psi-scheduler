'use client';

import Link from 'next/link';
import { Github } from 'lucide-react';
import { usePathname } from 'next/navigation';

const REPO_URL = 'https://github.com/javifernandes/uba-psi-scheduler';

export const SiteFooter = () => {
  const pathname = usePathname();
  const isSchedulerRoute = pathname.includes('/scheduler');
  if (isSchedulerRoute) return null;

  return (
    <footer className="border-t border-[#e8d8e1] bg-white/85 px-5 py-3 text-xs text-[#6f3b58] dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-300">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          Proyecto personal, open source y gratuito para la comunidad de Psicología UBA.
        </p>
        <nav className="flex items-center gap-4" aria-label="Enlaces legales y transparencia">
          <Link
            href="/legal"
            className="font-semibold text-[#7d2457] underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Aviso legal
          </Link>
          <Link
            href="/privacy"
            className="font-semibold text-[#7d2457] underline-offset-2 hover:underline dark:text-zinc-100"
          >
            Privacidad
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#7d2457] underline-offset-2 hover:underline dark:text-zinc-100"
            aria-label="Código fuente en GitHub"
          >
            <Github size={14} aria-hidden="true" />
            <span>Código fuente</span>
          </a>
        </nav>
      </div>
    </footer>
  );
};
