import Link from 'next/link';

const HomePage = () => (
  <main className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-5 py-8 dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#231725_0%,transparent_35%),#0f0b12]">
    <section className="mx-auto max-w-3xl rounded-2xl border border-[#e8d8e1] bg-white/90 p-6 dark:border-zinc-700 dark:bg-zinc-900/80">
      <h1 className="text-xl font-bold text-[#4f1237] dark:text-zinc-100">UBA Psi Scheduler</h1>
      <p className="mt-2 text-sm text-[#6f3b58] dark:text-zinc-300">
        Visualizador de comisiones, teóricos y seminarios para Psicología UBA.
      </p>
      <Link
        className="mt-4 inline-flex rounded-md bg-[#861f5c] px-4 py-2 text-sm font-medium text-white hover:bg-[#6f194c]"
        href="/uba/psicologia/oferta/lic-psicologia/scheduler"
      >
        Abrir scheduler
      </Link>
    </section>
  </main>
);

export default HomePage;
