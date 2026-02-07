'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
