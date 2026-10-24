# Co-tenancy Qloo fixtures (demo mode)

Record with a live API key (no mocks):

```bash
QLOO_API_KEY=... node scripts/record-co-tenancy-fixture.mjs
QLOO_API_KEY=... node scripts/record-co-tenancy-fixture.mjs wicker
```

Writes `manifest.json` with raw `/v2/insights` bodies for each demo chip, pitched brand, and incumbent set.

Probe a single call first:

```bash
QLOO_API_KEY=... node scripts/probe-qloo-co-affinity.mjs
```
