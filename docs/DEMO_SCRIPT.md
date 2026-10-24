# LeaseUp 2-minute demo script

**Audience:** Hackathon judges. **Mode:** Demo (`APP_MODE=demo`) at https://leaseup-59m.pages.dev  
**Headline eval numbers** match `/methodology` (40-site live Qloo study, adaptive radius).

---

**0:00 - Hook (15 s)**  
"LeaseUp answers one question: which chains fit this storefront but do not already have a store nearby? We use Qloo taste rankings, then prove the list against real chain locations."

**0:15 - Site report (45 s)**  
- Open the site. Click **Wicker Park** (1574 N Milwaukee Ave, Chicago).  
- Leave radius **10 km**, run **Analyze**.  
- Point at the proof line: taste-aware blend vs store count alone on this pin (from the recorded 40-site eval row, e.g. **9 of 10** vs **7 of 10** at 1.5 km adaptive radius).  
- Scroll the **Brands to pitch** list: ranked prospects with absence checks.  
- Toggle **Without taste**: same pool ordered by national chain size; compare the proof line.  
- Map panel (right): ATP locations; click a brand to sync the map.

**1:00 - Trust + methodology (25 s)**  
- Nav: **How it works** (`/methodology`).  
- Cite the cohort: same-size tier AUC **0.67** [0.65, 0.69]; logistic blend **82%** top-10 presence vs chain size **76%**; raw Qloo order **54%** (does not beat chain size).  
- Mid-size chain tier (Q3) **53%** vs **23%** at P@5 inside the tier.  
- Caveat: taste may partly reflect brands already nearby; use absence checks on the pitch list.

**1:25 - Brand + portfolio (30 s)**  
- **Brand sites:** open Bath & Body Works (or search), Chicago metro heatmap + store overlay.  
- **Portfolio:** paste two addresses, **Geocode and analyze**, show batch table and share link (if time).

**1:55 - Close (5 s)**  
- **Pipeline:** drag a card between stages (optional).  
- "Everything is open source, MIT licensed, with CSP, worker smoke tests, and accessibility checks in CI. Questions?"

---

**Backup lines if something fails**  
- Taste API slow: message says "Taste data is slow right now. Try again in a moment." (retries run in the worker).  
- API blocked: mention CSP regression test in CI and same-origin Worker URL.  
- Slow network: use Wicker demo chip only (recorded JSON, no live Qloo).
