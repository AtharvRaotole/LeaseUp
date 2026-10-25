"""Fit the taste twin ranking the worker ships (apps/worker/src/lib/twin-rank-coefficients.json).

Model: the production M1 logistic (log chain size, site context, Qloo affinity z) plus twinShare, the share of
the site's 5 consistent taste twins (data/qloo-eval-40/twin_rank_eval.py) with a store inside their adaptive
radius. Fit on all 40 panel sites, each site twice: its top 50 brands by affinity (the live prospecting pool)
and all scored brands (the analyze pool). Site context features are constant inside a site, so only the
per brand coefficients change the order; those are what the worker uses.
Also writes a parity fixture for the worker tests. Usage:
/workspace/venv-eval/bin/python scripts/eval/build-twin-rank-coefficients.py
"""
import json, os, sys
import numpy as np
from sklearn.linear_model import LogisticRegression
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../../data/qloo-eval-40'))
import twin_rank_eval as E

NAMES = ['logChainSize', 'logRadiusKm', 'logDensity3km', 'tierUrban', 'tierSuburban', 'qlooAffinityZ', 'twinShare']
Xs, ys = [], []
for si in range(E.NS):
    panel = [c for c in range(E.NS) if c != si]
    for n in (50, None):
        cols = E.pool(si, n)
        m1, share, _rate, _tw = E.features(si, cols, panel)
        Xs.append(np.hstack([m1, share[:, None]]))
        ys.append(E.Y[si, cols])
X = np.vstack(Xs); y = np.concatenate(ys)
mu, sd = X.mean(0), X.std(0) + 1e-9
m = LogisticRegression(C=1e4, max_iter=5000).fit((X - mu) / sd, y)
coef = dict(zip(NAMES, m.coef_[0].tolist()))
keep = ['logChainSize', 'qlooAffinityZ', 'twinShare']
out = {
    'source': 'scripts/eval/build-twin-rank-coefficients.py; eval data/qloo-eval-40/TWIN_RANK_EVAL.md',
    'k': E.K, 'excludeKm': E.EXCLUDE_KM, 'minCommonBrands': E.MIN_COMMON, 'rows': int(len(y)),
    'features': keep,
    'coefficients': {k: round(coef[k], 6) for k in keep},
    'mean': {k: round(float(mu[NAMES.index(k)]), 6) for k in keep},
    'std': {k: round(float(sd[NAMES.index(k)]), 6) for k in keep},
    'fullModel': {'intercept': round(float(m.intercept_[0]), 6), 'coefficients': {k: round(v, 6) for k, v in coef.items()}},
}
p = os.path.join(HERE, '../../apps/worker/src/lib/twin-rank-coefficients.json')
json.dump(out, open(p, 'w'), indent=2)
print(json.dumps(out, indent=2))

# Parity fixture: consistent twins for three sites on their top 50 pool, panel without the site.
par = {}
for sid in ('nyc_williamsburg', 'boulder_co', 'sevierville_tn'):
    si = E.KEYS.index(sid)
    cols = E.pool(si, 50)
    panel = [c for c in range(E.NS) if c != si]
    par[sid] = {'pool': [E.BR[c] for c in cols], 'twins': [E.KEYS[c] for c in E.twins(si, cols, panel)]}
fp = os.path.join(HERE, '../../apps/worker/src/__tests__/fixtures/twin-rank-parity.json')
os.makedirs(os.path.dirname(fp), exist_ok=True)
json.dump(par, open(fp, 'w'), indent=1)
print({k: v['twins'] for k, v in par.items()})
