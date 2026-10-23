### T1. Headline rankers (mean over 40 addresses, 95% bootstrap CI over addresses)


**Radius = adaptive**

| Ranker | P@10 | P@20 | ROC AUC | Spearman rho |
|---|---|---|---|---|
| (a) Qloo affinity (app) | 0.54 [0.46, 0.61] | 0.47 [0.39, 0.54] | 0.63 [0.60, 0.65] | 0.19 [0.16, 0.23] |
| (b) National chain size | 0.76 [0.71, 0.80] | 0.67 [0.63, 0.72] | 0.71 [0.67, 0.75] | 0.31 [0.26, 0.36] |
| (c) Random (1000 shuffles) | 0.29 [0.25, 0.33] | 0.29 [0.26, 0.34] | 0.50 [0.50, 0.50] | 0.00 [0.00, 0.00] |
| (d1) App blend 0.75 Qloo-rank + 0.25 count/max | 0.59 [0.52, 0.66] | 0.51 [0.44, 0.58] | 0.66 [0.63, 0.68] | 0.24 [0.21, 0.27] |
| (d2) Logistic blend log(chain)+Qloo, leave-one-address-out | 0.82 [0.77, 0.86] | 0.73 [0.68, 0.78] | 0.75 [0.72, 0.78] | 0.37 [0.33, 0.41] |
| Δ (a) − (b) | -0.22 [-0.30, -0.14] | -0.21 [-0.28, -0.13] | -0.08 [-0.14, -0.03] | -0.12 [-0.20, -0.03] |
| Δ (d2) − (b) | 0.06 [0.03, 0.09] | 0.06 [0.03, 0.09] | 0.04 [0.02, 0.06] | 0.06 [0.04, 0.09] |
| Δ (d1) − (b) | -0.17 [-0.24, -0.09] | -0.17 [-0.24, -0.09] | -0.05 [-0.11, 0.00] | -0.07 [-0.15, 0.01] |

**Radius = fixed10**

| Ranker | P@10 | P@20 | ROC AUC | Spearman rho |
|---|---|---|---|---|
| (a) Qloo affinity (app) | 0.72 [0.62, 0.80] | 0.65 [0.56, 0.73] | 0.64 [0.61, 0.67] | 0.23 [0.19, 0.28] |
| (b) National chain size | 0.89 [0.84, 0.92] | 0.82 [0.78, 0.86] | 0.74 [0.71, 0.77] | 0.37 [0.33, 0.41] |
| (c) Random (1000 shuffles) | 0.47 [0.41, 0.53] | 0.47 [0.41, 0.53] | 0.50 [0.50, 0.50] | 0.00 [0.00, 0.00] |
| (d1) App blend 0.75 Qloo-rank + 0.25 count/max | 0.76 [0.68, 0.84] | 0.69 [0.60, 0.77] | 0.67 [0.65, 0.69] | 0.28 [0.24, 0.31] |
| (d2) Logistic blend log(chain)+Qloo, leave-one-address-out | 0.91 [0.87, 0.95] | 0.86 [0.82, 0.91] | 0.79 [0.77, 0.81] | 0.46 [0.43, 0.49] |
| Δ (a) − (b) | -0.17 [-0.26, -0.09] | -0.17 [-0.24, -0.11] | -0.10 [-0.15, -0.04] | -0.14 [-0.22, -0.06] |
| Δ (d2) − (b) | 0.03 [0.00, 0.06] | 0.04 [0.02, 0.06] | 0.05 [0.03, 0.07] | 0.09 [0.06, 0.11] |
| Δ (d1) − (b) | -0.12 [-0.21, -0.05] | -0.13 [-0.21, -0.06] | -0.07 [-0.12, -0.02] | -0.10 [-0.17, -0.02] |

**Radius = fixed5**

| Ranker | P@10 | P@20 | ROC AUC | Spearman rho |
|---|---|---|---|---|
| (a) Qloo affinity (app) | 0.59 [0.51, 0.67] | 0.51 [0.43, 0.59] | 0.62 [0.60, 0.65] | 0.19 [0.16, 0.23] |
| (b) National chain size | 0.79 [0.74, 0.84] | 0.72 [0.66, 0.76] | 0.72 [0.68, 0.75] | 0.32 [0.27, 0.37] |
| (c) Random (1000 shuffles) | 0.33 [0.28, 0.37] | 0.33 [0.28, 0.37] | 0.50 [0.50, 0.50] | 0.00 [0.00, 0.00] |
| (d1) App blend 0.75 Qloo-rank + 0.25 count/max | 0.64 [0.56, 0.71] | 0.55 [0.46, 0.62] | 0.65 [0.63, 0.68] | 0.24 [0.21, 0.27] |
| (d2) Logistic blend log(chain)+Qloo, leave-one-address-out | 0.84 [0.79, 0.89] | 0.77 [0.71, 0.82] | 0.75 [0.73, 0.78] | 0.38 [0.34, 0.42] |
| Δ (a) − (b) | -0.20 [-0.29, -0.11] | -0.21 [-0.28, -0.13] | -0.09 [-0.15, -0.04] | -0.13 [-0.21, -0.05] |
| Δ (d2) − (b) | 0.05 [0.02, 0.08] | 0.05 [0.03, 0.07] | 0.04 [0.02, 0.05] | 0.06 [0.04, 0.08] |
| Δ (d1) − (b) | -0.16 [-0.24, -0.07] | -0.17 [-0.24, -0.10] | -0.06 [-0.12, -0.01] | -0.08 [-0.16, -0.01] |

### T2. Lift after controlling for chain size (key metric)

| Metric | adaptive | fixed 10 km | fixed 5 km |
|---|---|---|---|
| Stratified AUC of Qloo within chain-size quintiles (pooled; 0.5 = no lift) | 0.672 [0.650, 0.693] | 0.703 [0.682, 0.723] | 0.670 [0.650, 0.689] |
| Stratified AUC (mean of per-address) | 0.663 [0.642, 0.684] | 0.688 [0.665, 0.711] | 0.660 [0.641, 0.680] |
| Partial Spearman Qloo~presence | log chain size | 0.239 [0.208, 0.273] | 0.291 [0.253, 0.328] | 0.239 [0.207, 0.275] |
| Spearman Qloo vs log chain size (confound check) | -0.105 [-0.125, -0.085] | -0.105 [-0.125, -0.085] | -0.105 [-0.125, -0.085] |
| Held-out log-loss/obs, M0 chain+density | 0.555 [0.518, 0.593] | 0.599 [0.567, 0.634] | 0.553 [0.507, 0.596] |
| Held-out log-loss/obs, M1 = M0 + Qloo | 0.533 [0.496, 0.567] | 0.564 [0.533, 0.596] | 0.530 [0.487, 0.572] |
| Log-loss improvement M1 vs M0 (%) | 4.1 [2.8, 5.2] | 5.9 [4.6, 7.1] | 4.2 [2.9, 5.4] |
| Per-address AUC M0 (= chain order) | 0.710 [0.673, 0.749] | 0.740 [0.711, 0.771] | 0.717 [0.683, 0.754] |
| Per-address AUC M1 | 0.750 [0.721, 0.778] | 0.791 [0.772, 0.810] | 0.754 [0.728, 0.780] |
| AUC gain M1 − M0 | 0.039 [0.025, 0.054] | 0.051 [0.035, 0.068] | 0.038 [0.024, 0.051] |
| Brand-FE model: AUC FE0 (brand propensity + density) | 0.787 [0.763, 0.806] | 0.828 [0.812, 0.843] | 0.795 [0.774, 0.813] |
| AUC FE1 = FE0 + Qloo local deviation | 0.813 [0.793, 0.830] | 0.860 [0.847, 0.871] | 0.825 [0.808, 0.840] |
| AUC gain FE1 − FE0 | 0.026 [0.016, 0.035] | 0.031 [0.022, 0.040] | 0.030 [0.020, 0.039] |
| Log-loss improvement FE1 vs FE0 (%) | 4.9 [3.7, 6.1] | 8.3 [6.7, 9.8] | 5.8 [4.3, 7.2] |

### T3. Within chain-size stratum (adaptive radius, pooled over addresses)

| Stratum | national store count | presence rate | within-stratum AUC of Qloo |
|---|---|---|---|
| Q1 | 24–176 | 0.14 | 0.715 |
| Q2 | 177–438 | 0.24 | 0.617 |
| Q3 | 439–864 | 0.25 | 0.734 |
| Q4 | 865–1771 | 0.31 | 0.620 |
| Q5 | 1810–20496 | 0.54 | 0.691 |

### T4. "Rank within a chain-size tier": P@5 inside each tier (adaptive radius, mean over 40 addresses)

| Tier (store count) | Qloo order P@5 | Chain-size order P@5 | Random P@5 | Qloo − chain |
|---|---|---|---|---|
| Q1 (24–176) | 0.31 [0.22, 0.41] | 0.10 [0.05, 0.15] | 0.13 [0.09, 0.17] | 0.22 [0.13, 0.31] |
| Q2 (177–438) | 0.28 [0.18, 0.38] | 0.25 [0.18, 0.32] | 0.24 [0.19, 0.29] | 0.03 [-0.04, 0.11] |
| Q3 (439–864) | 0.53 [0.43, 0.64] | 0.23 [0.15, 0.30] | 0.24 [0.19, 0.30] | 0.31 [0.22, 0.40] |
| Q4 (865–1771) | 0.45 [0.36, 0.56] | 0.36 [0.27, 0.46] | 0.31 [0.25, 0.36] | 0.09 [0.03, 0.15] |
| Q5 (1810–20496) | 0.68 [0.61, 0.75] | 0.82 [0.78, 0.86] | 0.54 [0.50, 0.59] | -0.15 [-0.21, -0.07] |

### T5. By address category (adaptive radius; CI over addresses within category)

| Category | n | Qloo P@10 | Chain P@10 | Qloo AUC | Chain AUC | Logistic blend AUC | Stratified AUC (Qloo) | Partial rho |
|---|---|---|---|---|---|---|---|---|
| affluent_suburban | 6 | 0.72 [0.52, 0.92] | 0.77 [0.62, 0.92] | 0.71 [0.64, 0.77] | 0.60 [0.54, 0.65] | 0.68 [0.61, 0.75] | 0.72 [0.65, 0.80] | 0.35 [0.24, 0.46] |
| college_town | 6 | 0.58 [0.47, 0.72] | 0.80 [0.73, 0.88] | 0.62 [0.61, 0.63] | 0.75 [0.71, 0.79] | 0.78 [0.75, 0.82] | 0.67 [0.65, 0.69] | 0.25 [0.22, 0.27] |
| dense_urban | 9 | 0.53 [0.40, 0.68] | 0.60 [0.52, 0.67] | 0.68 [0.65, 0.70] | 0.60 [0.57, 0.64] | 0.68 [0.65, 0.71] | 0.68 [0.65, 0.71] | 0.28 [0.24, 0.31] |
| small_town | 6 | 0.20 [0.15, 0.25] | 0.78 [0.72, 0.85] | 0.52 [0.48, 0.56] | 0.90 [0.89, 0.92] | 0.87 [0.84, 0.89] | 0.61 [0.57, 0.64] | 0.11 [0.07, 0.15] |
| sunbelt_growth | 7 | 0.64 [0.54, 0.74] | 0.81 [0.77, 0.86] | 0.58 [0.55, 0.61] | 0.75 [0.70, 0.80] | 0.77 [0.72, 0.82] | 0.63 [0.60, 0.67] | 0.20 [0.14, 0.25] |
| tourist | 6 | 0.53 [0.33, 0.68] | 0.83 [0.70, 0.97] | 0.63 [0.56, 0.69] | 0.71 [0.61, 0.80] | 0.75 [0.67, 0.80] | 0.66 [0.62, 0.70] | 0.24 [0.15, 0.32] |

### T6. Per address (adaptive radius), sorted by stratified AUC; CI = bootstrap over brands

| Address | Category | Tier / r | Brands | Present | Qloo P@10 | Chain P@10 | Blend P@10 | Stratified AUC [95% CI] | Percentile |
|---|---|---|---|---|---|---|---|---|---|
| edina_mn | affluent_suburban | rural / 15 km | 224 | 162 | 1.0 | 1.0 | 1.0 | 0.834 [0.77, 0.89] | 100 |
| wellesley_ma | affluent_suburban | rural / 15 km | 224 | 134 | 1.0 | 1.0 | 1.0 | 0.817 [0.76, 0.87] | 97 |
| sf_fillmore | dense_urban | urban / 1.5 km | 224 | 42 | 0.8 | 0.5 | 0.6 | 0.766 [0.68, 0.84] | 95 |
| greenwich_ct | affluent_suburban | suburban / 5 km | 224 | 37 | 0.5 | 0.7 | 0.8 | 0.747 [0.64, 0.83] | 92 |
| palo_alto_ca | affluent_suburban | suburban / 5 km | 224 | 62 | 0.8 | 0.5 | 0.7 | 0.742 [0.65, 0.82] | 90 |
| branson_mo | tourist | suburban / 5 km | 219 | 74 | 0.7 | 0.9 | 0.9 | 0.721 [0.64, 0.79] | 87 |
| parkcity_ut | tourist | rural / 15 km | 220 | 51 | 0.4 | 0.6 | 0.7 | 0.712 [0.63, 0.80] | 85 |
| sea_caphill | dense_urban | suburban / 5 km | 224 | 69 | 0.9 | 0.6 | 0.8 | 0.709 [0.62, 0.79] | 82 |
| athens_ga | college_town | suburban / 5 km | 223 | 64 | 0.7 | 1.0 | 1.0 | 0.705 [0.61, 0.80] | 79 |
| nyc_uws | dense_urban | urban / 1.5 km | 224 | 47 | 0.4 | 0.5 | 0.6 | 0.701 [0.61, 0.79] | 77 |
| lasvegas_strip | tourist | urban / 1.5 km | 224 | 72 | 0.7 | 0.6 | 0.7 | 0.699 [0.61, 0.78] | 74 |
| cary_nc | sunbelt_growth | suburban / 5 km | 219 | 94 | 0.8 | 0.9 | 1.0 | 0.698 [0.62, 0.79] | 72 |
| ithaca_ny | college_town | suburban / 5 km | 221 | 47 | 0.4 | 0.7 | 0.8 | 0.695 [0.58, 0.81] | 69 |
| phl_walnut | dense_urban | urban / 1.5 km | 224 | 83 | 0.8 | 0.8 | 0.8 | 0.691 [0.62, 0.77] | 67 |
| chi_wicker | dense_urban | urban / 1.5 km | 224 | 42 | 0.3 | 0.7 | 0.9 | 0.688 [0.60, 0.78] | 64 |
| nyc_williamsburg | dense_urban | urban / 1.5 km | 224 | 43 | 0.4 | 0.7 | 0.7 | 0.688 [0.60, 0.78] | 62 |
| boulder_co | college_town | suburban / 5 km | 224 | 72 | 0.8 | 0.8 | 0.9 | 0.684 [0.59, 0.77] | 59 |
| gilbert_az | sunbelt_growth | suburban / 5 km | 218 | 104 | 0.7 | 0.8 | 1.0 | 0.679 [0.59, 0.77] | 56 |
| chi_lakeview | dense_urban | urban / 1.5 km | 224 | 53 | 0.5 | 0.6 | 0.7 | 0.676 [0.58, 0.77] | 54 |
| annarbor_mi | college_town | suburban / 5 km | 222 | 102 | 0.7 | 0.8 | 1.0 | 0.672 [0.59, 0.76] | 51 |
| frisco_tx | sunbelt_growth | suburban / 5 km | 224 | 67 | 0.4 | 0.8 | 1.0 | 0.666 [0.56, 0.76] | 49 |
| sf_mission | dense_urban | urban / 1.5 km | 224 | 29 | 0.3 | 0.4 | 0.6 | 0.663 [0.54, 0.76] | 46 |
| bemidji_mn | small_town | suburban / 5 km | 182 | 37 | 0.3 | 0.8 | 0.6 | 0.655 [0.53, 0.78] | 44 |
| austin_soco | sunbelt_growth | suburban / 5 km | 224 | 75 | 0.8 | 0.7 | 0.8 | 0.652 [0.57, 0.74] | 41 |
| hutchinson_ks | small_town | rural / 15 km | 201 | 42 | 0.2 | 0.9 | 0.9 | 0.651 [0.51, 0.78] | 38 |
| chapelhill_nc | college_town | suburban / 5 km | 221 | 42 | 0.5 | 0.7 | 0.8 | 0.651 [0.55, 0.75] | 36 |
| myrtle_sc | tourist | suburban / 5 km | 224 | 78 | 0.6 | 1.0 | 1.0 | 0.632 [0.55, 0.72] | 33 |
| madison_wi | college_town | suburban / 5 km | 223 | 60 | 0.4 | 0.8 | 0.9 | 0.621 [0.52, 0.71] | 31 |
| sevierville_tn | tourist | suburban / 5 km | 224 | 88 | 0.7 | 1.0 | 0.9 | 0.618 [0.53, 0.70] | 28 |
| naperville_il | affluent_suburban | suburban / 5 km | 224 | 98 | 0.7 | 0.8 | 0.9 | 0.614 [0.53, 0.69] | 26 |
| nashville_12s | sunbelt_growth | suburban / 5 km | 224 | 103 | 0.7 | 0.9 | 0.9 | 0.609 [0.52, 0.69] | 23 |
| bethesda_md | affluent_suburban | suburban / 5 km | 224 | 68 | 0.3 | 0.6 | 0.8 | 0.603 [0.51, 0.69] | 21 |
| sedalia_mo | small_town | suburban / 5 km | 151 | 33 | 0.2 | 0.9 | 1.0 | 0.599 [0.44, 0.76] | 18 |
| ottumwa_ia | small_town | suburban / 5 km | 145 | 25 | 0.2 | 0.7 | 0.6 | 0.598 [0.44, 0.75] | 15 |
| dc_14th | dense_urban | urban / 1.5 km | 224 | 67 | 0.4 | 0.6 | 0.7 | 0.590 [0.50, 0.68] | 13 |
| charlotte_se | sunbelt_growth | suburban / 5 km | 224 | 78 | 0.6 | 0.8 | 0.8 | 0.576 [0.48, 0.66] | 10 |
| laramie_wy | small_town | suburban / 5 km | 205 | 28 | 0.1 | 0.7 | 0.8 | 0.565 [0.42, 0.71] | 8 |
| elko_nv | small_town | suburban / 5 km | 170 | 23 | 0.2 | 0.7 | 0.5 | 0.542 [0.39, 0.69] | 5 |
| boise_id | sunbelt_growth | suburban / 5 km | 220 | 43 | 0.5 | 0.8 | 0.8 | 0.541 [0.43, 0.65] | 3 |
| keywest_fl | tourist | rural / 15 km | 224 | 30 | 0.1 | 0.9 | 0.9 | 0.538 [0.41, 0.67] | 0 |

### T7. Exploratory near-miss check (NOT the requested openings holdout)

Among 6068 absent (address, brand) pairs, AUC of chain-size-residualised Qloo for 'has a store within 3x the radius' = 0.611 [0.583, 0.641]; top residual quartile 40% vs bottom quartile 17%.


### T8. Most / least Qloo-favoured brands (mean within-address z of affinity, adaptive presence rate)

| Brand | ATP US count | mean z | presence rate |
|---|---|---|---|
| Starbucks | 16708 | 0.82 | 0.97 |
| Lululemon | 457 | 0.82 | 0.65 |
| Sephora | 537 | 0.81 | 0.47 |
| REI | 193 | 0.81 | 0.25 |
| Nike | 252 | 0.81 | 0.23 |
| Ulta | 1556 | 0.81 | 0.53 |
| Victoria's Secret | 768 | 0.81 | 0.28 |
| Whole Foods Market | 535 | 0.81 | 0.53 |
| HomeGoods | 940 | 0.81 | 0.28 |
| Target | 2026 | 0.80 | 0.57 |
| Vans | 397 | 0.80 | 0.17 |
| Nordstrom | 98 | 0.80 | 0.20 |
| Nando's | 47 | -2.41 | 0.09 |
| Au Bon Pain | 24 | -3.06 | 0.11 |
| Five Guys | 1512 | -3.47 | 0.57 |
| Papa John's | 3086 | -3.90 | 0.67 |
| Lidl | 203 | -5.63 | 0.07 |
| Texas Roadhouse | 741 | -5.71 | 0.08 |

### T9. Heatmap vs insights, 12-address subset (adaptive radius)

Subset: chi_wicker, sf_mission, greenwich_ct, naperville_il, boulder_co, madison_wi, hutchinson_ks, elko_nv, sevierville_tn, myrtle_sc, frisco_tx, nashville_12s

| Signal (alone) | P@10 | AUC | Stratified AUC | Partial rho |
|---|---|---|---|---|
| Insights affinity (app) | 0.48 [0.37, 0.60] | 0.610 [0.575, 0.640] | 0.645 [0.624, 0.673] | 0.207 [0.170, 0.239] |
| Heatmap affinity, nearest cell | 0.32 [0.19, 0.46] | 0.549 [0.503, 0.593] | 0.560 [0.505, 0.608] | 0.095 [0.017, 0.167] |
| Heatmap affinity_rank, nearest cell | 0.52 [0.37, 0.66] | 0.603 [0.581, 0.625] | 0.626 [0.604, 0.648] | 0.187 [0.147, 0.228] |
| Heatmap affinity, mean of cells within 1.5 km | 0.27 [0.18, 0.37] | 0.565 [0.519, 0.606] | 0.598 [0.547, 0.637] | 0.137 [0.067, 0.197] |

| Logistic model (leave-one-address-out) | P@10 | per-address AUC | held-out log-loss/obs |
|---|---|---|---|
| chain | 0.79 [0.70, 0.88] | 0.741 [0.681, 0.807] | 0.536 [0.472, 0.603] |
| chain+ins | 0.84 [0.77, 0.91] | 0.765 [0.714, 0.821] | 0.520 [0.453, 0.596] |
| chain+hm | 0.78 [0.67, 0.88] | 0.744 [0.687, 0.804] | 0.533 [0.472, 0.602] |
| chain+hmr | 0.82 [0.72, 0.90] | 0.768 [0.721, 0.814] | 0.519 [0.458, 0.586] |
| chain+ins+hm | 0.85 [0.77, 0.93] | 0.764 [0.716, 0.820] | 0.521 [0.454, 0.593] |
| chain+ins+hmr | 0.83 [0.74, 0.91] | 0.771 [0.723, 0.820] | 0.516 [0.454, 0.592] |

| Comparison | value [95% CI] |
|---|---|
| auc_gain_chain+ins_vs_chain | 0.024 [0.009, 0.038] |
| auc_gain_chain+hm_vs_chain | 0.003 [-0.009, 0.013] |
| auc_gain_chain+hmr_vs_chain | 0.027 [0.010, 0.044] |
| auc_gain_chain+ins+hm_vs_chain | 0.023 [0.006, 0.037] |
| auc_gain_chain+ins+hmr_vs_chain | 0.030 [0.011, 0.047] |
| auc_gain_ins+hm_vs_ins | -0.001 [-0.004, 0.001] |
| auc_gain_ins+hmr_vs_ins | 0.005 [-0.001, 0.012] |
| ll_gain_pct_ins+hmr_vs_ins | 0.742 [0.129, 1.203] |
| strat_auc_hmr_minus_ins | -0.019 [-0.041, -0.000] |
| strat_auc_hm_minus_ins | -0.085 [-0.147, -0.032] |
| mean Spearman(insights, heatmap) per address | 0.50 |