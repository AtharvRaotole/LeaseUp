import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2 py-8">
      <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-3 px-4 text-center text-meta text-ink-3">
        <Logo variant="lockup" size="xs" className="justify-center opacity-80" />
        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
          aria-label="Footer"
        >
          <Link
            to="/methodology"
            className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
          >
            How it works
          </Link>
          <a
            href="https://github.com/AtharvRaotole/LeaseUp"
            className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://github.com/AtharvRaotole/LeaseUp/blob/main/LICENSE"
            className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
            target="_blank"
            rel="noreferrer"
          >
            MIT License
          </a>
          <Link
            to="/"
            className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
          >
            LeaseUp home
          </Link>
        </nav>
        <p className="max-w-[640px] text-xs leading-relaxed">
          Qloo Agentic Hackathon 2026. Map data © OpenStreetMap contributors (ODbL). Store
          locations from All The Places (CC0). Qloo Taste AI used under hackathon API terms.
        </p>
      </div>
    </footer>
  );
}
