# Broker comprehension screenshots

Before/after captures for the plain-language broker pass (report, methodology, pipeline, watchlist, pitch, brand, portfolio).

Generate locally (demo worker + production preview):

```bash
git checkout cursor/leaseup-v1-c429
node scripts/broker-comprehension-screenshots.mjs --phase before

git checkout cursor/broker-comprehension-ca63
node scripts/broker-comprehension-screenshots.mjs --phase after
```

Widths: **390** and **1440** px. Files are named `{page}-{width}.png`.
