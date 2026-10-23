type Props = {
  message: string;
};

export function TasteUnavailableBanner({ message }: Props) {
  return (
    <div
      data-testid="taste-unavailable-banner"
      className="rounded-control border border-warn/40 bg-[#FFFBEB] px-4 py-3 text-[13px] leading-snug text-ink-2 dark:border-warn/30 dark:bg-[#1c1912]"
      role="status"
    >
      {message}
    </div>
  );
}
