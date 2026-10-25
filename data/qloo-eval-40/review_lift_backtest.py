"""Backtest of the shipped review-after-ranking lift policy (apps/worker/src/lib/prospecting-agent-review.ts).

Data: the only addresses with recorded live Qloo audience overlap are the three demo chips
(chi_wicker, boulder_co, sevierville_tn) x 19 recorded brands (review_lift_overlaps.json, produced by
scripts/eval/dump-review-overlaps.mjs with the shipped overlap code). Ground truth is store presence within
the adaptive radius (ground_truth.json). Ranking is the leave-one-address-out logistic blend (analyze.py M1),
restricted to the recorded brands. Presence stands in for "fit": the lift should move brands that actually
trade here into the top 5. P@8 and P@10 cannot change (lifts move a brand within the top 8).
Usage: python3 review_lift_backtest.py  (writes review_lift_backtest.json)
"""
import json
import numpy as np
from backtest_common import ROOT, build_tables, loao_m1, GT

CHIPS = {'wicker': 'chi_wicker', 'boulder': 'boulder_co', 'sevierville': 'sevierville_tn'}
SHORT, TOP = 8, 5
OV = json.load(open(ROOT + '/review_lift_overlaps.json'))
A, _ = build_tables()
P = loao_m1(A)


def valid(order, ov, frm, to):
    return to < TOP and frm > to and frm < SHORT and ov[order[frm]] > 0 and ov[order[to]] == 0


def lift(order, frm, to):
    o = list(order)
    b = o.pop(frm)
    o.insert(to, b)
    return o


def rule(order, ov):
    for to in range(1, TOP):
        if ov[order[to]] == 0:
            for frm in range(to + 1, SHORT):
                if ov[order[frm]] > 0:
                    return lift(order, frm, to), (frm, to)
            return order, None
    return order, None


def prec(order, y, k):
    return float(np.mean([y[b] for b in order[:k]]))


out = {'per_chip': {}, 'notes': __doc__.strip().splitlines()[0]}
all_valid = []
pooled = {'with_overlap': [], 'without_overlap': []}
for chip, aid in CHIPS.items():
    d = A[aid]
    idx = {b: i for i, b in enumerate(d['b'])}
    brands = [b for b in OV[chip] if b in idx]
    ov = {b: OV[chip][b]['audiences'] or 0 for b in brands}
    y = {b: int(d['y'][idx[b]]) for b in brands}
    name = {b: OV[chip][b]['name'] for b in brands}
    order = sorted(brands, key=lambda b: -P[aid][idx[b]])
    after, move = rule(order, ov)
    for b in brands:
        pooled['with_overlap' if ov[b] > 0 else 'without_overlap'].append(y[b])
    lifts = []
    for frm in range(SHORT):
        for to in range(TOP):
            if valid(order, ov, frm, to):
                o2 = lift(order, frm, to)
                lifts.append({'from': frm + 1, 'to': to + 1, 'lifted': name[order[frm]], 'displaced': name[order[to]],
                              'lifted_present': y[order[frm]], 'displaced_present': y[order[to]],
                              'dP3': prec(o2, y, 3) - prec(order, y, 3), 'dP5': prec(o2, y, 5) - prec(order, y, 5)})
    all_valid += lifts
    out['per_chip'][aid] = {
        'n_brands': len(brands),
        'present': sum(y.values()),
        'with_overlap': sum(1 for b in brands if ov[b] > 0),
        'top8_before': [f"{name[b]} ({'present' if y[b] else 'absent'}, {ov[b]} overlaps)" for b in order[:SHORT]],
        'rule_move': None if not move else f"{name[order[move[0]]]} #{move[0]+1} -> #{move[1]+1} above {name[order[move[1]]]}",
        'P3_before': prec(order, y, 3), 'P3_after': prec(after, y, 3),
        'P5_before': prec(order, y, 5), 'P5_after': prec(after, y, 5),
        'P10_before': prec(order, y, 10), 'P10_after': prec(after, y, 10),
        'valid_lifts': lifts,
    }
pc = out['per_chip'].values()
out['rule_mean'] = {k: float(np.mean([c[k] for c in pc])) for k in
                    ['P3_before', 'P3_after', 'P5_before', 'P5_after', 'P10_before', 'P10_after']}
out['any_valid_lift'] = {
    'count': len(all_valid),
    'mean_dP5': float(np.mean([l['dP5'] for l in all_valid])) if all_valid else None,
    'helpful': sum(1 for l in all_valid if l['dP5'] > 0),
    'harmful': sum(1 for l in all_valid if l['dP5'] < 0),
    'neutral': sum(1 for l in all_valid if l['dP5'] == 0),
}
out['presence_rate_by_overlap'] = {k: {'n': len(v), 'present_rate': float(np.mean(v)) if v else None} for k, v in pooled.items()}
json.dump(out, open(ROOT + '/review_lift_backtest.json', 'w'), indent=1)
for aid, c in out['per_chip'].items():
    print(aid, c['n_brands'], 'present', c['present'], 'overlap', c['with_overlap'], '|', c['rule_move'],
          '| P5', round(c['P5_before'], 2), '->', round(c['P5_after'], 2), '| P3', round(c['P3_before'], 2), '->', round(c['P3_after'], 2))
    print('   ', c['top8_before'])
print('rule mean', {k: round(v, 3) for k, v in out['rule_mean'].items()})
print('any valid lift', out['any_valid_lift'])
print('presence by overlap', out['presence_rate_by_overlap'])
