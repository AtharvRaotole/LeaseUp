# Pre-registered evaluation plan (written before any Qloo ranking results were collected)

Written: Oct 23, 2026 ~12:50 PM ET. At this point only geocoding and two single API probes
(raw/probe/) had been run. No presence-vs-affinity metric had been computed.

## Unit of analysis
- 40 US retail addresses (addresses.json), 6 categories. Geocoded via Nominatim (1 req/s, UA with contact).
- Candidate brands: the app's TRACKED_BRAND_IDS (227) that (a) exist in the ATP brands.json index and
  (b) receive an affinity score from Qloo at that address. Same candidate set for every ranker at an address.

## Qloo signal (ranker a) - "as the app does it"
GET /v2/insights filter.type=urn:entity:brand, signal.location=POINT(lon lat), signal.location.radius=10000
(app default radius 10 km), filter.results.entities in batches of 45, take=50, feature.explainability=true.
Score = query.affinity.  Ties broken by random jitter (averaged where it matters).

## Ground truth
presence(brand, address) = 1 if ATP tiles (apps/worker/public/tiles) OR OSM snapshot tiles
(data/osm-snapshot/tiles) have a store of that brand within radius r(address).
Density-adaptive radius: D = number of ATP store points (all tracked brands) within 3 km.
  D >= 150 -> urban, r = 1.5 km;   25 <= D < 150 -> suburban, r = 5 km;   D < 25 -> rural, r = 15 km.
Sensitivity: fixed r = 10 km (the app's default) and fixed r = 5 km.

## Rankers
(a) Qloo affinity; (b) national chain size = ATP national count (brands.json `count`);
(c) random, 1000 shuffles averaged; (d) blends: (d1) the app's blend (0.75 * Qloo rank score + 0.25 * count/max),
(d2) logistic blend fit leave-one-address-out (presence ~ log1p(count) + qloo_z).

## Metrics (per address, then mean across addresses; 95% CIs by bootstrap over addresses, 2000 reps)
1. precision@10, precision@20
2. ROC AUC (presence vs score)
3. Spearman rho(score, presence)
4. KEY - lift controlling for chain size:
   4a. Stratified AUC: within each address, brands split into national-count quintiles (global quintiles);
       AUC of Qloo affinity computed within each stratum, averaged (weighted by #pos*#neg pairs). 0.5 = no lift.
   4b. Partial Spearman of Qloo vs presence controlling for log chain size (within address).
   4c. Pooled logistic regression with leave-one-address-out CV:
       M0: presence ~ log1p(count) + density-tier dummies + log radius
       M1: M0 + qloo affinity (within-address z-score)
       Compare held-out log-loss and held-out AUC (pooled and mean per-address). Report delta with bootstrap CI.
   4d. "Truly local" test: M2 adds brand fixed effects (brand's average presence propensity, L2-regularised)
       and asks whether Qloo's address-specific deviation from the brand's mean affinity across addresses
       predicts presence.  This isolates "this neighborhood likes X more than other neighborhoods do".
5. Breakdown of 1-4a by address category.
Primary claim test: metric 4a/4c. Qloo "adds lift" only if the CI on the stratified AUC excludes 0.5
and/or the CV log-loss improvement CI excludes 0.

## Second Qloo signal: heatmap
GET /v2/insights filter.type=urn:heatmap, filter.location=POINT(address), filter.location.radius=15000,
signal.interests.entities=<brand>. Feature = query.affinity (and affinity_rank) of the cell nearest the address
(geohash-6 cells). Run on a stratified subset of addresses (cost: one call per brand per address).
Same metrics 1-4 on that subset, compared head-to-head with insights affinity on the same subset.

## Holdout ("recent openings") check
Only if the data includes store opening dates. ATP tiles store only [brand, lat, lon]; if no dates are available
this check is skipped and reported as skipped.
