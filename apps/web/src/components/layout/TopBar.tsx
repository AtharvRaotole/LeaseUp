import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { useHealth } from '../../hooks/useHealth';

export function TopBar() {
  const { data } = useHealth();
  const isLive = data?.mode === 'live';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link to="/" className="text-[15px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1">
          LeaseUp
        </Link>
        <nav className="flex items-center gap-4 text-sm text-ink-2">
          <Link to="/brand" className="hidden md:inline hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1">
            Brand sites
          </Link>
          <Link to="/portfolio" className="hidden md:inline hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1">
            Portfolio
          </Link>
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
