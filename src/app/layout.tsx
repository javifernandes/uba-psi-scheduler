import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { FloatingAuthHeader } from '@/components/auth/floating-auth-header';
import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { ConvexClerkProvider } from '@/components/providers/convex-clerk-provider';
import { SiteFooter } from '@/components/site-footer';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export const metadata: Metadata = {
  title: 'UBA Psi Scheduler',
  description: 'Comparador de horarios para materias y cátedras (UBA Psicología).',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="es">
    <body className="min-h-screen">
      <ClerkProvider dynamic>
        <ConvexClerkProvider>
          <PostHogProvider>
            <ThemeProvider>
              <div className="flex min-h-screen flex-col">
                <FloatingAuthHeader />
                <div className="flex-1">{children}</div>
                <SiteFooter />
              </div>
              <ThemeToggle />
            </ThemeProvider>
          </PostHogProvider>
        </ConvexClerkProvider>
      </ClerkProvider>
    </body>
  </html>
);

export default RootLayout;
