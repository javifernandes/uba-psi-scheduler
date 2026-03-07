import Link from 'next/link';
import { loadCareers } from '@/lib/uba-careers';

const HomePage = async () => {
  const careers = await loadCareers();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-5 py-8 dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#231725_0%,transparent_35%),#0f0b12]">
      <section className="mx-auto max-w-4xl rounded-2xl border border-[#e8d8e1] bg-white/90 p-6 dark:border-zinc-700 dark:bg-zinc-900/80">
        <h1 className="text-center text-2xl font-bold text-[#4f1237] dark:text-zinc-100">
          UBA Psi Scheduler
        </h1>
        <p className="mt-2 text-center text-sm text-[#6f3b58] dark:text-zinc-300">
          Herramienta para explorar oferta académica y armar cursada por carrera.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {careers.map(career => (
            <Link
              key={career.slug}
              className="inline-flex items-center justify-between rounded-xl border border-[#dcbfd0] bg-[#fff8fc] px-4 py-3 text-sm font-semibold text-[#5a1740] shadow-sm hover:bg-[#fdf1f7] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              href={`/uba/psicologia/oferta/${career.slug}/scheduler`}
            >
              <span>{career.label}</span>
              <span className="text-xs font-medium text-[#8d6b7f] dark:text-zinc-300">
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
