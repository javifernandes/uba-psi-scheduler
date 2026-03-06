'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full border',
          'bg-background text-foreground shadow-lg transition-colors',
          'border-border hover:bg-accent'
        )}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>
    </div>
  );
};
