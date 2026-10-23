"""Head-to-head: insights affinity vs heatmap (urn:heatmap) on the 12-address subset, adaptive radius."""
import json, os, numpy as np, warnings
from scipy.stats import spearmanr, rankdata
from sklearn.metrics import roc_auc_score, log_loss
from sklearn.linear_model import LogisticRegression
warnings.filterwarnings('ignore')
ROOT=os.path.dirname(os.path.abspath(__file__)); rng=np.random.default_rng(11)
GT=json.load(open(ROOT+'/ground_truth.json')); INS=json.load(open(ROOT+'/insights_affinity.json')); HM=json.load(open(ROOT+'/heatmap_features.json'))
CNT=GT['national_count']; ALL=sorted(CNT)
qcuts=np.quantile([np.log1p(CNT[b]) for b in ALL],[.2,.4,.6,.8]); st=lambda b:int(np.searchsorted(qcuts,np.log1p(CNT[b]),side='right'))
keys=[a for a in HM if len(HM[a])>=len([b for b in CNT])-5]
A={}
for a in keys:
    ga=GT['addresses'][a]; r=ga['radius_km']
    bs=[b for b in INS[a] if b in CNT and INS[a][b]['affinity'] is not None and b in HM[a]]
    g=lambda b,k: (HM[a][b].get(k) if HM[a][b].get(k) is not None else 0.0)  # no cells -> 0 (lowest)
    A[a]=dict(y=np.array([int(ga['brands'][b]['nearest_km']<=r) for b in bs]),lc=np.log1p([CNT[b] for b in bs]),
        ins=np.array([INS[a][b]['affinity'] for b in bs]),hm=np.array([g(b,'affinity') for b in bs]),
        hmr=np.array([g(b,'affinity_rank') for b in bs]),hm15=np.array([HM[a][b].get('mean_aff_1p5km') or 0.0 for b in bs]),
        t=np.array([st(b) for b in bs]),nocell=int(sum(1 for b in bs if not HM[a][b].get('n_cells'))))
SIG=['ins','hm','hmr','hm15']
def pk(s,y,k=10): return np.mean([y[np.lexsort((rng.random(len(s)),-s))[:k]].mean() for _ in range(50)])
def sauc(s,y,t):
    num=den=0
    for k in np.unique(t):
        m=t==k; yy=y[m]; w=yy.sum()*(len(yy)-yy.sum())
        if w>0: num+=roc_auc_score(yy,s[m])*w; den+=w
    return num,den
def pr(x,y,z):
    rx,ry,rz=rankdata(x),rankdata(y),rankdata(z); ex=rx-np.polyval(np.polyfit(rz,rx,1),rz); ey=ry-np.polyval(np.polyfit(rz,ry,1),rz); return np.corrcoef(ex,ey)[0,1]
zs=lambda v:(v-v.mean())/(v.std()+1e-12)
def loao(feats):
    out={}
    for t in keys:
        X=np.vstack([np.column_stack([A[a]['lc']]+[zs(A[a][f]) for f in feats]) for a in keys if a!=t]); y=np.concatenate([A[a]['y'] for a in keys if a!=t])
        m=LogisticRegression(C=1e4,max_iter=5000).fit(X,y)
        out[t]=m.predict_proba(np.column_stack([A[t]['lc']]+[zs(A[t][f]) for f in feats]))[:,1]
    return out
MODELS={'chain':[],'chain+ins':['ins'],'chain+hm':['hm'],'chain+hmr':['hmr'],'chain+ins+hm':['ins','hm'],'chain+ins+hmr':['ins','hmr']}
PRED={m:loao(f) for m,f in MODELS.items()}
per={}
for a in keys:
    d=A[a]; R={}
    for s in SIG:
        n,dn=sauc(d[s],d['y'],d['t'])
        R[s]={'p10':pk(d[s],d['y']),'auc':roc_auc_score(d['y'],d[s]),'sa_num':n,'sa_den':dn,'prho':pr(d[s],d['y'],d['lc'])}
    for m in PRED:
        p=np.clip(PRED[m][a],1e-6,1-1e-6); R[m]={'auc':roc_auc_score(d['y'],p),'ll':log_loss(d['y'],p,labels=[0,1])*len(p),'p10':pk(p,d['y'])}
    R['rho_ins_hm']=spearmanr(d['ins'],d['hm']).correlation; R['nocell']=d['nocell']; R['n']=len(d['y'])
    per[a]=R
def boot(fn,B=2000):
    v=fn(keys); b=[fn(list(rng.choice(keys,len(keys)))) for _ in range(B)]; return [float(v),float(np.percentile(b,2.5)),float(np.percentile(b,97.5))]
res={'addresses':keys,'per_address':per,'agg':{}}
for s in SIG:
    res['agg'][s]={'p10':boot(lambda ks:np.mean([per[k][s]['p10'] for k in ks])),'auc':boot(lambda ks:np.mean([per[k][s]['auc'] for k in ks])),
      'strat_auc':boot(lambda ks:sum(per[k][s]['sa_num'] for k in ks)/sum(per[k][s]['sa_den'] for k in ks)),'partial_rho':boot(lambda ks:np.mean([per[k][s]['prho'] for k in ks]))}
for m in PRED:
    res['agg'][m]={'auc':boot(lambda ks:np.mean([per[k][m]['auc'] for k in ks])),'p10':boot(lambda ks:np.mean([per[k][m]['p10'] for k in ks])),
      'll_per_obs':boot(lambda ks:sum(per[k][m]['ll'] for k in ks)/sum(per[k]['n'] for k in ks))}
for m in ['chain+ins','chain+hm','chain+hmr','chain+ins+hm','chain+ins+hmr']:
    res['agg'][f'auc_gain_{m}_vs_chain']=boot(lambda ks:np.mean([per[k][m]['auc']-per[k]['chain']['auc'] for k in ks]))
res['agg']['auc_gain_ins+hm_vs_ins']=boot(lambda ks:np.mean([per[k]['chain+ins+hm']['auc']-per[k]['chain+ins']['auc'] for k in ks]))
res['agg']['auc_gain_ins+hmr_vs_ins']=boot(lambda ks:np.mean([per[k]['chain+ins+hmr']['auc']-per[k]['chain+ins']['auc'] for k in ks]))
res['agg']['ll_gain_pct_ins+hmr_vs_ins']=boot(lambda ks:100*(sum(per[k]['chain+ins']['ll'] for k in ks)-sum(per[k]['chain+ins+hmr']['ll'] for k in ks))/sum(per[k]['chain+ins']['ll'] for k in ks))
res['agg']['strat_auc_hmr_minus_ins']=boot(lambda ks:sum(per[k]['hmr']['sa_num'] for k in ks)/sum(per[k]['hmr']['sa_den'] for k in ks)-sum(per[k]['ins']['sa_num'] for k in ks)/sum(per[k]['ins']['sa_den'] for k in ks))
res['agg']['strat_auc_hm_minus_ins']=boot(lambda ks:sum(per[k]['hm']['sa_num'] for k in ks)/sum(per[k]['hm']['sa_den'] for k in ks)-sum(per[k]['ins']['sa_num'] for k in ks)/sum(per[k]['ins']['sa_den'] for k in ks))
res['agg']['rho_ins_hm']=float(np.mean([per[k]['rho_ins_hm'] for k in keys]))
json.dump(res,open(ROOT+'/results_heatmap.json','w'),indent=1,default=float)
for k,v in res['agg'].items(): print(k, json.dumps(v,default=lambda x:round(float(x),3)))
for a in keys: print(a,{s:round(per[a][s]['auc'],3) for s in SIG},'nocell',per[a]['nocell'],'rho',round(per[a]['rho_ins_hm'],2))
