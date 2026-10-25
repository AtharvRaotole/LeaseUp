"""Taste-twin comparables: does a brand's presence in the panel sites whose Qloo taste is closest to a
site predict whether the brand trades at that site?

Method (leave one address out, no site sees its own label):
  taste vector = per-site z-score of Qloo brand affinity minus that brand's mean z across the panel
                 (removes "popular everywhere"), the same 'dev' feature analyze.py uses;
  twins        = the K panel sites with the highest Pearson correlation of taste vectors, excluding the
                 site itself and any panel site within 50 km (no shared stores or same-metro leakage);
  twin score   = share of the K twins where the brand has a store within that twin's adaptive radius.
Controls: K random panel sites (20 draws), the K least similar sites, and the panel-wide presence rate.
Blend: leave-one-address-out logistic (chain size + context + Qloo z + panel rate) with and without the
twin score. K=5 is what the app ships; K=3 and K=8 and raw z vectors are reported too (chosen after
looking at all of them, so treat K=5 as one point on the curve, not a pre-registered test).
Usage: python3 taste_twin_eval.py  (writes taste_twin_eval.json)
"""
import json
import numpy as np
from sklearn.metrics import roc_auc_score
from sklearn.linear_model import LogisticRegression
from backtest_common import ROOT, GEO, build_tables, design_m1, km, p_at_k

EXCLUDE_KM = 50
rng = np.random.default_rng(20261025)
A, BM = build_tables()
KEYS = list(A)


def vec(a, kind):
    d = A[a]
    return dict(zip(d['b'], d[kind]))


def sim(a, c, kind):
    va, vc = vec(a, kind), vec(c, kind)
    common = [b for b in va if b in vc]
    return float(np.corrcoef([va[b] for b in common], [vc[b] for b in common])[0, 1])


def candidates(t):
    return [c for c in KEYS if c != t and km(GEO[t], GEO[c]) > EXCLUDE_KM]


def presence(c, b):
    d = A[c]
    i = d['b'].index(b) if b in d['b'] else -1
    return int(d['y'][i]) if i >= 0 else 0


def share(t, picks):
    return np.array([np.mean([presence(c, b) for c in picks]) for b in A[t]['b']])


def blend_p10(feature_by_site, with_twin):
    out = []
    for t in KEYS:
        def X(a):
            cols = [design_m1(A[a]), feature_by_site[a]['panel'][:, None]]
            if with_twin:
                cols.append(feature_by_site[a]['twin'][:, None])
            return np.hstack(cols)
        Xa = np.vstack([X(a) for a in KEYS if a != t])
        ya = np.concatenate([A[a]['y'] for a in KEYS if a != t])
        mu, sd = Xa.mean(0), Xa.std(0) + 1e-9
        m = LogisticRegression(C=1e4, max_iter=5000).fit((Xa - mu) / sd, ya)
        out.append((p_at_k(m.predict_proba((X(t) - mu) / sd)[:, 1], A[t]['y'], 10, rng),
                    roc_auc_score(A[t]['y'], m.predict_proba((X(t) - mu) / sd)[:, 1])))
    return float(np.mean([o[0] for o in out])), float(np.mean([o[1] for o in out]))


results = {'exclude_km': EXCLUDE_KM, 'n_sites': len(KEYS), 'variants': {}}
for kind in ['dev', 'z']:
    sims = {t: sorted(((sim(t, c, kind), c) for c in candidates(t)), reverse=True) for t in KEYS}
    for K in [3, 5, 8]:
        rows = {'twin': [], 'random': [], 'least': [], 'panel': [], 'chain': []}
        feats = {}
        for t in KEYS:
            y = A[t]['y']
            twins = [c for _, c in sims[t][:K]]
            tw = share(t, twins)
            panel = share(t, candidates(t))
            feats[t] = {'twin': tw, 'panel': panel}
            rand = [share(t, list(rng.choice(candidates(t), K, replace=False))) for _ in range(20)]
            least = share(t, [c for _, c in sims[t][-K:]])
            for nm, s in [('twin', tw), ('least', least), ('panel', panel), ('chain', A[t]['lc'])]:
                rows[nm].append((p_at_k(s, y, 10, rng), roc_auc_score(y, s)))
            rows['random'].append((float(np.mean([p_at_k(r, y, 10, rng) for r in rand])),
                                   float(np.mean([roc_auc_score(y, r) for r in rand]))))
        v = {nm: {'p10': float(np.mean([r[0] for r in rs])), 'auc': float(np.mean([r[1] for r in rs]))} for nm, rs in rows.items()}
        b0, b1 = blend_p10(feats, False), blend_p10(feats, True)
        v['blend_without_twin'] = {'p10': b0[0], 'auc': b0[1]}
        v['blend_with_twin'] = {'p10': b1[0], 'auc': b1[1]}
        if kind == 'dev' and K == 5:
            # bootstrap over sites for the headline AUC difference twin vs random
            d = np.array([rows['twin'][i][1] - rows['random'][i][1] for i in range(len(KEYS))])
            bs = [np.mean(rng.choice(d, len(d))) for _ in range(2000)]
            v['auc_twin_minus_random_ci95'] = [float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))]
            e = np.array([rows['twin'][i][1] - rows['panel'][i][1] for i in range(len(KEYS))])
            bs = [np.mean(rng.choice(e, len(e))) for _ in range(2000)]
            v['auc_twin_minus_panel_ci95'] = [float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))]
        results['variants'][f'{kind}_k{K}'] = v
        print(kind, K, {k: (round(x['p10'], 3), round(x['auc'], 3)) if isinstance(x, dict) else [round(z, 3) for z in x] for k, x in v.items()})
json.dump(results, open(ROOT + '/taste_twin_eval.json', 'w'), indent=1)
