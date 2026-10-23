# LeaseUp demo assets

| File | Description |
|------|-------------|
| `hero-landing.png` | Dark-mode hero + “Fill my vacancy” flow (captured via Playwright) |
| `demo-wicker-results.png` | Run with `pnpm screenshots` after worker + preview are up |
| `demo-flow.gif` | Optional: record a 30s walkthrough from the running app |

Capture:

```bash
# Terminal 1
cd apps/worker && pnpm wrangler d1 execute leaseup_db --local --file=schema.sql
APP_MODE=demo pnpm wrangler dev --port 8787

# Terminal 2
pnpm --filter @leaseup/web build && pnpm --filter @leaseup/web preview --port 4173

# Terminal 3
pnpm screenshots
```
