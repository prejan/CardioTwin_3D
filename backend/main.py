"""CardioTwin 3D API v3 - nested models + exact SHAP + single-URL serve."""
import json, joblib, pandas as pd, numpy as np
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE / "models"
DIST = BASE / "frontend" / "dist"
app = FastAPI(title="CardioTwin 3D API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

FEATURES = json.loads((MODEL_DIR / "features.json").read_text())
METRICS = json.loads((MODEL_DIR / "metrics.json").read_text()) if (MODEL_DIR / "metrics.json").exists() else {}
RANGES = {
    "Age": (20, 100), "Weight": (30, 200), "Length": (130, 210), "BMI": (15, 50),
    "BP": (80, 250), "PR": (40, 150), "FBS": (60, 450), "CR": (0.3, 3.0),
    "TG": (30, 1200), "LDL": (10, 300), "HDL": (10, 120), "BUN": (5, 60),
    "ESR": (1, 100), "HB": (8, 20), "K": (2.5, 7.0), "Na": (125, 160),
    "WBC": (3000, 20000), "Lymph": (5, 70), "Neut": (20, 95), "PLT": (20, 800),
    "EF-TTE": (10, 80),
}
MODELS = {}
for t in ["cad", "lad", "lcx", "rca"]:
    p = MODEL_DIR / f"{t}.pkl"
    if p.exists():
        MODELS[t] = joblib.load(p)

def to_vector(patient: dict):
    df = pd.DataFrame([patient])
    df = pd.get_dummies(df, drop_first=True)
    for c in FEATURES:
        if c not in df.columns:
            df[c] = 0
    return df[FEATURES].astype(float)

def validate(patient: dict):
    for k, (lo, hi) in RANGES.items():
        if k in patient:
            try: v = float(patient[k])
            except Exception: raise HTTPException(400, f"{k} must be numeric")
            if not (lo <= v <= hi): raise HTTPException(400, f"{k}={v} out of range [{lo}-{hi}]")

@app.get("/health")
def health():
    return {"ok": True, "build": "shapfix-57-v2", "loaded": list(MODELS.keys()), "n_features": len(FEATURES), "metrics": METRICS}

@app.get("/api/metrics")
def api_metrics():
    out = {"nested_5fold": METRICS}
    fp = MODEL_DIR / "metrics_final.json"
    if fp.exists():
        out["locked"] = json.loads(fp.read_text())
    return out

@app.get("/api/samples")
def api_samples():
    import pandas as pd
    df = pd.read_csv(BASE / "data" / "raw.csv")
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].astype(str).str.lower() == "stenotic") | (df["LCX"].astype(str).str.lower() == "stenotic") | (df["RCA"].astype(str).str.lower() == "stenotic")).map({True: "CAD", False: "Normal"})
    drop = ["LAD", "LCX", "RCA", "Cath", "CAD"]
    out = []
    for i, r in df.reset_index(drop=True).iterrows():
        feat = {}
        for k in df.columns:
            if k in drop: continue
            v = r[k]
            feat[k] = float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else str(v)
        out.append({"id": f"P-{i+1:03d}", "truth": {"CAD": str(r["CAD"]), "LAD": str(r["LAD"]), "LCX": str(r["LCX"]), "RCA": str(r["RCA"])}, "features": feat})
    return out

@app.post("/predict")
def predict(patient: dict):
    validate(patient)
    X = to_vector(patient)
    out = {f"{t}_prob": round(float(m.predict_proba(X)[0, 1]), 4) for t, m in MODELS.items()}
    out["thresholds"] = {t: METRICS.get(t.upper(), {}).get("thr", 0.5) for t in MODELS}
    out["disclaimer"] = "Educational / decision-support only - not diagnostic."
    return out

@app.post("/explain")
def explain(patient: dict):
    validate(patient)
    import shap
    import numpy as np
    X = to_vector(patient)
    resp = {"waterfall": {}, "base_value": {}, "units": "probability points"}

    def fitted_base(cal):
        # sklearn-version-proof: calibrated_classifiers_[i].estimator / base_estimator
        cands = []
        for attr in ("calibrated_classifiers_", "calibrated_classifiers"):
            if hasattr(cal, attr):
                cands = list(getattr(cal, attr))
                break
        if cands:
            c0 = cands[0]
            for a in ("estimator", "base_estimator", "base_estimator_", "estimator_"):
                if hasattr(c0, a):
                    return getattr(c0, a)
        for a in ("base_estimator", "estimator", "base_estimator_", "estimator_"):
            if hasattr(cal, a):
                return getattr(cal, a)
        return None

    for t, m in MODELS.items():
        try:
            est = fitted_base(m)
            if est is None:
                raise RuntimeError("no fitted base estimator found")
            if hasattr(est, "coef_"):
                ex = shap.LinearExplainer(est, X)
                raw = ex.shap_values(X)
            else:
                ex = shap.TreeExplainer(est)
                raw = ex.shap_values(X)
            if isinstance(raw, list):
                raw = raw[1] if len(raw) > 1 else raw[0]
            sv = np.asarray(raw, dtype=float)
            if sv.ndim == 3:
                sv = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
            row = sv[0].ravel() if sv.ndim >= 2 else sv.ravel()
            assert row.shape[0] == len(FEATURES), f"SHAP len {row.shape[0]} != {len(FEATURES)}"
            order = np.argsort(np.abs(row))[::-1]
            resp["waterfall"][t] = [{"feature": FEATURES[i], "shap": round(float(row[i]), 5), "value": float(X.iloc[0, i])} for i in order]
            resp["base_value"][t] = round(float(m.predict_proba(X)[0, 1] - row.sum()), 4)
        except Exception as e:
            resp["waterfall"][t] = [{"error": f"{type(e).__name__}: {str(e)[:180]}"}]
    return resp

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    app.mount("/anatomy", StaticFiles(directory=BASE / "frontend" / "public" / "anatomy"), name="anatomy")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        f = DIST / full_path
        if full_path and f.is_file():
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
