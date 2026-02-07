import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Footer() {
  return (
    <footer className="py-6 text-sm text-muted-foreground text-center">
      <div className="container mx-auto px-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-center sm:text-left">
          Built for{' '}
          <a
            href="https://www.wemakedevs.org/hackathons/tambo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline underline-offset-4"
          >
            Tambo Hackathon 2026
          </a>{' '}
          • The UI Strikes Back 🏆
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}
