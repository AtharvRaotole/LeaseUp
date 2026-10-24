#!/usr/bin/env node
/**
 * Shared headline formatting for the 40-address Qloo lift eval.
 * Exact means live in aggregates.json; table rates match Python tables.md (.2f).
 */

/** Python-style two-decimal rate for markdown tables (0.825 -> 0.82). */
export function p10RateTable(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return 'n/a';
  return n.toFixed(2);
}

/** Three-decimal exact for prose notes (0.5375 -> 0.538). */
export function p10RateExactNote(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return 'n/a';
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

/** Whole-percent label for broker copy (0.825 -> 83%). */
export function p10PercentRounded(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return 'n/a';
  return `${Math.round(n * 100)}%`;
}

/** One-decimal percent when needed (0.825 -> 82.5%). */
export function p10PercentOneDecimal(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return 'n/a';
  const pct = Math.round(n * 1000) / 10;
  if (Math.abs(pct - Math.round(pct)) < 1e-9) {
    return `${Math.round(pct)}%`;
  }
  return `${pct.toFixed(1)}%`;
}

export function liftPpOneDecimal(pp) {
  const n = Number(pp);
  if (!Number.isFinite(n)) return 'n/a';
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1);
}
