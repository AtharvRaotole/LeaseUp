#!/usr/bin/env node
/**
 * CI: SUBMISSION.md metrics match committed sources; integration-head.txt is on the
 * integration branch; any git commit SHA cited in SUBMISSION.md is on that branch.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INTEGRATION_BRANCH =
  process.env.LEASEUP_INTEGRATION_BRANCH ?? 'cursor/leaseup-v1-c429';
const integrationRef = `origin/${INTEGRATION_BRANCH}`;

function gitOk(cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function assertOnIntegrationBranch(shortOrFullSha) {
  const sha = shortOrFullSha.trim().toLowerCase();
  if (!gitOk(`git cat-file -e ${sha}^{commit}`)) {
    return `unknown commit ${sha}`;
  }
  if (!gitOk(`git merge-base --is-ancestor ${sha} ${integrationRef}`)) {
    return `${sha} is not on ${INTEGRATION_BRANCH}`;
  }
  return null;
}

execSync(`git fetch origin ${INTEGRATION_BRANCH} --depth=400`, {
  cwd: root,
  stdio: 'pipe',
});

const submissionPath = join(root, 'docs/devpost/SUBMISSION.md');
const submission = readFileSync(submissionPath, 'utf8');

if (submission.includes('\u2014') || submission.includes('\u2013')) {
  console.error('SUBMISSION.md must not contain em or en dashes');
  process.exit(1);
}

const headPath = join(root, 'docs/devpost/integration-head.txt');
const headSha = readFileSync(headPath, 'utf8').trim();
if (!/^[0-9a-f]{7,40}$/i.test(headSha)) {
  console.error('integration-head.txt must contain one git commit SHA');
  process.exit(1);
}
const headErr = assertOnIntegrationBranch(headSha);
if (headErr) {
  console.error(`integration-head.txt: ${headErr}`);
  process.exit(1);
}

const citedShaRe = /`([0-9a-f]{7,40})`/gi;
const cited = new Set();
for (const match of submission.matchAll(citedShaRe)) {
  cited.add(match[1].toLowerCase());
}
for (const sha of cited) {
  const err = assertOnIntegrationBranch(sha);
  if (err) {
    console.error(`SUBMISSION.md cites ${sha}: ${err}`);
    process.exit(1);
  }
}

const agg = JSON.parse(
  readFileSync(
    join(root, 'packages/fixtures/src/eval/live-qloo-lift/aggregates.json'),
    'utf8'
  )
);
const brandData = JSON.parse(
  readFileSync(join(root, 'packages/fixtures/src/brand-real-estate.json'), 'utf8')
);
const verifiedCount = brandData.entries.filter((e) => e.status === 'verified').length;

const expected = {
  rawP10: agg.rawQlooPrecisionAt10,
  chainP10: agg.chainSizePrecisionAt10,
  blendP10: agg.logisticBlendPrecisionAt10,
  liftPp: agg.logisticBlendLiftVsChainPp,
  auc: agg.sameSizeAuc.value,
  aucLow: agg.sameSizeAuc.ciLow,
  aucHigh: agg.sameSizeAuc.ciHigh,
  siteCount: agg.siteCount,
  verifiedUrls: verifiedCount,
};

const pct = (x) => `${Math.round(x * 100)}%`;
const checks = [
  ['54% raw Qloo (rounded)', submission.includes('54%') && submission.includes('76%')],
  ['83% blend (rounded)', submission.includes('83%')],
  ['+6.5 pp lift', submission.includes('+6.5')],
  ['AUC 0.664', submission.includes('0.664')],
  ['LHCI 93', submission.includes('**93**') || submission.includes('perf **93**')],
  ['LHCI report 89', submission.includes('**89**')],
  ['LHCI a11y 96', submission.includes('**96**')],
  ['13 verified URLs', submission.includes('**13**')],
  ['aggregates raw P@10', submission.includes(String(expected.rawP10)) || submission.includes('0.5375')],
  ['aggregates chain 0.76', submission.includes('0.760') || submission.includes('0.76')],
  ['aggregates blend 0.825', submission.includes('0.825')],
  ['integration branch name', submission.includes(INTEGRATION_BRANCH)],
  ['integration-head.txt pointer', submission.includes('integration-head.txt')],
  ['Run full prospecting judge step', submission.includes('Run full prospecting')],
  [
    'live Qloo judge path',
    submission.includes('240 Bedford Ave') && submission.includes('LIVE_QLOO_JUDGE_DAILY_CAP'),
  ],
  [
    'walkthrough pending re-record',
    submission.includes('pending re-record') || submission.includes('Walkthrough video pending re-record'),
  ],
  ['deploy34 production label', submission.includes('deploy34')],
  [
    'agent receipt documented',
    submission.includes('Agent receipt') && submission.includes('agent-receipt'),
  ],
  [
    'prospecting planner budgets',
    submission.includes('PROSPECTING_AGENT_MAX_STEPS') ||
      (submission.includes('6') && submission.includes('3') && submission.includes('gpt-4o-mini')),
  ],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    failed += 1;
    console.error(`SUBMISSION.md missing or inconsistent: ${label}`);
  }
}

if (verifiedCount !== 13) {
  failed += 1;
  console.error(`brand-real-estate.json has ${verifiedCount} verified rows, expected 13`);
}

if (expected.blendP10 !== 0.825 || expected.chainP10 !== 0.76) {
  failed += 1;
  console.error('aggregates.json blend/chain P@10 changed; update SUBMISSION.md');
}

const a11y = readFileSync(join(root, 'docs/qa/a11y-perf.md'), 'utf8');
if (!a11y.includes('**93**') || !a11y.includes('**89**') || !a11y.includes('**96**')) {
  failed += 1;
  console.error('docs/qa/a11y-perf.md missing pinned LHCI medians 93/89/96');
}

if (failed > 0) {
  console.error(`${failed} SUBMISSION.md / metrics check(s) failed`);
  process.exit(1);
}

console.log(
  `SUBMISSION.md OK (integration head ${headSha} on ${INTEGRATION_BRANCH}; ` +
    `eval ${pct(expected.rawP10)}/${pct(expected.chainP10)}/${pct(expected.blendP10)}; ` +
    `${verifiedCount} verified URLs; LHCI 93/89/96 per a11y-perf.md)`
);
