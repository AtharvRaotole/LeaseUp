"""Compute pre-registered metrics (see PREREGISTRATION.md). Usage: analyze.py [adaptive|fixed10|fixed5]"""
import json, os, sys, numpy as np, warnings
from scipy.stats import spearmanr, rankdata
from sklearn.metrics import roc_auc_score, log_loss
from sklearn.linear_model import LogisticRegression
warnings.filterwarnings('ignore')
ROOT=os.path.dirname(os.path.abspath(__file__)); MODE=sys.argv[1] if len(sys.argv)>1 else 'adaptive'
rng=np.random.default_rng(20261023)
GT=json.load(open(ROOT+'/ground_truth.json')); INS=json.load(open(ROOT+'/insights_affinity.json'))
GEO={g['id']:g for g in json.load(open(ROOT+'/geocoded.json'))}
CNT=GT['national_count']; ALL=sorted(CNT)
# global chain-size quintiles over the 227 tracked brands
qcuts=np.quantile([np.log1p(CNT[b]) for b in ALL],[.2,.4,.6,.8])
def stratum(b): return int(np.searchsorted(qcuts,np.log1p(CNT[b]),side='right'))
def radius(a): return {'adaptive':GT['addresses'][a]['radius_km'],'fixed10':10,'fixed5':5}[MODE]
# ---------- build per-address tables
A={}
for a in GEO:
    ga=GT['addresses'][a]; r=radius(a)
    bs=[b for b in INS[a] if b in CNT and INS[a][b]['affinity'] is not None]
    aff=np.array([INS[a][b]['affinity'] for b in bs]); lc=np.array([np.log1p(CNT[b]) for b in bs])
    y=np.array([1 if ga['brands'][b]['nearest_km']<=r else 0 for b in bs])
    A[a]=dict(b=bs,aff=aff,lc=lc,y=y,strat=np.array([stratum(b) for b in bs]),cat=GEO[a]['cat'],tier=ga['tier'],r=r,dens=ga['density_3km'])
# brand mean Qloo z across addresses (for 'local deviation')
for a,d in A.items(): d['z']=(d['aff']-d['aff'].mean())/(d['aff'].std()+1e-12)
bm={}
for a,d in A.items():
    for b,z in zip(d['b'],d['z']): bm.setdefault(b,[]).append(z)
bm={b:np.mean(v) for b,v in bm.items()}
for a,d in A.items(): d['dev']=d['z']-np.array([bm[b] for b in d['b']])
def app_blend(d):
    order=np.argsort(-d['aff'],kind='stable'); n=len(order); s=np.zeros(n)
    s[order]=1-np.arange(n)/(n-1); cnt=np.expm1(d['lc'])
    return 0.75*s+0.25*cnt/cnt.max()
def p_at_k(score,y,k,reps=50):
    # expected precision@k with random tie-breaking
    v=[]
    for _ in range(reps):
        o=np.lexsort((rng.random(len(score)),-score)); v.append(y[o[:k]].mean())
    return float(np.mean(v))
def auc(s,y): return roc_auc_score(y,s) if 0<y.sum()<len(y) else np.nan
def strat_auc(s,y,st):
    num=den=0.0
    for k in np.unique(st):
        m=st==k; yy=y[m]; npn=yy.sum()*(len(yy)-yy.sum())
        if npn>0: num+=roc_auc_score(yy,s[m])*npn; den+=npn
    return num/den if den else np.nan, num, den
def partial_spear(x,y,z):
    rx,ry,rz=rankdata(x),rankdata(y),rankdata(z)
    ex=rx-np.polyval(np.polyfit(rz,rx,1),rz); ey=ry-np.polyval(np.polyfit(rz,ry,1),rz)
    return float(np.corrcoef(ex,ey)[0,1])
# ---------- LOAO logistic models
def design(d,which):
    n=len(d['y']); tier=[1.0 if d['tier']==t else 0.0 for t in ('urban','suburban')]
    base=[d['lc'],np.full(n,np.log(d['r'])),np.full(n,np.log1p(d['dens']))]+[np.full(n,t) for t in tier]
    if which=='M1': base.append(d['z'])
    if which=='M1i': base+= [d['z'],d['z']*d['lc']]
    return np.column_stack(base)
keys=list(A)
def loao(which,brandfe=False,extra=None):
    preds={}
    bidx={b:i for i,b in enumerate(ALL)}
    for t in keys:
        Xs=[];ys=[]
        for a in keys:
            if a==t: continue
            X=design(A[a],which)
            if extra: X=np.column_stack([X,A[a][extra]])
            if brandfe:
                F=np.zeros((len(A[a]['b']),len(ALL))); F[np.arange(len(A[a]['b'])),[bidx[b] for b in A[a]['b']]]=1; X=np.column_stack([X,F])
            Xs.append(X); ys.append(A[a]['y'])
        X=np.vstack(Xs); mu=X.mean(0); sd=X.std(0)+1e-9
        m=LogisticRegression(C=1.0 if brandfe else 1e4,max_iter=5000).fit((X-mu)/sd,np.concatenate(ys))
        Xt=design(A[t],which)
        if extra: Xt=np.column_stack([Xt,A[t][extra]])
        if brandfe:
            F=np.zeros((len(A[t]['b']),len(ALL))); F[np.arange(len(A[t]['b'])),[bidx[b] for b in A[t]['b']]]=1; Xt=np.column_stack([Xt,F])
        preds[t]=m.predict_proba((Xt-mu)/sd)[:,1]
    return preds
P={'M0':loao('M0'),'M1':loao('M1'),'M1i':loao('M1i'),'FE0':loao('M0',True),'FE1':loao('M0',True,'dev')}
# ---------- per-address metrics
rows={}
for a,d in A.items():
    y=d['y']; R={}
    scorers={'qloo':d['aff'],'chain':d['lc'],'app_blend':app_blend(d),'logit_blend':P['M1'][a]}
    for nm,s in scorers.items():
        R[nm]={'p10':p_at_k(s,y,10),'p20':p_at_k(s,y,20),'auc':auc(s,y),'rho':float(spearmanr(s,y).correlation) if 0<y.sum()<len(y) else np.nan}
    rp10=[];rp20=[]
    for _ in range(1000):
        o=rng.permutation(len(y)); rp10.append(y[o[:10]].mean()); rp20.append(y[o[:20]].mean())
    R['random']={'p10':float(np.mean(rp10)),'p20':float(np.mean(rp20)),'auc':0.5,'rho':0.0}
    sa,num,den=strat_auc(d['aff'],y,d['strat']); R['strat_auc_qloo']=sa; R['_sa_num']=num; R['_sa_den']=den
    sar,_,_=strat_auc(rng.random(len(y)),y,d['strat'])
    R['partial_rho']=partial_spear(d['aff'],y,d['lc'])
    R['rho_qloo_chain']=float(spearmanr(d['aff'],d['lc']).correlation)
    for m in P:
        p=np.clip(P[m][a],1e-6,1-1e-6); R['ll_'+m]=float(log_loss(y,p,labels=[0,1])*len(y)); R['auc_'+m]=auc(P[m][a],y)
    R['n']=len(y); R['pos']=int(y.sum()); R['cat']=d['cat']; R['tier']=d['tier']; R['r']=d['r']
    rows[a]=R
# ---------- aggregate + bootstrap over addresses
def stat(fn,sub=None,B=2000):
    ks=[k for k in keys if (sub is None or sub(k))]
    v=fn(ks); bs=[]
    for _ in range(B):
        s=list(rng.choice(ks,len(ks),replace=True)); bs.append(fn(s))
    bs=np.array(bs); return float(v),float(np.nanpercentile(bs,2.5)),float(np.nanpercentile(bs,97.5))
mean=lambda f:(lambda ks: np.nanmean([f(rows[k]) for k in ks]))
res={'mode':MODE,'n_addresses':len(keys),'per_address':rows,'agg':{}}
for nm in ['qloo','chain','random','app_blend','logit_blend']:
    for m in ['p10','p20','auc','rho']:
        res['agg'][f'{nm}.{m}']=stat(mean(lambda r,nm=nm,m=m:r[nm][m]))
for m in ['p10','p20','auc','rho']:
    res['agg'][f'diff_qloo_minus_chain.{m}']=stat(mean(lambda r,m=m:r['qloo'][m]-r['chain'][m]))
    res['agg'][f'diff_logit_blend_minus_chain.{m}']=stat(mean(lambda r,m=m:r['logit_blend'][m]-r['chain'][m]))
    res['agg'][f'diff_app_blend_minus_chain.{m}']=stat(mean(lambda r,m=m:r['app_blend'][m]-r['chain'][m]))
res['agg']['strat_auc_qloo_mean']=stat(mean(lambda r:r['strat_auc_qloo']))
res['agg']['strat_auc_qloo_pooled']=stat(lambda ks: sum(rows[k]['_sa_num'] for k in ks)/sum(rows[k]['_sa_den'] for k in ks))
res['agg']['partial_rho']=stat(mean(lambda r:r['partial_rho']))
res['agg']['rho_qloo_chain']=stat(mean(lambda r:r['rho_qloo_chain']))
N=sum(rows[k]['n'] for k in keys)
for a_,b_ in [('M0','M1'),('M0','M1i'),('FE0','FE1')]:
    res['agg'][f'll_per_obs_{a_}']=stat(lambda ks,a_=a_: sum(rows[k]['ll_'+a_] for k in ks)/sum(rows[k]['n'] for k in ks))
    res['agg'][f'll_per_obs_{b_}']=stat(lambda ks,b_=b_: sum(rows[k]['ll_'+b_] for k in ks)/sum(rows[k]['n'] for k in ks))
    res['agg'][f'll_improve_pct_{b_}_vs_{a_}']=stat(lambda ks,a_=a_,b_=b_: 100*(sum(rows[k]['ll_'+a_] for k in ks)-sum(rows[k]['ll_'+b_] for k in ks))/sum(rows[k]['ll_'+a_] for k in ks))
    res['agg'][f'auc_{a_}']=stat(mean(lambda r,a_=a_:r['auc_'+a_])); res['agg'][f'auc_{b_}']=stat(mean(lambda r,b_=b_:r['auc_'+b_]))
    res['agg'][f'auc_diff_{b_}_vs_{a_}']=stat(mean(lambda r,a_=a_,b_=b_:r['auc_'+b_]-r['auc_'+a_]))
# pooled AUC across all (address,brand) rows
yy=np.concatenate([A[k]['y'] for k in keys])
for m in P: res['agg'][f'pooled_auc_{m}']=float(roc_auc_score(yy,np.concatenate([P[m][k] for k in keys])))
# by category
cats=sorted(set(r['cat'] for r in rows.values())); res['by_cat']={}
for c in cats:
    sub=lambda k,c=c: rows[k]['cat']==c
    res['by_cat'][c]={'n':sum(1 for k in keys if sub(k)),
      'qloo.p10':stat(mean(lambda r:r['qloo']['p10']),sub),'chain.p10':stat(mean(lambda r:r['chain']['p10']),sub),
      'qloo.auc':stat(mean(lambda r:r['qloo']['auc']),sub),'chain.auc':stat(mean(lambda r:r['chain']['auc']),sub),
      'logit_blend.auc':stat(mean(lambda r:r['logit_blend']['auc']),sub),
      'strat_auc_qloo':stat(lambda ks: sum(rows[k]['_sa_num'] for k in ks)/sum(rows[k]['_sa_den'] for k in ks),sub),
      'partial_rho':stat(mean(lambda r:r['partial_rho']),sub)}
# per-brand diagnostics: within vs between variance of Qloo z
Z=np.array([[A[a]['z'][A[a]['b'].index(b)] if b in A[a]['b'] else np.nan for a in keys] for b in ALL])
res['variance']={'share_of_qloo_z_variance_explained_by_brand':float(1-np.nanmean(np.nanvar(Z,axis=1))/np.nanvar(Z))}
# per-stratum pooled AUC (which chain-size tier does qloo help most)
res['by_stratum']={}
for s in range(5):
    num=den=0
    for k in keys:
        d=A[k]; m=d['strat']==s; y=d['y'][m]; npn=y.sum()*(len(y)-y.sum())
        if npn>0: num+=roc_auc_score(y,d['aff'][m])*npn; den+=npn
    cs=[CNT[b] for b in ALL if stratum(b)==s]
    res['by_stratum'][s]={'count_range':[min(cs),max(cs)],'n_brands':len(cs),'pooled_within_stratum_auc':num/den if den else None,
        'pos_rate':float(np.mean(np.concatenate([A[k]['y'][A[k]['strat']==s] for k in keys])))}
json.dump(res,open(ROOT+f'/results_{MODE}.json','w'),indent=1,default=float)
ag=res['agg']
for k,v in ag.items(): print(k, v if isinstance(v,float) else tuple(round(x,3) for x in v))
print(json.dumps(res['by_stratum'],indent=0)); print(res['variance'])
for c,v in res['by_cat'].items(): print(c,v['n'],{k:round(x[0],3) for k,x in v.items() if k!='n'})
