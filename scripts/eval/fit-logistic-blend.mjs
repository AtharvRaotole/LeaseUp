#!/usr/bin/env node
/**
 * Refit production logistic coefficients from data/qloo-eval-40 (see fit-logistic-blend-qloo-eval.py).
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const py = join(process.cwd(), 'scripts/eval/fit-logistic-blend-qloo-eval.py');
const result = spawnSync('python3', [py], { stdio: 'inherit' });
process.exit(result.status ?? 1);
