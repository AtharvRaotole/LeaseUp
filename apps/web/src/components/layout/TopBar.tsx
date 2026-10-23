import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Badge } from '../ui/Badge';
import { useHealth } from '../../hooks/useHealth';

const NAV_LINKS = [
  { to: '/brand', label: 'Brand sites' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/pipeline', label: 'Pipeline' },
  { href: '#how-it-works', label: 'How it works' },
] as const;

export function TopBar() {
  const { data } = useHealth();
  const isLive = data?.mode === 'live';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link
          to="/"
          className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="LeaseUp home"
        >
          <Logo size="sm" hideWordmarkFromA11y />
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-ink-2 md:flex" aria-label="Primary">
          {NAV_LINKS.map((item) =>
            'to' in item ? (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-ink focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
              >
                {item.label}
              </a>
            )
          )}
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
        <div className="flex items-center gap-2 md:hidden">
          <Badge tone={isLive ? 'success' : 'warn'}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
            {isLive ? 'Live' : 'Demo'}
          </Badge>
          <button
            type="button"
            className="rounded-control p-2 text-ink-2 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent"
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
              <li key={'to' in item ? item.to : item.href}>
                {'to' in item ? (
                  <Link
                    to={item.to}
                    className="block rounded-control px-2 py-2 text-ink hover:bg-surface-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    className="block rounded-control px-2 py-2 text-ink hover:bg-surface-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
            <li>
              <a
                href="https://github.com/AtharvRaotole/LeaseUp"
                className="block rounded-control px-2 py-2 text-ink hover:bg-surface-2"
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
