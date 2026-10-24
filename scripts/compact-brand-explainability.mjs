#!/usr/bin/env node
/**
 * Pack the live Qloo audience recordings (brand-audiences/*.json, local-audiences/*.json) into one compact
 * JSON. Values are copied verbatim (full-precision affinities); only the layout changes. The same bytes are
 * written to packages/fixtures (bundled by the web app and tests) and apps/worker/public (served to the
 * worker through its ASSETS binding, so the data stays out of the worker bundle).
 *
 * Usage: node scripts/compact-brand-explainability.mjs   (run after record-brand-explainability-fixture.mjs)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "packages/fixtures/src/brand-explainability");
const audienceIndex = new Map();
const audiences = [];

function packRows(rows) {
  return rows
    .map((row) => {
      if (!audienceIndex.has(row.entityId)) {
        audienceIndex.set(row.entityId, audiences.length);
        audiences.push(`${row.entityId}|${row.name}`);
      }
      return `${audienceIndex.get(row.entityId)}:${row.affinity}`;
    })
    .join(",");
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const listJson = (sub) =>
  readdirSync(join(dir, sub))
    .filter((f) => f.endsWith(".json"))
    .sort();

const locals = {};
for (const file of listJson("local-audiences")) {
  const rec = readJson(join(dir, "local-audiences", file));
  locals[rec.chip] = {
    location: rec.location,
    radiusKm: rec.radiusKm,
    recordedAt: rec.provenance.recordedAt,
    host: rec.provenance.host,
    url: rec.provenance.url,
    rows: packRows(rec.audiences),
  };
}

const brands = {};
for (const file of listJson("brand-audiences")) {
  const rec = readJson(join(dir, "brand-audiences", file));
  brands[rec.brandEntityId] = {
    name: rec.brandName,
    recordedAt: rec.provenance.recordedAt,
    host: rec.provenance.host,
    url: rec.provenance.url,
    rows: packRows(rec.audiences),
  };
}

const body = `${JSON.stringify({ audiences, locals, brands })}\n`;
const workerDir = join(process.cwd(), "apps/worker/public/brand-explainability");
mkdirSync(workerDir, { recursive: true });
for (const out of [join(dir, "live-audiences.compact.json"), join(workerDir, "live-audiences.compact.json")]) {
  writeFileSync(out, body);
  console.log(
    `Wrote ${out} (${Object.keys(brands).length} brands, ${Object.keys(locals).length} chips)`,
  );
}
