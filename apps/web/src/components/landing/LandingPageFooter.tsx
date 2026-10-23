export function LandingPageFooter() {
  return (
    <footer className="border-t border-border bg-surface-2 py-10">
      <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-3 px-4 text-center text-meta text-ink-3">
        <a
          href="https://github.com/AtharvRaotole/LeaseUp"
          className="text-small text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <p className="max-w-[520px] text-meta leading-relaxed">
          Taste rankings powered by Qloo. Store locations from All The Places (CC0). Map data ©
          OpenStreetMap contributors (ODbL).
        </p>
      </div>
    </footer>
  );
}
