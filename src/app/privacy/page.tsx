import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacidad | UBA Psi Scheduler',
  description: 'Información de privacidad y datos en UBA Psi Scheduler.',
};

const PrivacyPage = () => (
  <main className="h-full bg-[radial-gradient(circle_at_10%_10%,#f8dde7_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#f6ebce_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#f7e7f3_0%,transparent_35%),#faf5f7] px-5 py-10 dark:bg-[radial-gradient(circle_at_10%_10%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#4f3e1f_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#2a1e33_0%,transparent_35%),#0f0b12]">
    <section className="mx-auto max-w-3xl rounded-3xl border border-[#e8d8e1] bg-white/92 p-8 shadow-[0_20px_80px_-45px_rgba(134,31,92,0.55)] dark:border-zinc-700 dark:bg-zinc-900/85">
      <h1 className="text-2xl font-black tracking-tight text-[#4f1237] md:text-3xl dark:text-zinc-100">
        Privacidad
      </h1>
      <p className="mt-5 text-sm leading-6 text-[#6f3b58] dark:text-zinc-300">
        Este sitio no requiere cuentas ni formularios para su uso normal.
      </p>
      <p className="mt-3 text-sm leading-6 text-[#6f3b58] dark:text-zinc-300">
        Actualmente no usamos cookies de seguimiento ni de publicidad.
      </p>
      <p className="mt-3 text-sm leading-6 text-[#6f3b58] dark:text-zinc-300">
        Usamos almacenamiento local del navegador (<code>localStorage</code>) para guardar tus
        selecciones y preferencias de horarios en tu propio dispositivo.
      </p>
      <p className="mt-3 text-sm leading-6 text-[#6f3b58] dark:text-zinc-300">
        No almacenamos información personal identificable de usuarios desde esta funcionalidad.
      </p>
      <p className="mt-3 text-sm leading-6 text-[#6f3b58] dark:text-zinc-300">
        Si en el futuro cambia la forma de tratamiento de datos, esta política será actualizada.
      </p>
      <p className="mt-6 text-xs text-[#86526e] dark:text-zinc-400">
        Última actualización: 8 de marzo de 2026.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex rounded-lg border border-[#dcbfd0] bg-[#fff6fa] px-3 py-2 text-xs font-semibold text-[#5a1740] transition hover:bg-[#fcecf4] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  </main>
);

export default PrivacyPage;
