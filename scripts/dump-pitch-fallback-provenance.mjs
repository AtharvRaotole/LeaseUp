#!/usr/bin/env node
/** Print pitch one-liner sources for demo analyze (co-tenancy vs live-audiences fallback). */
const API = process.env.LEASEUP_API_URL || 'http://127.0.0.1:8796';

const SITES = [
  { id: 'boulder', address: '1300 Pearl St, Boulder, CO 80302' },
  { id: 'wicker', address: '1574 N Milwaukee Ave, Chicago, IL 60622' },
];

for (const site of SITES) {
  const res = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: site.address, radius: 10 }),
  });
  if (!res.ok) throw new Error(`${site.id} analyze ${res.status}`);
  const data = await res.json();
  console.log(`\n## ${site.id} (${site.address})\n`);
  const prospects = data.prospects ?? [];
  const audiences = new Map();
  for (const p of prospects.slice(0, 10)) {
    const name = p.brand?.name ?? p.brand?.entityId;
    const co = p.coTenancyLine?.trim();
    const sig = p.whyBrandTaste?.signals?.[0];
    const primary = sig?.name;
    if (primary) {
      const key = primary;
      audiences.set(key, (audiences.get(key) ?? 0) + 1);
    }
    const source = co
      ? 'co-tenancy/recorded.json'
      : primary
        ? 'live-audiences.compact.json (brand x location overlap, top combined affinity)'
        : '(no pairing line)';
    console.log(`- **${name}**: ${co || (primary ? `Shared local audience: ${primary}` : 'no line')} | ${source}`);
    if (sig) {
      console.log(`  - whyBrandTaste signal: ${sig.name} (kind ${sig.kind}, local rank #${sig.affinityRank})`);
    }
  }
  const dupes = [...audiences.entries()].filter(([, n]) => n > 1);
  if (dupes.length) {
    console.log(`\nRepeated primary audiences: ${dupes.map(([a, n]) => `${a} (${n})`).join(', ')}`);
  } else {
    console.log('\nNo repeated primary audience names across top 10.');
  }
}
