"""Ground truth: presence of each brand within density-adaptive radius, from ATP tiles + OSM snapshot tiles."""
import json, glob, os, numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
WORKSPACE = os.environ.get("LEASEUP_ROOT", os.path.abspath(os.path.join(ROOT, "..", "..")))


def load(tdir):
    idx = json.load(open(tdir + "/brands.json"))["brands"]
    ids = [b["id"] for b in idx]
    pts = {i: [] for i in ids}
    for f in glob.glob(tdir + "/*.json"):
        if f.endswith("brands.json"):
            continue
        for bi, la, lo in json.load(open(f)).get("stores", []):
            if abs(la) > 90:
                la, lo = la / 1e5, lo / 1e5
            pts[ids[bi]].append((la, lo))
    return idx, {k: np.array(v) if v else np.zeros((0, 2)) for k, v in pts.items()}


atp_dir = os.path.join(WORKSPACE, "apps/worker/public/tiles")
osm_dir = os.path.join(WORKSPACE, "data/osm-snapshot/tiles")
atp_idx, atp = load(atp_dir)
osm_idx, osm = load(osm_dir)
count = {b["id"]: b["count"] for b in atp_idx}
names = {b["id"]: b["name"] for b in atp_idx}
allatp = np.vstack([v for v in atp.values() if len(v)])


def km(P, la, lo):
    if len(P) == 0:
        return np.zeros(0)
    dla = np.radians(P[:, 0] - la)
    dlo = np.radians(P[:, 1] - lo)
    a = np.sin(dla / 2) ** 2 + np.cos(np.radians(la)) * np.cos(np.radians(P[:, 0])) * np.sin(dlo / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


G = json.load(open(os.path.join(ROOT, "geocoded.json")))
out = {}
for g in G:
    D = int((km(allatp, g["lat"], g["lon"]) <= 3).sum())
    tier = "urban" if D >= 150 else "suburban" if D >= 25 else "rural"
    r = {"urban": 1.5, "suburban": 5, "rural": 15}[tier]
    rows = {}
    for bid in count:
        da = km(atp[bid], g["lat"], g["lon"])
        do = km(osm.get(bid, np.zeros((0, 2))), g["lat"], g["lon"])
        nearest = float(min(da.min() if len(da) else 1e9, do.min() if len(do) else 1e9))
        rows[bid] = {
            "nearest_km": round(nearest, 3),
            "atp_in_r": int((da <= r).sum()),
            "osm_in_r": int((do <= r).sum()),
        }
    out[g["id"]] = {"density_3km": D, "tier": tier, "radius_km": r, "brands": rows}
    print(g["id"], g["cat"], D, tier, r, sum(1 for v in rows.values() if v["nearest_km"] <= r))

json.dump(
    {"national_count": count, "names": names, "osm_brands": list(osm.keys()), "addresses": out},
    open(os.path.join(ROOT, "ground_truth.json"), "w"),
)
print("ATP points", len(allatp), "brands", len(count))
