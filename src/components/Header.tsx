'use client';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Flame } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Code Critic</h1>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/tosif121/code-critic"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium hidden md:block"
          >
            GitHub
          </a>
          <div className="w-px h-4 bg-border hidden md:block" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
