import {
  isAcceptableOutreachDraft,
  outreachWordCount,
  truncateOutreachWords,
} from '@leaseup/contracts';
import type { OutreachFacts } from '../providers/openai';

const MAX_WORDS = 120;

export function buildGroundedOpeningLine(facts: OutreachFacts): string {
  const place = facts.neighborhood ? ` in ${facts.neighborhood}` : '';
  const rankPart =
    facts.affinityRank !== undefined
      ? `Qloo ranks ${facts.brandName} #${facts.affinityRank}${place}`
      : `${facts.brandName} scores strongly for local taste${place}`;

  const absencePart =
    facts.nearestStoreKm !== undefined
      ? `; nearest ${facts.brandName} is ${facts.nearestStoreKm.toFixed(1)} km away`
      : facts.reasons.find((r) => /no .*store|within \d+ km/i.test(r))
        ? `; ${facts.reasons.find((r) => /no .*store|within \d+ km/i.test(r))}`
        : '';

  const verifyPart =
    facts.verificationLabel && !absencePart.includes(facts.verificationLabel)
      ? ` (${facts.verificationLabel})`
      : '';

  const coTenantPart =
    facts.coTenantBrands && facts.coTenantBrands.length > 0
      ? `. Nearby retail includes ${facts.coTenantBrands.slice(0, 4).join(', ')}`
      : '';

  return `${rankPart}${absencePart}${verifyPart}${coTenantPart}.`.replace(/\.\./g, '.');
}

export function buildGroundedOutreachBody(facts: OutreachFacts): string {
  const opener = buildGroundedOpeningLine(facts);
  const reason = facts.reasons[0];
  const reasonLine = reason && !opener.includes(reason) ? ` ${reason}.` : '';
  const close = ` We have a storefront at ${facts.address} and can share the LeaseUp site pack if you want to review the pin.`;
  return truncateOutreachWords(`${opener}${reasonLine}${close}`, MAX_WORDS);
}

export function buildGroundedSubject(facts: OutreachFacts): string {
  const place = facts.neighborhood ?? 'site';
  return `${facts.brandName} · ${place} storefront`;
}

export function polishOutreachDraft(
  subject: string,
  body: string,
  facts: OutreachFacts
): { subject: string; body: string } {
  let nextBody = body
    .replace(/^subject:\s*.+\n+/i, '')
    .replace(/^(dear|hi|hello)[^\n]*\n+/im, '')
    .replace(/^\s*I hope this (message|email)[^\n]*\n+/im, '')
    .trim();

  if (!isAcceptableOutreachDraft(nextBody) || outreachWordCount(nextBody) > MAX_WORDS) {
    nextBody = buildGroundedOutreachBody(facts);
  }

  let nextSubject = subject.trim();
  if (!nextSubject || outreachHasBracketInSubject(nextSubject)) {
    nextSubject = buildGroundedSubject(facts);
  }

  return {
    subject: nextSubject,
    body: truncateOutreachWords(nextBody, MAX_WORDS),
  };
}

function outreachHasBracketInSubject(subject: string): boolean {
  return /\[[^\]]+\]/.test(subject);
}
