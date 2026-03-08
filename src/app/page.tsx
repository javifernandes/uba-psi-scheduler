import Link from 'next/link';
import { MobileDesktopWarning } from '@/components/mobile-desktop-warning';
import { loadCareers } from '@/lib/uba-careers';

const HomePage = async () => {
  const careers = await loadCareers();

  return (
    <main className="h-full bg-[radial-gradient(circle_at_10%_10%,#f8dde7_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#f6ebce_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#f7e7f3_0%,transparent_35%),#faf5f7] px-5 py-10 dark:bg-[radial-gradient(circle_at_10%_10%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#4f3e1f_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#2a1e33_0%,transparent_35%),#0f0b12]">
      <section className="mx-auto max-w-5xl rounded-3xl border border-[#e8d8e1] bg-white/92 p-6 shadow-[0_20px_80px_-45px_rgba(134,31,92,0.55)] dark:border-zinc-700 dark:bg-zinc-900/85 md:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#861f5c] to-[#c13a7f] shadow-lg shadow-[#861f5c]/25">
          <svg viewBox="0 0 100 100" className="h-10 w-10 text-white" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.25" />
            <path d="M22 30h16v24c0 10 5 16 12 16s12-6 12-16V30h16" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="50" y1="20" x2="50" y2="82" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-center text-3xl font-black tracking-tight text-[#4f1237] md:text-4xl dark:text-zinc-100">
          UBA Psi Scheduler
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-[#6f3b58] dark:text-zinc-300">
          Organizá tu cursada, compará cátedras y armá horarios en minutos.
        </p>
        <MobileDesktopWarning className="mx-auto mt-5 max-w-2xl" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {careers.map(career => (
            <Link
              key={career.slug}
              className="group inline-flex min-h-20 items-center justify-between rounded-2xl border border-[#dcbfd0] bg-gradient-to-br from-[#fff8fc] to-[#fff0f6] px-5 py-4 text-base font-bold text-[#5a1740] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c791af] hover:shadow-md dark:border-zinc-600 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:from-zinc-700 dark:hover:to-zinc-800"
              href={`/uba/psicologia/oferta/${career.slug}/scheduler`}
            >
              <span className="pr-3">{career.label}</span>
              <span className="rounded-full bg-[#861f5c]/10 px-2.5 py-1 text-xs font-bold text-[#7d2457] dark:bg-zinc-700 dark:text-zinc-200">
                {career.subjects} cát.
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default HomePage;
