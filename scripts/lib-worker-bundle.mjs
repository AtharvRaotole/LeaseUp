/**
 * Bundle a few worker TS modules for Node scripts (worker dist is ESM without
 * file extensions, so it cannot be imported directly by Node).
 */
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function loadEsbuild(root) {
  const fromWorker = createRequire(resolve(root, 'apps/worker/package.json'));
  const fromVitest = createRequire(fromWorker.resolve('vitest'));
  const fromVite = createRequire(fromVitest.resolve('vite'));
  return fromVite('esbuild');
}

/** @param {string} root repo root @param {Record<string,string>} exportsMap name -> repo-relative ts path */
export async function importWorkerModules(root, exportsMap) {
  const esbuild = loadEsbuild(root);
  const dir = mkdtempSync(join(tmpdir(), 'leaseup-worker-bundle-'));
  const entry = join(dir, 'entry.ts');
  const lines = Object.entries(exportsMap).map(
    ([name, rel]) => `export { ${name} } from ${JSON.stringify(resolve(root, rel))};`
  );
  writeFileSync(entry, lines.join('\n') + '\n');
  const outfile = join(dir, 'bundle.mjs');
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile,
    logLevel: 'error',
    loader: { '.json': 'json', '.bin': 'binary', '.wasm': 'binary', '.ttf': 'binary' },
    nodePaths: [resolve(root, 'apps/worker/node_modules'), resolve(root, 'node_modules')],
  });
  return import(pathToFileURL(outfile).href);
}
