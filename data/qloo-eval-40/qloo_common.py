"""Shared helpers: Qloo client with rate limiting + raw-response recording. Never prints keys."""
import os, json, time, hashlib, urllib.parse, requests, re
ROOT = os.path.dirname(os.path.abspath(__file__))
D16 = '/workspace/qloo-hackathon/deploy16'
def load_env():
    env = {}
    for line in open('/workspace/qloo-hackathon/.env'):
        line=line.strip()
        if '=' in line and not line.startswith('#'):
            k,v=line.split('=',1); env[k]=v.strip().strip('"').strip("'")
    return env
_ENV = load_env()
BASE = _ENV.get('QLOO_BASE_URL') or 'https://hackathon.api.qloo.com'
_last = [0.0]
MIN_INTERVAL = 0.6  # seconds between Qloo calls (conservative)
def qloo_get(params, raw_path):
    """GET /v2/insights; caches raw JSON at raw_path (re-uses if exists)."""
    if os.path.exists(raw_path):
        return json.load(open(raw_path))['response']
    for attempt in range(6):
        wait = MIN_INTERVAL - (time.time()-_last[0])
        if wait>0: time.sleep(wait)
        _last[0]=time.time()
        try:
            r = requests.get(BASE+'/v2/insights', params=params, headers={'X-Api-Key':_ENV['QLOO_API_KEY'],'Accept':'application/json','User-Agent':'LeaseUp-eval/1.0'}, timeout=60)
        except requests.exceptions.RequestException:
            time.sleep(min(2**attempt*2,60)); continue
        if r.status_code==429 or r.status_code>=500:
            time.sleep(min(2**attempt*2,60)); continue
        break
    try: body=r.json()
    except Exception: body={'_text':r.text[:2000]}
    rec={'requested_at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'status':r.status_code,'params':params,'response':body}
    if r.status_code==200:
        json.dump(rec,open(raw_path,'w'))
    else:
        json.dump(rec,open(raw_path+'.err.json','w'))
    return body if r.status_code==200 else {'_error':r.status_code,'body':body}
def tracked_ids():
    src=open(D16+'/apps/worker/src/data/tracked-brand-ids.ts').read()
    return list(dict.fromkeys(re.findall(r'[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}',src)))
