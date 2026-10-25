"""Shared panel tables for the review-lift backtest and the taste-twin eval (same construction as analyze.py, adaptive radius)."""
import json, math, os
import numpy as np
from sklearn.linear_model import LogisticRegression

ROOT = os.path.dirname(os.path.abspath(__file__))
GT = json.load(open(ROOT + '/ground_truth.json'))
INS = json.load(open(ROOT + '/insights_affinity.json'))
GEO = {g['id']: g for g in json.load(open(ROOT + '/geocoded.json'))}
CNT = GT['national_count']


def km(a, b):
    p = math.pi / 180
    la1, lo1, la2, lo2 = a['lat'] * p, a['lon'] * p, b['lat'] * p, b['lon'] * p
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def build_tables():
    A = {}
    for a in GEO:
        ga = GT['addresses'][a]
        r = ga['radius_km']
        bs = [b for b in INS[a] if b in CNT and INS[a][b]['affinity'] is not None]
        aff = np.array([INS[a][b]['affinity'] for b in bs])
        A[a] = dict(
            b=bs,
            aff=aff,
            lc=np.array([np.log1p(CNT[b]) for b in bs]),
            y=np.array([1 if ga['brands'][b]['nearest_km'] <= r else 0 for b in bs]),
            tier=ga['tier'],
            r=r,
            dens=ga['density_3km'],
        )
        A[a]['z'] = (aff - aff.mean()) / (aff.std() + 1e-12)
    bm = {}
    for d in A.values():
        for b, z in zip(d['b'], d['z']):
            bm.setdefault(b, []).append(z)
    bm = {b: float(np.mean(v)) for b, v in bm.items()}
    for d in A.values():
        d['dev'] = d['z'] - np.array([bm[b] for b in d['b']])
    return A, bm


def design_m1(d):
    n = len(d['y'])
    tier = [1.0 if d['tier'] == t else 0.0 for t in ('urban', 'suburban')]
    cols = [d['lc'], np.full(n, np.log(d['r'])), np.full(n, np.log1p(d['dens']))] + [np.full(n, t) for t in tier]
    cols.append(d['z'])
    return np.column_stack(cols)


def loao_m1(A, extra=None):
    """Leave-one-address-out logistic blend (chain size + context + Qloo z), the shipped ranking family."""
    keys = list(A)
    preds = {}
    for t in keys:
        def X(a):
            base = design_m1(A[a])
            return np.column_stack([base] + [A[a][e] for e in (extra or [])]) if extra else base
        Xa = np.vstack([X(a) for a in keys if a != t])
        ya = np.concatenate([A[a]['y'] for a in keys if a != t])
        mu, sd = Xa.mean(0), Xa.std(0) + 1e-9
        m = LogisticRegression(C=1e4, max_iter=5000).fit((Xa - mu) / sd, ya)
        preds[t] = m.predict_proba((X(t) - mu) / sd)[:, 1]
    return preds


def p_at_k(score, y, k, rng, reps=50):
    v = []
    for _ in range(reps):
        o = np.lexsort((rng.random(len(score)), -score))
        v.append(y[o[:k]].mean())
    return float(np.mean(v))
