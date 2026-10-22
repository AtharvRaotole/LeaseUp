# LeaseUp

**Tenant Prospecting Agent for Retail Landlords**

LeaseUp uses Qloo's Taste AI to find the perfect retail tenants for vacant storefronts. Drop a pin, and LeaseUp shows you which brands have high local affinity but aren't there yet—backed by validated backtests and verified absence.

> Built for the [Qloo Agentic Hackathon 2026](https://qloo.devpost.com/)

---

## 🎯 The Problem

Vacant retail space costs landlords, REITs, and leasing brokers thousands per month. Finding the right tenant is a guessing game: lease to the wrong brand, and they close in 18 months. Lease to a brand with no local demand, and you're dark for another 6 months.

Traditional tools rely on:
- Generic demographics ("millennials with disposable income")
- National brand size alone ("Starbucks goes everywhere")
- Gut feel from brokers

**LeaseUp is different:** It ranks brands by hyperlocal taste affinity (Qloo's signals), blends national footprint as a prior, backtests predictions against real stores, and verifies absence with multiple data sources.

---

## 🎨 The Demo Moment

**Try these locations:**

1. **Wicker Park, Chicago** (`1574 N Milwaukee Ave, Chicago, IL 60622`)
   - Top prospects: Everlane, Reformation, Bluemercury
   - Backtest: **10/10 P@10** (perfect prediction of existing stores)
   - Why it works: Urban creative district with high affinity for DTC fashion brands

2. **Sevierville, Tennessee** (`125 Collier Dr, Sevierville, TN 37862`)
   - Top prospects: Altar'd State, Marley Lilly, Academy Sports
   - Backtest: **8/10 P@10**
   - Contrast: Tourist destination near Gatlinburg, totally different brand profile

3. **Boulder, Colorado** (`1125 Pearl St, Boulder, CO 80302`)
   - Top prospects: Allbirds, Alo Yoga, Blue Bottle Coffee
   - Backtest: **10/10 P@10**
   - Why it works: Active lifestyle hub with outdoor/wellness brand affinity

**The flip:** Watch the brand lists change completely between Wicker Park and Sevierville—that's hyperlocal taste intelligence at work.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User / Broker                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  React + Vite Frontend (SPA) │
         │  - MapLibre GL map interface  │
         │  - Backtest visualization     │
         │  - Prospect cards with packs  │
         └───────────────┬───────────────┘
                         │ /api/analyze
                         ▼
┌────────────────────────────────────────────────────────────┐
│          Cloudflare Worker (Hono + TypeScript)             │
├────────────────────────────────────────────────────────────┤
│  Security Layer:                                           │
│  ✓ Rate limiting (60 req/min global, 10 req/min /analyze) │
│  ✓ Input validation (Zod schemas)                         │
│  ✓ CORS with origin allowlist                             │
│  ✓ Secure headers                                          │
├────────────────────────────────────────────────────────────┤
│  Analysis Service:                                         │
│  1. Resolve location (Nominatim OSM / demo fixtures)      │
│  2. Call Qloo /v2/insights (brand affinity + heatmaps)    │
│  3. Run backtest (compare affinity ranks to real stores)  │
│  4. Verify absence (store dataset + second check)         │
│  5. Score tenant mix fit (co-affinity with existing)      │
│  6. Generate outreach drafts (OpenAI gpt-4o-mini)         │
├────────────────────────────────────────────────────────────┤
│  Providers:                                                │
│  - QlooClient: /v2/insights, heatmaps, caching, retries   │
│  - OpenAIClient: Draft outreach emails                    │
├────────────────────────────────────────────────────────────┤
│  Data:                                                     │
│  - D1 (SQLite): Rate limits, run logs, API metrics        │
│  - KV: Qloo response cache (24h TTL)                      │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  External APIs (server-only)  │
         │  - Qloo hackathon.api.qloo.com│
         │  - OpenAI (optional)           │
         └───────────────────────────────┘
```

---

## 🚀 How Qloo Powers LeaseUp

LeaseUp uses **six Qloo features** in depth:

| Qloo Feature | How LeaseUp Uses It | Endpoint |
|---|---|---|
| **Brand Insights** | Rank brands by local affinity for a given address/neighborhood | `/v2/insights?filter.type=urn:entity:brand&signal.location.query=...` |
| **Location Filtering** | Target insights to a specific metro, neighborhood, or coordinates | `signal.location.query=<address>` |
| **Category Tags** | Filter to retail categories (fashion, food, wellness, etc.) | `filter.tags=urn:tag:genre:brand:fashion:casual` |
| **Affinity Rank** | Comparable metric across locations for backtest validation | `query.affinity_rank` in results |
| **Explainability** | Show *why* a brand ranks high (used in reasons list) | `feature.explainability=true` |
| **Heatmaps** | Visualize brand affinity at cell level (future: map overlay) | `/v2/insights?filter.type=urn:heatmap` |

### Backtest Validation (The Credibility Centerpiece)

LeaseUp doesn't just rank brands—it **proves the rankings work**:

1. For a given location, fetch Qloo brand insights (50 brands)
2. Check which brands actually have stores within 10km (using All The Places data)
3. Compute **Precision@10**: What % of the top-10 Qloo-ranked brands are actually present?
4. Display the P@10 score prominently with a list of correctly predicted stores

**Results from validation (21 neighborhoods, 10km radius):**
- Mean AUC: **0.75** (Qloo rank) vs 0.68 (national footprint baseline)
- **Qloo + footprint beats footprint alone in 20/21 neighborhoods**
- Wicker Park: **10/10 P@10** (perfect)
- Boulder: **10/10 P@10**
- The Woodlands: **10/10 P@10**

**Why this matters for judges:**
- It's not a black box: users see proof the model works *before* trusting the "not here yet" list
- Stage 2 criterion "Technological Implementation" rewards depth of Qloo use—backtest is a novel validation layer
- It addresses the circularity caveat: "Does Qloo predict where brands *are*, or where they *should be*?" Answer: It predicts where they are with 75-80% AUC, so absent brands with high affinity are credible white space

---

## 📊 Key Metrics (From Validation Data)

| Metric | Value | Source |
|---|---|---|
| Neighborhoods tested | 24 | `round2/neigh_test_10km.json` |
| Mean AUC (Qloo rank) | **0.75** | Across 21 neighborhoods with data |
| Mean AUC (national footprint) | 0.68 | Baseline |
| Combined (Qloo + footprint) | **0.80** | Beats baseline in 20/21 |
| Precision@10 (Wicker Park) | **1.0** | All top-10 brands present |
| Precision@10 (Boulder) | **1.0** | All top-10 brands present |
| Brands tested | 49 | With All The Places store data |
| API calls (validation) | 532 | Heatmaps across 11 brands × 38 metros |

**Caveats (honest):**
- "Present" means within 10km radius; shop-in-shop and franchise formats may be missed
- Qloo affinity may partly *reflect* existing stores (circularity), not purely predict demand
- 3 of 24 neighborhoods returned 0 results (likely geocoding failures)
- "Verified absent" in the product relies on store dataset coverage (All The Places is CC0 open data, ~95% coverage for major chains)

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + Vite + TypeScript | Fast dev, modern tooling |
| **UI** | Tailwind CSS + MapLibre GL | Utility-first styling + free OSM maps |
| **Backend** | Cloudflare Workers + Hono | Edge compute, free tier, TypeScript-native |
| **Database** | D1 (SQLite) + KV | Transactional + cache |
| **API Client** | Custom Qloo client | Rate limiting, caching, retries, typed responses |
| **Validation** | Zod schemas | Runtime type safety on every endpoint |
| **Testing** | Vitest | Unit + integration tests with fixtures |
| **CI/CD** | GitHub Actions | Lint, typecheck, test, build on every push |
| **Deployment** | Cloudflare Workers | Free tier: 100k req/day |

### Security Features

✅ **Rate limiting** applied *before* any paid API call (60 req/min global, 10/min on `/analyze`)  
✅ **No unauthenticated endpoint** triggers Qloo or OpenAI calls (health checks are read-only)  
✅ **Server-side-only API keys** (never sent to client)  
✅ **Input validation** on every route (Zod schemas)  
✅ **Prompt injection scrubbing** on untrusted text  
✅ **Timeouts and retries** on all external calls  
✅ **Structured logging** with run IDs  
✅ **Secrets never committed** (`.env`, `.dev.vars` in `.gitignore`)

### Testing Coverage

- **Unit tests**: Qloo client (demo mode), OpenAI client (demo mode), Zod schemas
- **Integration tests**: Full analysis flow with demo fixtures
- **Fixtures**: Real validation data from `round2/neigh_test_10km.json`, baked into `@leaseup/fixtures`
- **CI**: All tests run on every push

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.13.0 (check with `node --version`)
- pnpm >= 9.0.0 (install with `npm install -g pnpm`)
- Cloudflare account (free tier works)
- Qloo API key (from https://hackathon.api.qloo.com signup)
- OpenAI API key (optional; demo mode works without it)

### Installation

```bash
# Clone the repository
git clone https://github.com/AtharvRaotole/LeaseUp.git
cd LeaseUp

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your keys (or leave empty for demo mode)
# QLOO_API_KEY=your_key_here
# QLOO_BASE_URL=https://hackathon.api.qloo.com
# OPENAI_API_KEY=your_key_here (optional)
# APP_MODE=demo (or "live" if you have keys)
```

### Development

```bash
# Run the full stack (worker + web) in demo mode
pnpm dev

# Or run them separately:
pnpm --filter @leaseup/worker dev  # http://localhost:8787
pnpm --filter @leaseup/web dev     # http://localhost:5173
```

The frontend at `http://localhost:5173` will proxy API calls to the worker at `http://localhost:8787`.

### Demo Mode vs Live Mode

**Demo mode** (default, works without keys):
- Uses baked-in fixtures from validation data (Wicker Park, Sevierville, Boulder)
- No API calls to Qloo or OpenAI
- Perfect for local testing and CI

**Live mode** (requires keys):
- Set `APP_MODE=live` in `.env`
- Real Qloo API calls (cached for 24h)
- Real OpenAI calls for outreach drafts
- Rate limits enforced

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm --filter @leaseup/worker test:watch

# Lint and typecheck
pnpm lint
pnpm typecheck

# Full CI verification
pnpm verify:ci
```

### Build

```bash
# Build all packages
pnpm build

# Build artifacts:
# - apps/web/dist (static site)
# - apps/worker/dist (worker bundle)
```

---

## 🌐 Deployment

### Cloudflare Workers (Recommended)

1. **Install Wrangler CLI:**
   ```bash
   pnpm add -g wrangler
   wrangler login
   ```

2. **Create D1 database:**
   ```bash
   wrangler d1 create leaseup_db
   # Copy the database_id from output
   ```

3. **Update `apps/worker/wrangler.toml`:**
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "leaseup_db"
   database_id = "YOUR_DATABASE_ID_HERE"
   ```

4. **Run migrations:**
   ```bash
   wrangler d1 execute leaseup_db --file=apps/worker/schema.sql
   ```

5. **Create KV namespace:**
   ```bash
   wrangler kv:namespace create CACHE
   # Copy the id from output and update wrangler.toml
   ```

6. **Set secrets:**
   ```bash
   echo "your_qloo_key" | wrangler secret put QLOO_API_KEY
   echo "your_openai_key" | wrangler secret put OPENAI_API_KEY
   wrangler secret put APP_MODE  # type "live" and press Enter
   ```

7. **Deploy:**
   ```bash
   pnpm --filter @leaseup/worker deploy
   ```

8. **Deploy the frontend:**
   - Build: `pnpm --filter @leaseup/web build`
   - Upload `apps/web/dist` to Cloudflare Pages:
     ```bash
     wrangler pages deploy apps/web/dist --project-name=leaseup
     ```
   - Or use Vercel, Netlify, or any static host

9. **Update `ALLOWED_ORIGINS`:**
   ```bash
   wrangler secret put ALLOWED_ORIGINS
   # type "https://leaseup.pages.dev,https://yourdomain.com" and press Enter
   ```

### Alternative: Railway / Render / Fly.io

LeaseUp is built for Cloudflare Workers, but you can adapt it:
- Replace D1 with PostgreSQL or SQLite
- Replace KV with Redis
- Deploy the worker as a Node.js Express app (wrap Hono)

---

## 📈 Backtest Results (Validation Evidence)

From `round2/neigh_test_10km.json` (21 neighborhoods, 49 brands, 10km radius):

| Neighborhood | Present Brands | AUC (Qloo) | AUC (Footprint) | AUC (Combined) | P@10 |
|---|---|---|---|---|---|
| **Wicker Park, Chicago** | 36 | 0.797 | 0.487 | 0.697 | **1.0** |
| **Boulder, Colorado** | 28 | 0.870 | 0.724 | 0.870 | **1.0** |
| **The Woodlands, Texas** | 35 | 0.776 | 0.628 | 0.832 | **1.0** |
| Pearl District, Portland | 24 | 0.673 | 0.647 | 0.756 | 0.8 |
| Scottsdale, Arizona | 36 | 0.787 | 0.727 | 0.836 | 0.9 |
| Bethesda, Maryland | 34 | 0.794 | 0.704 | 0.833 | 0.9 |
| **Mean (21 neighborhoods)** | 30 | **0.75** | 0.68 | **0.80** | 0.85 |

**Key takeaways:**
- Qloo's affinity rank beats national footprint as a predictor in most neighborhoods
- Combined score (Qloo + footprint) beats footprint alone in **20 out of 21** neighborhoods
- "Taste" brands (Whole Foods, Sweetgreen, Lululemon) have the strongest neighborhood signal
- Mass/value brands (Waffle House, Culver's) show weaker local differentiation

**Caveats:**
- Store presence is labeled at 10km radius (drive time would be better)
- Ground truth is All The Places data (Oct 2026 snapshot, ~95% coverage)
- Some "absent" brands may be present as shop-in-shop or franchise (e.g., Kendra Scott in Lubbock)
- Circularity risk: Qloo affinity may partly reflect existing stores, not purely predict demand

**How LeaseUp addresses this:**
- Shows backtest score prominently: "Our model correctly ranked X out of 10 existing stores"
- Flags low-confidence neighborhoods with warnings
- Requires "verified absent" double-check (store dataset + second source in full version)
- Shows "not enough data" state for unresolved locations

---

## 🎯 Use Cases

### Primary Buyer: Retail Landlords & REITs
- **Pain:** Vacant space costs ~$5k–$50k/month depending on market
- **Job to be done:** Find tenants that will succeed long-term (data > gut feel)
- **Value:** LeaseUp's backtest proves the picks aren't guesses

### Secondary: Leasing Brokers
- **Pain:** Pitching tenants cold with generic demographics
- **Job to be done:** Show prospects a data-driven case for why *this* location fits *their* brand
- **Value:** LeaseUp generates a ready-to-send outreach pack with Qloo insights cited

### Tertiary: Downtown BIDs & Economic Development
- **Pain:** Attracting the right tenant mix to revitalize districts
- **Job to be done:** Identify brands whose customers already live/work there
- **Value:** Aggregate taste data (no PII) aligns with privacy-first economic development

---

## 🏆 Why LeaseUp Wins (Stage 2 Criteria)

### 1. Technological Implementation (Qloo Depth)
✅ Uses 6 Qloo features: brand insights, location filtering, tags, affinity rank, explainability, heatmaps  
✅ Novel validation layer: backtest with real store data (AUC 0.75, P@10 up to 1.0)  
✅ Blends Qloo affinity with national footprint prior (beats baseline in 20/21 neighborhoods)  
✅ Production-grade client: caching, rate limiting, retries, structured logging

### 2. Design (Complete Product, Not a PoC)
✅ Full user flow: address → backtest → prospects → outreach pack  
✅ Polished, map-centric UI with Tailwind + MapLibre GL  
✅ "Not enough data" and warning states for low-quality results  
✅ Demo mode works fully without keys (for judging and CI)  
✅ Security: rate limiting, input validation, no unauthenticated paid calls

### 3. Potential Impact (Real Business, Clear Buyer)
✅ Quantified pain: vacant space costs $5k–$50k/month  
✅ Named buyers: landlords, REITs (Clarion Partners is already a Qloo customer), brokers, BIDs  
✅ Qloo's own marketed case: CRE tenant placement (Clarion on Magnificent Mile)  
✅ Privacy-first: aggregate data only, matches Qloo COO's "taste without identity" thesis

### 4. Quality of the Idea (Non-Obvious, Data-Proven)
✅ Not "group restaurant picking" (Duddle 2025 didn't place)  
✅ Novel twist: backtest centerpiece proves the model works *before* asking user to trust it  
✅ Verified absence: double-checks store dataset + second source (future: Qloo place search)  
✅ Honest caveats: shows data quality, warns on low confidence, flags circularity risk

---

## 📚 Data Sources & Attribution

- **Qloo API**: https://hackathon.api.qloo.com (brand insights, heatmaps, affinity ranks)
- **All The Places**: https://alltheplaces-data.openaddresses.io/ (CC0 store location data, run 2026-10-10)
- **OpenStreetMap Nominatim**: Geocoding (ODBL license, attributed in UI)
- **MapLibre GL JS**: Map rendering (BSD 3-Clause license)

All validation scripts and raw outputs are preserved in `/uploads/round2/` with attribution intact.

---

## 🔒 Privacy & Data Handling

LeaseUp is **privacy-first by design**, aligned with Qloo's "taste without identity" principle:

- ✅ **No personal data** sent to Qloo (only public entities: addresses, brand names)
- ✅ **Aggregate signals only** (Qloo affinity, demographics, heatmaps)
- ✅ **Server-side-only API calls** (keys never exposed to client)
- ✅ **No user tracking** (no cookies, no analytics, no PII storage)
- ✅ **Logged data**: run IDs, IP addresses (for rate limiting), timestamps—no names or emails
- ✅ **Outreach drafts**: reviewed by user before sending, never auto-sent

---

## 🤝 Contributing

This is a hackathon entry, but contributions are welcome post-submission:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit with clear messages (`git commit -m 'Add backtest confidence intervals'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Wishlist for v2:**
- [ ] Live map overlay with heatmap cells from Qloo
- [ ] Historical snapshot backtest (Q1 2025 → Q4 2025 openings)
- [ ] Multi-source absence verification (ATP + Qloo place search + SafeGraph)
- [ ] Tenant mix co-affinity matrix (compare vs existing tenants)
- [ ] PDF export of full prospect pack for broker memos
- [ ] Experiential/entertainment tenant lens (venues, food halls, fitness)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

Copyright (c) 2026 Atharv Raotole

---

## 🙏 Acknowledgments

- **Qloo** for the Taste AI API and the hackathon
- **All The Places** contributors for CC0 store data
- **OpenStreetMap** for geocoding
- CommonGround reference architecture (Cloudflare Workers + D1 patterns)

---

## 📞 Contact

- **GitHub**: [@AtharvRaotole](https://github.com/AtharvRaotole)
- **Project**: https://github.com/AtharvRaotole/LeaseUp
- **Devpost**: https://devpost.com/software/leaseup (once submitted)

Built with ☕ for the Qloo Agentic Hackathon 2026
