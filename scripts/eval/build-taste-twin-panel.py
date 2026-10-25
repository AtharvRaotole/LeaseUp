"""Build the static taste-twin panel the worker ships (apps/worker/src/lib/taste-twin-panel.json).
Inputs are the recorded 40-address eval (Qloo insights affinity + store ground truth at the adaptive radius),
so the shipped feature makes no Qloo calls of its own. Usage: /workspace/venv-eval/bin/python scripts/eval/build-taste-twin-panel.py"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../data/qloo-eval-40'))
from backtest_common import build_tables, GEO, GT

LABELS = {
    'chi_wicker': 'Wicker Park, Chicago', 'chi_lakeview': 'Lakeview, Chicago', 'nyc_williamsburg': 'Williamsburg, Brooklyn',
    'nyc_uws': 'Upper West Side, Manhattan', 'sf_fillmore': 'Fillmore St, San Francisco', 'sf_mission': 'Mission St, San Francisco',
    'dc_14th': '14th St, Washington DC', 'phl_walnut': 'Rittenhouse, Philadelphia', 'sea_caphill': 'Capitol Hill, Seattle',
    'greenwich_ct': 'Greenwich, CT', 'bethesda_md': 'Bethesda, MD', 'naperville_il': 'Naperville, IL', 'palo_alto_ca': 'Palo Alto, CA',
    'edina_mn': 'Edina, MN', 'wellesley_ma': 'Wellesley, MA', 'boulder_co': 'Pearl St, Boulder', 'annarbor_mi': 'Ann Arbor, MI',
    'athens_ga': 'Athens, GA', 'madison_wi': 'State St, Madison', 'ithaca_ny': 'Ithaca, NY', 'chapelhill_nc': 'Chapel Hill, NC',
    'hutchinson_ks': 'Hutchinson, KS', 'ottumwa_ia': 'Ottumwa, IA', 'elko_nv': 'Elko, NV', 'sedalia_mo': 'Sedalia, MO',
    'bemidji_mn': 'Bemidji, MN', 'laramie_wy': 'Laramie, WY', 'sevierville_tn': 'Sevierville, TN', 'lasvegas_strip': 'Las Vegas Strip',
    'keywest_fl': 'Key West, FL', 'myrtle_sc': 'Myrtle Beach, SC', 'parkcity_ut': 'Park City, UT', 'branson_mo': 'Branson, MO',
    'frisco_tx': 'Frisco, TX', 'boise_id': 'Boise, ID', 'nashville_12s': '12 South, Nashville', 'austin_soco': 'South Congress, Austin',
    'gilbert_az': 'Gilbert, AZ', 'charlotte_se': 'South End, Charlotte', 'cary_nc': 'Cary, NC',
}
A, BM = build_tables()
brands = sorted(BM)
idx = {b: i for i, b in enumerate(brands)}
sites = []
for a, d in A.items():
    dev = [None] * len(brands)
    for b, v in zip(d['b'], d['dev']):
        dev[idx[b]] = round(float(v), 3)
    sites.append({
        'id': a, 'label': LABELS[a], 'lat': round(GEO[a]['lat'], 5), 'lon': round(GEO[a]['lon'], 5),
        'radiusKm': GT['addresses'][a]['radius_km'],
        'present': sorted(idx[b] for b, y in zip(d['b'], d['y']) if y == 1),
        'dev': dev,
    })
out = {
    'source': 'data/qloo-eval-40 (insights_affinity.json, ground_truth.json at the adaptive radius); see TASTE_TWIN_EVAL.md',
    'k': 5, 'excludeKm': 50, 'minCommonBrands': 30,
    'brands': brands, 'brandMeanZ': [round(BM[b], 4) for b in brands], 'sites': sites,
}
p = os.path.join(os.path.dirname(__file__), '../../apps/worker/src/lib/taste-twin-panel.json')
json.dump(out, open(p, 'w'), separators=(',', ':'))
print(len(brands), 'brands', len(sites), 'sites', os.path.getsize(p), 'bytes')
