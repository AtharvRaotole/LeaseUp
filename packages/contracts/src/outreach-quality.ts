/** Shared outreach draft quality rules (worker + tests). */

const STOCK_PHRASE_PATTERNS: RegExp[] = [
  /hope this (message |email )?finds you well/i,
  /i hope this (message |email )?finds you/i,
  /dear\s+\[/i,
  /to whom it may concern/i,
  /^dear\s+(broker|sir|madam|team|hiring manager)/im,
  /^good (morning|afternoon|evening)/im,
  /^hello\s*$/im,
  /^hi\s*$/im,
];

export function outreachHasBracketPlaceholder(text: string): boolean {
  return /\[[^\]]+\]/.test(text);
}

export function outreachStockPhraseViolations(text: string): string[] {
  const hits: string[] = [];
  if (outreachHasBracketPlaceholder(text)) {
    hits.push('bracket_placeholder');
  }
  for (const pattern of STOCK_PHRASE_PATTERNS) {
    if (pattern.test(text)) {
      hits.push(`stock_phrase:${pattern.source}`);
    }
  }
  return hits;
}

export function isAcceptableOutreachDraft(text: string): boolean {
  return outreachStockPhraseViolations(text).length === 0;
}

export function outreachWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function truncateOutreachWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}.`;
}
