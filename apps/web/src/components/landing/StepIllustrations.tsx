const stroke = 'currentColor';

export function PinStepIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="8" y="8" width="64" height="64" rx="8" stroke={stroke} strokeWidth="2.2" />
      <path
        d="M24 52V28h8v16h16v8H24Z"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="36" r="6" stroke={stroke} strokeWidth="2.2" />
      <path d="M52 42v10" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M48 52h8" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function TasteReadIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="10" y="14" width="60" height="52" rx="6" stroke={stroke} strokeWidth="2.2" />
      <path d="M18 28h44" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M18 38h32" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M18 48h38" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path
        d="M22 58c8-10 16-10 24 0s16 10 24 0"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="58" cy="24" r="5" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

export function VerifiedListIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="14" y="10" width="52" height="60" rx="6" stroke={stroke} strokeWidth="2.2" />
      <path d="M24 26h32" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 38h24" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M24 50h28" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path
        d="M52 34l4 4 8-10"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8" y="54" width="20" height="20" rx="4" stroke={stroke} strokeWidth="2" />
      <path d="M12 62h12M12 66h8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
