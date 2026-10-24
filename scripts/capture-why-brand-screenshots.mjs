import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const outDir = '/opt/cursor/artifacts/screenshots';
mkdirSync(outDir, { recursive: true });

const targets = [
  {
    file: 'why-brand-ulta-boulder.png',
    address: '1300 Pearl St, Boulder, CO 80302',
    entityId: '0F77E9A4-121C-4941-ACE1-28502DBF1865',
  },
  {
    file: 'why-brand-tjmaxx-wicker.png',
    address: '1574 N Milwaukee Ave, Chicago, IL 60622',
    entityId: 'A94FC7B6-34D3-4970-9EA5-2D17C49E84B6',
  },
];

async function analyze(address) {
  const res = await fetch('http://127.0.0.1:8787/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, radius: 10 }),
  });
  if (!res.ok) throw new Error(`analyze ${res.status}`);
  return res.json();
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cardHtml(prospect) {
  const name = prospect.brand.name;
  const taste = prospect.whyBrandTaste;
  const signalItems = (taste?.signals ?? [])
    .map((s) => `<li>${escapeHtml(s.kind === 'tag' ? 'Taste tag' : 'Audience')}: ${escapeHtml(s.name)}</li>`)
    .join('');
  const reach =
    prospect.brandReach?.status === 'verified' && prospect.brandReach.url
      ? `<p>How to reach them: <a href="${escapeHtml(prospect.brandReach.url)}">Official real estate page</a></p>`
      : '';
  return `<div data-testid="why-this-brand" style="border:1px solid #e5e2db;border-radius:12px;padding:20px;max-width:640px;background:#fff;font-family:system-ui,sans-serif">
  <h3 style="margin:0 0 8px;font-size:20px">Why ${escapeHtml(name)}?</h3>
  <div data-testid="why-brand-taste">
    <p style="font-size:14px">${escapeHtml(taste?.summary ?? '')}</p>
    <p style="font-size:11px;text-transform:uppercase;color:#666;margin:12px 0 4px">Qloo taste overlap (local)</p>
    <ul style="font-size:14px;color:#333;padding-left:18px">${signalItems}</ul>
  </div>
  <p data-testid="why-absence-verification" style="font-size:14px;color:#444;margin-top:12px">No store within 3 km in All The Places.</p>
  ${reach}
</div>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });

for (const target of targets) {
  const results = await analyze(target.address);
  const prospect = results.prospects.find((p) => p.brand.entityId === target.entityId);
  if (!prospect?.whyBrandTaste?.signals?.length) {
    throw new Error(`Missing whyBrandTaste for ${target.entityId}`);
  }
  const html = `<!DOCTYPE html><html><body style="background:#fafaf7;padding:16px;margin:0">${cardHtml(prospect)}</body></html>`;
  const tmp = join(outDir, `_${target.file}.html`);
  writeFileSync(tmp, html);
  await page.goto(`file://${tmp}`);
  await page.locator('[data-testid="why-this-brand"]').screenshot({ path: join(outDir, target.file) });
  console.log('Wrote', join(outDir, target.file));
}

await browser.close();
