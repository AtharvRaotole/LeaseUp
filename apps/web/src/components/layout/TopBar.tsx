import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Badge } from '../ui/Badge';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useHealth } from '../../hooks/useHealth';

const NAV_LINKS = [
  { to: '/brand', label: 'Brand sites' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/methodology', label: 'How it works' },
];

export function TopBar() {
  const { data } = useHealth();
  const isLive = data?.mode === 'live';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-6">
        <Link
          to="/"
          className="inline-flex min-h-11 min-w-11 items-center rounded-control py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="LeaseUp home"
        >
          <Logo size="sm" hideWordmarkFromA11y />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium tracking-wide text-ink-3 md:flex" aria-label="Primary">
          {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          <a
            href="https://github.com/AtharvRaotole/LeaseUp"
            className="hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <ThemeToggle />
          <Badge tone={isLive ? 'success' : 'warn'}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {isLive ? 'Live data' : 'Demo data'}
          </Badge>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Badge tone={isLive ? 'success' : 'warn'}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {isLive ? 'Live' : 'Demo'}
          </Badge>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          className="border-t border-border bg-surface px-4 py-3 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-2 text-sm">
            {NAV_LINKS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex min-h-11 items-center rounded-control px-3 text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://github.com/AtharvRaotole/LeaseUp"
                className="flex min-h-11 items-center rounded-control px-3 text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
