import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export const metadata: Metadata = {
  title: 'UBA Psi Scheduler',
  description: 'Comparador de horarios para materias y cátedras (UBA Psicología).',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="es">
    <body>
      <ThemeProvider>
        {children}
        <ThemeToggle />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
