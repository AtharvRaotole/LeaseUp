export function LandingSectionHeading({
  kicker,
  title,
  align = 'center',
}: {
  kicker: string;
  title: string;
  align?: 'center' | 'left';
}) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  return (
    <div className={alignClass}>
      <p className="text-label uppercase tracking-wide text-ink-3">{kicker}</p>
      <h2 className="mt-2 font-serif text-[2.35rem] leading-[1.12] tracking-[-0.02em] text-ink md:text-[2.65rem]">
        {title}
      </h2>
    </div>
  );
}
