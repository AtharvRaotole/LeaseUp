import { Link } from 'react-router-dom';
import { QLOO_BROKER_EXPLAINER } from '../lib/qloo-broker-explainer-copy';
import { TopBar } from '../components/layout/TopBar';
import { SiteFooter } from '../components/layout/SiteFooter';

export function HowLeaseUpUsesQlooPage() {
  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main id="main-content" className="outline-none">
        <div className="mx-auto max-w-[720px] px-4 pb-16 pt-10 md:pt-14">
          <p className="text-label uppercase text-ink-3">
            <Link to="/methodology" className="text-accent hover:underline">
              Methodology
            </Link>
          </p>
          <h1 className="mt-3 font-display font-semibold text-display text-ink">
            {QLOO_BROKER_EXPLAINER.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{QLOO_BROKER_EXPLAINER.intro}</p>

          <div className="mt-10 space-y-8">
            {QLOO_BROKER_EXPLAINER.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display font-semibold text-title text-ink">{section.heading}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{section.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-card border border-border bg-surface-2 p-5">
            <h2 className="font-semibold text-ink">Study files (GitHub)</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-2">
              {QLOO_BROKER_EXPLAINER.evalLinks.map((item) => (
                <li key={item.path}>
                  <span className="font-medium text-ink">{item.label}</span>
                  <code className="mt-1 block rounded bg-surface px-2 py-1 text-xs text-ink-2">
                    {item.path}
                  </code>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-10 text-sm text-ink-2">
            <Link to="/methodology" className="text-accent hover:underline">
              Back to full methodology
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
