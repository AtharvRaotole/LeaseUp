"""Backtest: review lift on taste-twin evidence (pre-set thresholds: lifted twin share >= 3/5,
displaced twin share 0/5, displaced in top 5 at rank > 1, lifted from the top 8 below it, max 2 lifts).
Ranking = leave-one-address-out blend without twin (M1 + panel rate). Twins K=5, dev vectors, 50 km exclusion."""
import json, sys
import numpy as np
sys.path.insert(0, '.')
from sklearn.linear_model import LogisticRegression
from backtest_common import ROOT, GEO, build_tables, design_m1, km

A, BM = build_tables(); KEYS = list(A); K = 5; EX = 50
def vec(a): return dict(zip(A[a]['b'], A[a]['dev']))
def sim(a, c):
    va, vc = vec(a), vec(c); com = [b for b in va if b in vc]
    return float(np.corrcoef([va[b] for b in com], [vc[b] for b in com])[0, 1])
def cands(t): return [c for c in KEYS if c != t and km(GEO[t], GEO[c]) > EX]
def pres(c, b):
    d = A[c]; return int(d['y'][d['b'].index(b)]) if b in d['b'] else 0
def share(t, picks): return np.array([sum(pres(c, b) for c in picks) for b in A[t]['b']])
twin = {}; panel = {}
for t in KEYS:
    s = sorted(((sim(t, c), c) for c in cands(t)), reverse=True)
    twin[t] = share(t, [c for _, c in s[:K]])
    cc = cands(t); panel[t] = share(t, cc) / len(cc)
def X(a): return np.hstack([design_m1(A[a]), panel[a][:, None]])
score = {}
for t in KEYS:
    Xa = np.vstack([X(a) for a in KEYS if a != t]); ya = np.concatenate([A[a]['y'] for a in KEYS if a != t])
    mu, sd = Xa.mean(0), Xa.std(0) + 1e-9
    m = LogisticRegression(C=1e4, max_iter=5000).fit((Xa - mu) / sd, ya)
    score[t] = m.predict_proba((X(t) - mu) / sd)[:, 1]

def run(lift_min, disp_max):
    rows = []; lifts = []
    for t in KEYS:
        y = A[t]['y']; order = list(np.argsort(-score[t], kind='stable')); before = order[:]
        n = 0
        while n < 2:
            top5 = order[:5]
            disp = next((i for i in top5[1:] if twin[t][i] <= disp_max), None)
            if disp is None: break
            dpos = order.index(disp)
            cand = next((i for i in order[dpos + 1:8] if twin[t][i] >= lift_min), None)
            if cand is None:
                # try next displaced candidate in top 5
                ok = False
                for d2 in [i for i in top5[1:] if twin[t][i] <= disp_max and i != disp]:
                    p2 = order.index(d2); c2 = next((i for i in order[p2 + 1:8] if twin[t][i] >= lift_min), None)
                    if c2 is not None: disp, dpos, cand, ok = d2, p2, c2, True; break
                if not ok: break
            order.remove(cand); order.insert(dpos, cand); n += 1
            lifts.append((t, int(y[cand]), int(y[disp])))
        pk = lambda o, k: float(y[o[:k]].mean())
        rows.append([pk(before, 3), pk(order, 3), pk(before, 5), pk(order, 5), pk(before, 10), pk(order, 10)])
    r = np.array(rows); rng = np.random.default_rng(20261025)
    def ci(d):
        bs = [np.mean(rng.choice(d, len(d))) for _ in range(4000)]
        return [round(float(np.percentile(bs, 2.5)), 4), round(float(np.percentile(bs, 97.5)), 4)]
    d3, d5 = r[:, 1] - r[:, 0], r[:, 3] - r[:, 2]
    return {
        'lift_min': lift_min, 'displaced_max': disp_max, 'sites': len(KEYS),
        'sites_with_lift': len({l[0] for l in lifts}), 'lifts': len(lifts),
        'lift_outcomes': {'lifted_present_displaced_absent': sum(1 for l in lifts if l[1] == 1 and l[2] == 0),
                          'lifted_absent_displaced_present': sum(1 for l in lifts if l[1] == 0 and l[2] == 1),
                          'same': sum(1 for l in lifts if l[1] == l[2])},
        'p3': [round(float(r[:, 0].mean()), 4), round(float(r[:, 1].mean()), 4)], 'p3_delta_ci95': ci(d3),
        'p5': [round(float(r[:, 2].mean()), 4), round(float(r[:, 3].mean()), 4)], 'p5_delta_ci95': ci(d5),
        'p10': [round(float(r[:, 4].mean()), 4), round(float(r[:, 5].mean()), 4)],
    }
out = {'preset': run(3, 0), 'sensitivity': [run(2, 0), run(4, 0), run(3, 1)]}
print(json.dumps(out, indent=1))
