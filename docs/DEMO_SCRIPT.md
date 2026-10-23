# LeaseUp 2-minute demo script

**Audience:** Hackathon judges. **Mode:** Demo (`APP_MODE=demo`) at https://leaseup-59m.pages.dev  
**Numbers below are from recorded fixtures (Oct 2026), not invented.**

---

**0:00 - Hook (15 s)**  
"LeaseUp answers one question: which chains fit this storefront but do not already have a store nearby? We use Qloo taste rankings, then prove the list against real chain locations."

**0:15 - Site report (45 s)**  
- Open the site. Click **Wicker Park** (1574 N Milwaukee Ave, Chicago).  
- Leave radius **10 km**, run **Analyze**.  
- Point at the headline: brands that fit Wicker Park with **no store in 10 km**.  
- Stats row: on this recording, **10 of 10** top-ranked tracked brands already have a store in radius (P@10 **1.00** on the fixture backtest).  
- Scroll the **Brands to pitch** list (above the fold on desktop): ranked prospects with absence checks.  
- Toggle **Without taste**: same pool ordered by national chain size; compare the proof line.  
- Map panel (right): ATP locations; click a brand to sync the map.

**1:00 - Trust + methodology (25 s)**  
- Nav: **How it works** (`/methodology`).  
- Pipeline: geocode, Qloo, ATP + OSM, backtest, outreach.  
- Evaluation table: recorded metros (fixture-backed rows show real backtest counts; pending rows need live Qloo run).

**1:25 - Brand + portfolio (30 s)**  
- **Brand sites:** open Bath & Body Works (or search), Chicago metro heatmap + store overlay.  
- **Portfolio:** paste two addresses, **Geocode and analyze**, show batch table and share link (if time).

**1:55 - Close (5 s)**  
- **Pipeline:** drag a card between stages (optional).  
- "Everything is open source, MIT licensed, with CSP and accessibility checks in CI. Questions?"

---

**Backup lines if something fails**  
- API blocked: mention CSP regression test in CI and same-origin Worker URL.  
- Slow network: use Wicker demo chip only (recorded JSON, no live Qloo).
