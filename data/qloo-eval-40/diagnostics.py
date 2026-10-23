"""Extra diagnostics (adaptive radius): per-address table w/ brand-bootstrap CIs, within-tier ranking sim,
top Qloo brands, near-miss check. Run after analyze.py adaptive."""
import json, os, numpy as np, warnings
from sklearn.metrics import roc_auc_score
warnings.filterwarnings('ignore')
ROOT=os.path.dirname(os.path.abspath(__file__)); rng=np.random.default_rng(7)
GT=json.load(open(ROOT+'/ground_truth.json')); INS=json.load(open(ROOT+'/insights_affinity.json'))
GEO={g['id']:g for g in json.load(open(ROOT+'/geocoded.json'))}; RES=json.load(open(ROOT+'/results_adaptive.json'))
CNT=GT['national_count']; NM=GT['names']; ALL=sorted(CNT)
qcuts=np.quantile([np.log1p(CNT[b]) for b in ALL],[.2,.4,.6,.8])
st=lambda b:int(np.searchsorted(qcuts,np.log1p(CNT[b]),side='right'))
out={'per_address':{},'within_tier':{},'top_brands':[],'near_miss':{}}
def sauc(s,y,t):
    num=den=0
    for k in np.unique(t):
        m=t==k; yy=y[m]; w=yy.sum()*(len(yy)-yy.sum())
        if w>0: num+=roc_auc_score(yy,s[m])*w; den+=w
    return num/den if den else np.nan
tier_res={s:{'qloo':[],'chain':[],'random':[]} for s in range(5)}
agg_brand={}
nm_rows=[]
for a in GEO:
    ga=GT['addresses'][a]; r=ga['radius_km']
    bs=[b for b in INS[a] if b in CNT and INS[a][b]['affinity'] is not None]
    aff=np.array([INS[a][b]['affinity'] for b in bs]); lc=np.log1p([CNT[b] for b in bs])
    near=np.array([ga['brands'][b]['nearest_km'] for b in bs]); y=(near<=r).astype(int); t=np.array([st(b) for b in bs])
    bs_s=[]
    for _ in range(1000):
        i=rng.integers(0,len(y),len(y)); bs_s.append(sauc(aff[i],y[i],t[i]))
    R=RES['per_address'][a]
    out['per_address'][a]={'cat':GEO[a]['cat'],'tier':ga['tier'],'r_km':r,'n':len(y),'pos':int(y.sum()),
      'qloo_p10':R['qloo']['p10'],'chain_p10':R['chain']['p10'],'logit_p10':R['logit_blend']['p10'],'app_blend_p10':R['app_blend']['p10'],
      'qloo_auc':R['qloo']['auc'],'chain_auc':R['chain']['auc'],'logit_auc':R['logit_blend']['auc'],
      'strat_auc':R['strat_auc_qloo'],'strat_auc_ci':[float(np.nanpercentile(bs_s,2.5)),float(np.nanpercentile(bs_s,97.5))]}
    # within-tier: P@5 within each chain-size quintile
    for s in range(5):
        m=t==s
        if m.sum()<10: continue
        yy=y[m]
        oq=np.lexsort((rng.random(m.sum()),-aff[m]))[:5]; oc=np.lexsort((rng.random(m.sum()),-lc[m]))[:5]
        tier_res[s]['qloo'].append(yy[oq].mean()); tier_res[s]['chain'].append(yy[oc].mean()); tier_res[s]['random'].append(yy.mean())
    z=(aff-aff.mean())/aff.std()
    for b,zz,yy in zip(bs,z,y): agg_brand.setdefault(b,[]).append((zz,yy))
    # near-miss: absent brands; is residual Qloo higher for those with a store in (r, 3r]?
    res_q=z-np.polyval(np.polyfit(lc,z,1),lc)
    for i in np.where(y==0)[0]: nm_rows.append((res_q[i], 1 if near[i]<=3*r else 0, a))
for s in range(5):
    d=tier_res[s]; 
    def ci(v):
        v=np.array(v); b=[rng.choice(v,len(v)).mean() for _ in range(2000)]; return [float(v.mean()),float(np.percentile(b,2.5)),float(np.percentile(b,97.5))]
    diff=np.array(d['qloo'])-np.array(d['chain'])
    out['within_tier'][s]={'count_range':[int(min(CNT[b] for b in ALL if st(b)==s)),int(max(CNT[b] for b in ALL if st(b)==s))],
       'n_addr':len(d['qloo']),'qloo_p5':ci(d['qloo']),'chain_p5':ci(d['chain']),'random_p5':ci(d['random']),'qloo_minus_chain':ci(diff)}
for b,v in agg_brand.items():
    zs=np.array([x[0] for x in v]); ys=np.array([x[1] for x in v])
    out['top_brands'].append({'brand':NM[b],'count':CNT[b],'mean_z':float(zs.mean()),'sd_z':float(zs.std()),'pres_rate':float(ys.mean())})
out['top_brands'].sort(key=lambda x:-x['mean_z'])
nm=np.array([(x[0],x[1]) for x in nm_rows])
out['near_miss']={'n_absent':len(nm),'auc_resid_qloo_for_store_within_3r':float(roc_auc_score(nm[:,1],nm[:,0])),
   'rate_store_within_3r_top_resid_quartile':float(nm[nm[:,0]>=np.quantile(nm[:,0],.75),1].mean()),
   'rate_store_within_3r_bottom_resid_quartile':float(nm[nm[:,0]<=np.quantile(nm[:,0],.25),1].mean())}
bsnm=[]
for _ in range(1000):
    ks=rng.choice(list(GEO),len(GEO)); rows=np.array([(x[0],x[1]) for k in ks for x in nm_rows if x[2]==k])
    bsnm.append(roc_auc_score(rows[:,1],rows[:,0]))
out['near_miss']['auc_ci']=[float(np.percentile(bsnm,2.5)),float(np.percentile(bsnm,97.5))]
json.dump(out,open(ROOT+'/diagnostics_adaptive.json','w'),indent=1)
pa=out['per_address']
print('%-17s %-17s %-8s %4s %4s %5s %5s %5s %5s  %s'%('addr','cat','tier','n','pos','qP10','cP10','bP10','sAUC','CI'))
for a,v in sorted(pa.items(),key=lambda kv:-kv[1]['strat_auc']):
    print('%-17s %-17s %-8s %4d %4d %5.2f %5.2f %5.2f %5.3f  [%.2f,%.2f]'%(a,v['cat'],v['tier'],v['n'],v['pos'],v['qloo_p10'],v['chain_p10'],v['logit_p10'],v['strat_auc'],*v['strat_auc_ci']))
print(json.dumps(out['within_tier'],indent=0)); print(out['near_miss'])
for x in out['top_brands'][:15]: print('TOP',x)
for x in out['top_brands'][-8:]: print('BOT',x)
