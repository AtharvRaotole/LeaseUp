"""Render result JSON into markdown tables (tables.md) so the write-up never hand-copies numbers."""
import json, os
ROOT=os.path.dirname(os.path.abspath(__file__))
f=lambda v,p=2:f"{v[0]:.{p}f} [{v[1]:.{p}f}, {v[2]:.{p}f}]"
out=[]
R={m:json.load(open(f'{ROOT}/results_{m}.json')) for m in ['adaptive','fixed10','fixed5']}
out.append('### T1. Headline rankers (mean over 40 addresses, 95% bootstrap CI over addresses)\n')
for m,r in R.items():
    a=r['agg']; out.append(f'\n**Radius = {m}**\n\n| Ranker | P@10 | P@20 | ROC AUC | Spearman rho |\n|---|---|---|---|---|')
    for nm,lab in [('qloo','(a) Qloo affinity (app)'),('chain','(b) National chain size'),('random','(c) Random (1000 shuffles)'),('app_blend','(d1) App blend 0.75 Qloo-rank + 0.25 count/max'),('logit_blend','(d2) Logistic blend log(chain)+Qloo, leave-one-address-out')]:
        out.append(f"| {lab} | {f(a[nm+'.p10'])} | {f(a[nm+'.p20'])} | {f(a[nm+'.auc'])} | {f(a[nm+'.rho'])} |")
    out.append(f"| Δ (a) − (b) | {f(a['diff_qloo_minus_chain.p10'])} | {f(a['diff_qloo_minus_chain.p20'])} | {f(a['diff_qloo_minus_chain.auc'])} | {f(a['diff_qloo_minus_chain.rho'])} |")
    out.append(f"| Δ (d2) − (b) | {f(a['diff_logit_blend_minus_chain.p10'])} | {f(a['diff_logit_blend_minus_chain.p20'])} | {f(a['diff_logit_blend_minus_chain.auc'])} | {f(a['diff_logit_blend_minus_chain.rho'])} |")
    out.append(f"| Δ (d1) − (b) | {f(a['diff_app_blend_minus_chain.p10'])} | {f(a['diff_app_blend_minus_chain.p20'])} | {f(a['diff_app_blend_minus_chain.auc'])} | {f(a['diff_app_blend_minus_chain.rho'])} |")
out.append('\n### T2. Lift after controlling for chain size (key metric)\n\n| Metric | adaptive | fixed 10 km | fixed 5 km |\n|---|---|---|---|')
rowsdef=[('Stratified AUC of Qloo within chain-size quintiles (pooled; 0.5 = no lift)','strat_auc_qloo_pooled',3),
 ('Stratified AUC (mean of per-address)','strat_auc_qloo_mean',3),('Partial Spearman Qloo~presence | log chain size','partial_rho',3),
 ('Spearman Qloo vs log chain size (confound check)','rho_qloo_chain',3),
 ('Held-out log-loss/obs, M0 chain+density','ll_per_obs_M0',3),('Held-out log-loss/obs, M1 = M0 + Qloo','ll_per_obs_M1',3),
 ('Log-loss improvement M1 vs M0 (%)','ll_improve_pct_M1_vs_M0',1),('Per-address AUC M0 (= chain order)','auc_M0',3),('Per-address AUC M1','auc_M1',3),('AUC gain M1 − M0','auc_diff_M1_vs_M0',3),
 ('Brand-FE model: AUC FE0 (brand propensity + density)','auc_FE0',3),('AUC FE1 = FE0 + Qloo local deviation','auc_FE1',3),('AUC gain FE1 − FE0','auc_diff_FE1_vs_FE0',3),('Log-loss improvement FE1 vs FE0 (%)','ll_improve_pct_FE1_vs_FE0',1)]
for lab,k,p in rowsdef: out.append(f"| {lab} | "+' | '.join(f(R[m]['agg'][k],p) for m in R)+' |')
out.append('\n### T3. Within chain-size stratum (adaptive radius, pooled over addresses)\n\n| Stratum | national store count | presence rate | within-stratum AUC of Qloo |\n|---|---|---|---|')
for s,v in R['adaptive']['by_stratum'].items(): out.append(f"| Q{int(s)+1} | {v['count_range'][0]}–{v['count_range'][1]} | {v['pos_rate']:.2f} | {v['pooled_within_stratum_auc']:.3f} |")
D=json.load(open(f'{ROOT}/diagnostics_adaptive.json'))
out.append('\n### T4. "Rank within a chain-size tier": P@5 inside each tier (adaptive radius, mean over 40 addresses)\n\n| Tier (store count) | Qloo order P@5 | Chain-size order P@5 | Random P@5 | Qloo − chain |\n|---|---|---|---|---|')
for s,v in D['within_tier'].items(): out.append(f"| Q{int(s)+1} ({v['count_range'][0]}–{v['count_range'][1]}) | {f(v['qloo_p5'])} | {f(v['chain_p5'])} | {f(v['random_p5'])} | {f(v['qloo_minus_chain'])} |")
out.append('\n### T5. By address category (adaptive radius; CI over addresses within category)\n\n| Category | n | Qloo P@10 | Chain P@10 | Qloo AUC | Chain AUC | Logistic blend AUC | Stratified AUC (Qloo) | Partial rho |\n|---|---|---|---|---|---|---|---|---|')
for c,v in R['adaptive']['by_cat'].items(): out.append(f"| {c} | {v['n']} | {f(v['qloo.p10'])} | {f(v['chain.p10'])} | {f(v['qloo.auc'])} | {f(v['chain.auc'])} | {f(v['logit_blend.auc'])} | {f(v['strat_auc_qloo'])} | {f(v['partial_rho'])} |")
out.append('\n### T6. Per address (adaptive radius), sorted by stratified AUC; CI = bootstrap over brands\n\n| Address | Category | Tier / r | Brands | Present | Qloo P@10 | Chain P@10 | Blend P@10 | Stratified AUC [95% CI] | Percentile |\n|---|---|---|---|---|---|---|---|---|---|')
pa=sorted(D['per_address'].items(),key=lambda kv:-kv[1]['strat_auc']); n=len(pa)
for i,(a,v) in enumerate(pa):
    pct=100*(n-1-i)/(n-1)
    out.append(f"| {a} | {v['cat']} | {v['tier']} / {v['r_km']} km | {v['n']} | {v['pos']} | {v['qloo_p10']:.1f} | {v['chain_p10']:.1f} | {v['logit_p10']:.1f} | {v['strat_auc']:.3f} [{v['strat_auc_ci'][0]:.2f}, {v['strat_auc_ci'][1]:.2f}] | {pct:.0f} |")
nm=D['near_miss']
out.append(f"\n### T7. Exploratory near-miss check (NOT the requested openings holdout)\n\nAmong {nm['n_absent']} absent (address, brand) pairs, AUC of chain-size-residualised Qloo for 'has a store within 3x the radius' = {nm['auc_resid_qloo_for_store_within_3r']:.3f} [{nm['auc_ci'][0]:.3f}, {nm['auc_ci'][1]:.3f}]; top residual quartile {100*nm['rate_store_within_3r_top_resid_quartile']:.0f}% vs bottom quartile {100*nm['rate_store_within_3r_bottom_resid_quartile']:.0f}%.\n")
out.append('\n### T8. Most / least Qloo-favoured brands (mean within-address z of affinity, adaptive presence rate)\n\n| Brand | ATP US count | mean z | presence rate |\n|---|---|---|---|')
for x in D['top_brands'][:12]+D['top_brands'][-6:]: out.append(f"| {x['brand']} | {x['count']} | {x['mean_z']:.2f} | {x['pres_rate']:.2f} |")
if os.path.exists(f'{ROOT}/results_heatmap.json'):
    H=json.load(open(f'{ROOT}/results_heatmap.json')); h=H['agg']
    out.append(f"\n### T9. Heatmap vs insights, {len(H['addresses'])}-address subset (adaptive radius)\n\nSubset: {', '.join(H['addresses'])}\n\n| Signal (alone) | P@10 | AUC | Stratified AUC | Partial rho |\n|---|---|---|---|---|")
    for s,lab in [('ins','Insights affinity (app)'),('hm','Heatmap affinity, nearest cell'),('hmr','Heatmap affinity_rank, nearest cell'),('hm15','Heatmap affinity, mean of cells within 1.5 km')]:
        v=h[s]; out.append(f"| {lab} | {f(v['p10'])} | {f(v['auc'],3)} | {f(v['strat_auc'],3)} | {f(v['partial_rho'],3)} |")
    out.append('\n| Logistic model (leave-one-address-out) | P@10 | per-address AUC | held-out log-loss/obs |\n|---|---|---|---|')
    for m in ['chain','chain+ins','chain+hm','chain+hmr','chain+ins+hm','chain+ins+hmr']:
        v=h[m]; out.append(f"| {m} | {f(v['p10'])} | {f(v['auc'],3)} | {f(v['ll_per_obs'],3)} |")
    out.append('\n| Comparison | value [95% CI] |\n|---|---|')
    for k in [k for k in h if k.startswith(('auc_gain','ll_gain','strat_auc_h'))]: out.append(f"| {k} | {f(h[k],3)} |")
    out.append(f"| mean Spearman(insights, heatmap) per address | {h['rho_ins_hm']:.2f} |")
open(f'{ROOT}/tables.md','w').write('\n'.join(out)); print('\n'.join(out))
