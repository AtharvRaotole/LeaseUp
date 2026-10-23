# Deployment Guide

This guide covers deploying LeaseUp to Cloudflare Workers (recommended) and alternative platforms.

## Prerequisites

- A Cloudflare account (free tier works)
- Wrangler CLI installed: `pnpm add -g wrangler`
- API keys:
  - Qloo API key (from https://hackathon.api.qloo.com)
  - OpenAI API key (optional, for live outreach generation)

## Cloudflare Workers Deployment

### Step 1: Authenticate

```bash
wrangler login
```

This opens a browser window to authenticate with your Cloudflare account.

### Step 2: Create D1 Database

```bash
wrangler d1 create leaseup_db
```

**Output example:**
```
✅ Successfully created DB 'leaseup_db'!
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "leaseup_db"
database_id = "abc123-def456-ghi789"
```

For **local `wrangler dev`**, apply the schema once so rate limits and run logs work:

```bash
cd apps/worker
pnpm wrangler d1 execute leaseup_db --local --file=schema.sql
```

For **local `wrangler dev`**, `apps/worker/wrangler.toml` also ships with placeholder D1/KV IDs (`00000000-0000-0000-0000-000000000000` and `local-cache-placeholder`) so Miniflare can boot without creating cloud resources. Replace them before deploying to production.

Copy the `database_id` and update `apps/worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "leaseup_db"
database_id = "abc123-def456-ghi789"  # Your actual ID
```

### Step 3: Run Database Migrations

```bash
wrangler d1 execute leaseup_db --file=apps/worker/schema.sql
```

Verify the tables were created:

```bash
wrangler d1 execute leaseup_db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

You should see: `rate_limits`, `analysis_runs`, `api_metrics`.

D1 is **not** used for store locations (avoids free-tier write limits). ATP store points ship as static geohash-3 tiles bundled with the worker.

### Step 3b: Build store geotiles (included in `pnpm build`)

```bash
node scripts/build-geotiles.mjs
```

This writes `apps/worker/public/tiles/brands.json` and `apps/worker/public/tiles/<geohash3>.json` (compact `[brandIdx, lat, lon]` arrays). Wrangler serves them via `[assets]` in `apps/worker/wrangler.toml`. Re-run after updating `data/brands/store-locations.expanded.min.json`.

### Step 4: Create KV Namespace

```bash
wrangler kv:namespace create CACHE
```

**Output example:**
```
🌀 Creating namespace with title "leaseup-worker-CACHE"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "CACHE", id = "xyz789abc123" }
```

Update `apps/worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "xyz789abc123"  # Your actual ID
```

### Step 5: Set Secrets

```bash
# Qloo API key (required for live mode)
echo "your_qloo_api_key_here" | wrangler secret put QLOO_API_KEY

# OpenAI API key (optional)
echo "your_openai_api_key_here" | wrangler secret put OPENAI_API_KEY

# App mode (demo or live)
echo "live" | wrangler secret put APP_MODE

# Qloo base URL (usually default)
echo "https://hackathon.api.qloo.com" | wrangler secret put QLOO_BASE_URL

# OpenAI model (optional)
echo "gpt-4o-mini" | wrangler secret put OPENAI_MODEL
```

### Step 6: Build and Deploy Worker

```bash
# Build
pnpm build

# Deploy
pnpm --filter @leaseup/worker deploy
```

**Output:**
```
Total Upload: 150 KB
Uploaded leaseup-worker (1.23 sec)
Published leaseup-worker (0.45 sec)
  https://leaseup-worker.your-subdomain.workers.dev
```

Save this URL—you'll need it for the frontend.

### Step 7: Deploy Frontend to Cloudflare Pages

```bash
# Build frontend
pnpm --filter @leaseup/web build

# Deploy to Cloudflare Pages
wrangler pages deploy apps/web/dist --project-name=leaseup
```

**First deployment will prompt:**
```
Would you like to create a new project? (y/n)
```

Answer `y`.

**Output:**
```
✨ Success! Uploaded 23 files (2.1 sec)
✨ Deployment complete! Take a look over at https://abc123.leaseup.pages.dev
```

### Step 8: Configure Frontend Environment

In the Cloudflare Pages dashboard:

1. Go to **Settings** → **Environment variables**
2. Add:
   - `VITE_API_URL` = `https://leaseup-worker.your-subdomain.workers.dev`

Redeploy:

```bash
wrangler pages deploy apps/web/dist --project-name=leaseup
```

### Step 9: Update CORS Allowed Origins

```bash
echo "https://leaseup.pages.dev,https://your-custom-domain.com" | wrangler secret put ALLOWED_ORIGINS
```

### Step 10: Test

Visit your deployed frontend URL and try the demo locations:
- Wicker Park, Chicago
- Sevierville, Tennessee
- Boulder, Colorado

Check the worker logs:

```bash
wrangler tail
```

---

## Alternative: Vercel

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/web
vercel
```

Follow the prompts. Set environment variable:

- `VITE_API_URL` = `https://leaseup-worker.your-subdomain.workers.dev`

The worker still runs on Cloudflare Workers (it's edge-native).

---

## Alternative: Netlify

### Deploy Frontend to Netlify

```bash
# Install Netlify CLI
pnpm add -g netlify-cli

# Build
pnpm --filter @leaseup/web build

# Deploy
cd apps/web
netlify deploy --prod --dir=dist
```

Set environment variable in Netlify dashboard:

- `VITE_API_URL` = `https://leaseup-worker.your-subdomain.workers.dev`

---

## Alternative: Railway / Render (Full-Stack Node.js)

If you want to run the whole stack as a single Node.js app instead of Workers:

### Convert Worker to Express

1. Replace Hono with Express
2. Replace D1 with PostgreSQL (use `pg` package)
3. Replace KV with Redis (use `ioredis` package)
4. Update `apps/worker/src/index.ts` to export an Express app

### Deploy to Railway

```bash
# Install Railway CLI
pnpm add -g railway

# Login
railway login

# Create project
railway init

# Add PostgreSQL
railway add postgres

# Deploy
railway up
```

Set environment variables in Railway dashboard.

---

## Monitoring & Debugging

### Worker Logs

```bash
wrangler tail
```

Press `b` to open in browser, `c` to clear.

### D1 Query Console

```bash
wrangler d1 execute leaseup_db --command="SELECT * FROM analysis_runs ORDER BY created_at DESC LIMIT 10;"
```

### Check Rate Limits

```bash
wrangler d1 execute leaseup_db --command="SELECT * FROM rate_limits WHERE window_start > unixepoch('now', '-1 hour');"
```

### API Metrics

```bash
wrangler d1 execute leaseup_db --command="SELECT provider, endpoint, AVG(latency_ms) as avg_latency, COUNT(*) as calls FROM api_metrics GROUP BY provider, endpoint;"
```

---

## Custom Domain

### Cloudflare Pages

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `leaseup.yourdomain.com`)
4. Follow DNS instructions (add CNAME record)

### Cloudflare Workers

1. Go to Workers → your worker → **Triggers**
2. Click **Add Custom Domain**
3. Enter subdomain (e.g., `api.leaseup.yourdomain.com`)
4. DNS is configured automatically if your domain is on Cloudflare

---

## Rollback

### Worker

```bash
wrangler rollback --message "Rollback to previous version"
```

### Pages

In the Cloudflare dashboard:
1. Go to **Deployments**
2. Click **⋯** next to a previous deployment
3. Click **Rollback to this deployment**

---

## Cost Estimate (Cloudflare Free Tier)

| Resource | Free Tier | Typical Usage | Cost |
|---|---|---|---|
| Workers requests | 100,000/day | ~5,000/day | **$0** |
| D1 database | 5 GB storage, 5M reads/day, 100k writes/day | ~1k writes/day | **$0** |
| KV | 1 GB storage, 100k reads/day, 1k writes/day | ~500 writes/day | **$0** |
| Pages | Unlimited bandwidth | ~10 GB/month | **$0** |

**Paid tier only needed if:**
- More than 100k requests/day
- More than 5M D1 reads/day
- More than 1k KV writes/day

**Qloo API:** Hackathon tier includes generous quota. Check your dashboard at https://hackathon.api.qloo.com.

**OpenAI:** GPT-4o-mini costs ~$0.00015 per outreach draft (500 tokens). 1000 analyses ≈ $0.15.

---

## Security Checklist

Before going live:

- [ ] All secrets set with `wrangler secret put` (never committed to git)
- [ ] `ALLOWED_ORIGINS` configured with your actual domain(s)
- [ ] Rate limiting tested (try 11 requests in 1 minute to `/api/analyze`)
- [ ] `/api/health/providers` removed or gated behind admin token
- [ ] `.env` and `.dev.vars` in `.gitignore`
- [ ] No API keys in source code or logs
- [ ] HTTPS enforced (Cloudflare does this by default)

---

## Troubleshooting

### "Error: No such module 'node:crypto'"

The worker uses `node:crypto` for UUID generation. Cloudflare Workers supports this in the `nodejs_compat` compatibility flag.

Add to `apps/worker/wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
```

### "KV namespace not found"

Make sure you ran `wrangler kv:namespace create CACHE` and copied the `id` into `wrangler.toml`.

### "D1 database not found"

Make sure you ran `wrangler d1 create leaseup_db` and copied the `database_id` into `wrangler.toml`.

### CORS errors in browser

Check:
1. `ALLOWED_ORIGINS` is set and includes your frontend domain
2. Worker is deployed (not just local dev)
3. Browser DevTools → Network tab shows the correct `Access-Control-Allow-Origin` header

---

## Support

- **Wrangler docs:** https://developers.cloudflare.com/workers/wrangler/
- **D1 docs:** https://developers.cloudflare.com/d1/
- **KV docs:** https://developers.cloudflare.com/kv/
- **Qloo API docs:** https://docs.qloo.com/

For hackathon-specific questions, check the Discord: https://discord.gg/rF9PKsD5Q7
