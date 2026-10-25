"""Taste twins as a ranking feature, evaluated the way production uses them.

Fixes two issues in the earlier twin blend (TASTE_TWIN_EVAL.md):
1. Live prospecting ranks only the top 50 brands by Qloo affinity (planner take=50). Twins were computed by
   z-scoring that truncated list against panel vectors z-scored over all ~224 brands, which picked rural
   twins for urban sites. Here every site is z-scored over the same brand subset ("consistent" twins).
2. Leakage: the old blend built training rows' twin shares from a panel that still contained the held out
   site. Here, for each held out site t, t is removed from the panel before anything is computed.

Leave one address out. Arms are refit in each fold on the 39 other sites. Metrics are computed inside each
site's pool (top N by affinity, or all scored brands). Usage: /workspace/venv-eval/bin/python twin_rank_eval.py
"""
import json, math
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from backtest_common import ROOT, GEO, build_tables, km

K, EXCLUDE_KM, MIN_COMMON = 5, 50, 30
A, BM = build_tables()
KEYS = list(A)
BR = sorted(BM)
BI = {b: i for i, b in enumerate(BR)}
NS = len(KEYS)
AFF = np.full((NS, len(BR)), np.nan)
Y = np.zeros((NS, len(BR)))
for si, a in enumerate(KEYS):
    for b, af, y in zip(A[a]['b'], A[a]['aff'], A[a]['y']):
        AFF[si, BI[b]] = af
        Y[si, BI[b]] = y
FAR = np.array([[km(GEO[a], GEO[c]) > EXCLUDE_KM for c in KEYS] for a in KEYS])


def pool(si, n):
    cols = np.where(~np.isnan(AFF[si]))[0]
    order = cols[np.argsort(-AFF[si, cols], kind='stable')]
    return order[:n] if n else order


def zrows(cols):
    sub = AFF[:, cols]
    out = np.full(sub.shape, np.nan)
    for r in range(NS):
        m = ~np.isnan(sub[r])
        if m.sum() >= 2:
            out[r, m] = (sub[r, m] - sub[r, m].mean()) / (sub[r, m].std() + 1e-12)
    return out


def pear(x, y):
    x = x - x.mean(); y = y - y.mean()
    d = math.sqrt((x * x).sum() * (y * y).sum())
    return float((x * y).sum() / d) if d > 0 else 0.0


def twins(si, cols, panel, consistent=True):
    """Top K panel sites by Pearson of taste deviations over the site's own brand pool."""
    if consistent:
        zs = zrows(cols)
        bm = np.nanmean(zs[panel], axis=0)
        v = zs[si] - bm
        ref = zs - bm
    else:  # what production did: pool z vs panel dev built over all brands
        z = (AFF[si, cols] - AFF[si, cols].mean()) / AFF[si, cols].std()
        bmz = np.array([BM[BR[c]] for c in cols])
        v = z - bmz
        full = zrows(np.arange(len(BR)))
        ref = full[:, cols] - bmz
    scored = []
    for c in panel:
        if c == si or not FAR[si, c]:
            continue
        m = ~np.isnan(ref[c]) & ~np.isnan(v)
        if m.sum() < MIN_COMMON:
            continue
        scored.append((pear(v[m], ref[c][m]), c))
    scored.sort(key=lambda t: (-t[0], KEYS[t[1]]))
    return [c for _, c in scored[:K]]


def features(si, cols, panel, consistent=True):
    d = A[KEYS[si]]
    aff = AFF[si, cols]
    z = (aff - aff.mean()) / (aff.std() + 1e-12)
    from backtest_common import CNT
    lc = np.array([np.log1p(CNT[BR[c]]) for c in cols])
    n = len(cols)
    tier = [np.full(n, 1.0 if d['tier'] == t else 0.0) for t in ('urban', 'suburban')]
    m1 = np.column_stack([lc, np.full(n, np.log(d['r'])), np.full(n, np.log1p(d['dens']))] + tier + [z])
    tw = twins(si, cols, panel, consistent)
    share = Y[tw][:, cols].mean(axis=0) if tw else np.zeros(n)
    far = [c for c in panel if c != si and FAR[si, c]]
    rate = Y[far][:, cols].mean(axis=0)
    return m1, share, rate, tw


def p_at(score, y, k, rng, reps=50):
    return float(np.mean([y[np.lexsort((rng.random(len(score)), -score))[:k]].mean() for _ in range(reps)]))


def run(n, consistent=True, seed=20261025):
    rng = np.random.default_rng(seed)
    arms = {'m1': [0], 'm1_twin': [0, 1], 'm1_rate': [0, 2], 'm1_rate_twin': [0, 2, 1]}
    per = {a: [] for a in arms}
    twin_only = []
    for t in range(NS):
        panel = [c for c in range(NS) if c != t]
        F = {}
        for si in range(NS):
            cols = pool(si, n)
            F[si] = (cols,) + features(si, cols, panel if si == t else [c for c in panel if c != si], consistent)
        y_t = Y[t, F[t][0]]
        for arm, parts in arms.items():
            def X(si):
                m1, share, rate = F[si][1], F[si][2], F[si][3]
                cols = [m1] + [[None, share, rate][p][:, None] for p in parts if p]
                return np.hstack(cols)
            Xa = np.vstack([X(a) for a in panel])
            ya = np.concatenate([Y[a, F[a][0]] for a in panel])
            mu, sd = Xa.mean(0), Xa.std(0) + 1e-9
            mdl = LogisticRegression(C=1e4, max_iter=5000).fit((Xa - mu) / sd, ya)
            s = mdl.predict_proba((X(t) - mu) / sd)[:, 1]
            per[arm].append((p_at(s, y_t, 5, rng), p_at(s, y_t, 10, rng), roc_auc_score(y_t, s) if 0 < y_t.sum() < len(y_t) else np.nan))
        sh = F[t][2]
        twin_only.append((p_at(sh, y_t, 5, rng), p_at(sh, y_t, 10, rng), roc_auc_score(y_t, sh) if 0 < y_t.sum() < len(y_t) else np.nan))
    per['twin_share_only'] = twin_only
    out = {a: {'p5': float(np.nanmean([r[0] for r in v])), 'p10': float(np.nanmean([r[1] for r in v])),
               'auc': float(np.nanmean([r[2] for r in v]))} for a, v in per.items()}
    for a, b in [('m1_twin', 'm1'), ('m1_rate_twin', 'm1_rate')]:
        for j, name in [(1, 'p10'), (2, 'auc')]:
            d = np.array([per[a][i][j] - per[b][i][j] for i in range(NS)])
            d = d[~np.isnan(d)]
            bs = [np.mean(rng.choice(d, len(d))) for _ in range(2000)]
            out[f'{a}_minus_{b}_{name}_ci95'] = [float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))]
    return out


def run_shipped(seed=20261025):
    """The shipped model: m1 plus twinShare fit on both pools (top 50 and all) of the 39 training sites,
    scored on the held out site's top 50 pool (live prospecting) and all pool (analyze). Compared with m1
    fit the same way."""
    rng = np.random.default_rng(seed)
    per = {(arm, n): [] for arm in ('m1', 'm1_twin') for n in (50, None)}
    for t in range(NS):
        panel = [c for c in range(NS) if c != t]
        F = {}
        for si in range(NS):
            for n in (50, None):
                cols = pool(si, n)
                m1, share, _rate, _tw = features(si, cols, panel if si == t else [c for c in panel if c != si])
                F[si, n] = (cols, m1, share)
        for arm in ('m1', 'm1_twin'):
            X = lambda k: F[k][1] if arm == 'm1' else np.hstack([F[k][1], F[k][2][:, None]])
            Xa = np.vstack([X((a, n)) for a in panel for n in (50, None)])
            ya = np.concatenate([Y[a, F[a, n][0]] for a in panel for n in (50, None)])
            mu, sd = Xa.mean(0), Xa.std(0) + 1e-9
            mdl = LogisticRegression(C=1e4, max_iter=5000).fit((Xa - mu) / sd, ya)
            for n in (50, None):
                s = mdl.predict_proba((X((t, n)) - mu) / sd)[:, 1]
                y_t = Y[t, F[t, n][0]]
                per[arm, n].append((p_at(s, y_t, 5, rng), p_at(s, y_t, 10, rng),
                                    roc_auc_score(y_t, s) if 0 < y_t.sum() < len(y_t) else np.nan))
    out = {}
    for n in (50, None):
        key = f"pool_{n or 'all'}"
        out[key] = {arm: {'p5': float(np.nanmean([r[0] for r in per[arm, n]])),
                          'p10': float(np.nanmean([r[1] for r in per[arm, n]])),
                          'auc': float(np.nanmean([r[2] for r in per[arm, n]]))} for arm in ('m1', 'm1_twin')}
        for j, name in [(1, 'p10'), (2, 'auc')]:
            d = np.array([per['m1_twin', n][i][j] - per['m1', n][i][j] for i in range(NS)])
            d = d[~np.isnan(d)]
            bs = [np.mean(rng.choice(d, len(d))) for _ in range(2000)]
            out[key][f'm1_twin_minus_m1_{name}_ci95'] = [float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))]
        out[key]['sites_twin_better_p10'] = int(sum(per['m1_twin', n][i][1] > per['m1', n][i][1] + 1e-9 for i in range(NS)))
        out[key]['sites_twin_worse_p10'] = int(sum(per['m1_twin', n][i][1] < per['m1', n][i][1] - 1e-9 for i in range(NS)))
    return out


if __name__ == '__main__':
    res = {'k': K, 'exclude_km': EXCLUDE_KM, 'min_common': MIN_COMMON}
    for n in (50, None):
        for consistent in (True, False):
            key = f"pool_{n or 'all'}_{'consistent' if consistent else 'old'}"
            res[key] = run(n, consistent)
            print(key, json.dumps(res[key], indent=None))
    res['shipped_both_pools'] = run_shipped()
    print('shipped_both_pools', json.dumps(res['shipped_both_pools'], indent=None))
    json.dump(res, open(ROOT + '/twin_rank_eval.json', 'w'), indent=2)
