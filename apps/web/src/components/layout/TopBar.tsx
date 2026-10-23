import { Badge } from '../ui/Badge';
import { useHealth } from '../../hooks/useHealth';
import { Logo } from '../brand/Logo';

export function TopBar() {
  const { data } = useHealth();
  const isLive = data?.mode === 'live';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Logo variant="lockup" href="/" glyphSize={22} />
        <nav className="flex items-center gap-4 text-sm text-ink-2">
          <a href="#how-it-works" className="hidden sm:inline hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1">
            How it works
          </a>
          <a
            href="https://github.com/AtharvRaotole/LeaseUp"
            className="hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <Badge tone={isLive ? 'success' : 'warn'}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {isLive ? 'Live data' : 'Demo data'}
          </Badge>
        </nav>
      </div>
    </header>
  );
}
