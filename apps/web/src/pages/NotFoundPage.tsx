import { Link } from 'react-router-dom';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/80 px-4 py-4 md:px-6">
        <Link to="/" className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo size="sm" />
        </Link>
      </header>
      <main className="mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <Logo variant="mark" size="lg" className="mb-6 opacity-90" />
        <h1 className="font-serif text-h2 text-ink">Page not found</h1>
        <p className="mt-3 max-w-md text-ink-2">
          This URL does not match a report or landing page. Head back to search for tenants.
        </p>
        <Link to="/" className="mt-8">
          <Button size="lg">Back to LeaseUp</Button>
        </Link>
      </main>
      <footer className="py-8 text-center text-meta text-ink-3">
        <Logo variant="lockup" size="xs" className="justify-center opacity-70" />
      </footer>
    </div>
  );
}
