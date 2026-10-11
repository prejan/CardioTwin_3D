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
    "BP": (80, 250), "PR": (40, 150), "FBS": (60, 300), "CR": (0.5, 2.0),
    "TG": (50, 500), "LDL": (50, 300), "HDL": (20, 100), "BUN": (5, 50),
    "ESR": (1, 100), "HB": (8, 20), "K": (3.0, 6.0), "Na": (130, 150),
    "WBC": (3000, 15000), "Lymph": (10, 60), "Neut": (30, 80), "PLT": (100, 500),
    "EF-TTE": (20, 80),
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
    return {"ok": True, "loaded": list(MODELS.keys()), "n_features": len(FEATURES), "metrics": METRICS}

@app.get("/api/metrics")
def api_metrics():
    return METRICS

@app.get("/api/samples")
def api_samples():
    import pandas as pd
    df = pd.read_csv(BASE / "data" / "raw.csv")
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].astype(str).str.lower() == "stenotic") | (df["LCX"].astype(str).str.lower() == "stenotic") | (df["RCA"].astype(str).str.lower() == "stenotic")).map({True: "CAD", False: "Normal"})
    # 8 diverse: 4 CAD, 4 Normal, spread ages
    cad = df[df["CAD"] == "CAD"].iloc[::max(1, len(df[df["CAD"] == "CAD"]) // 4)][:4]
    nor = df[df["CAD"] == "Normal"].iloc[::max(1, len(df[df["CAD"] == "Normal"]) // 4)][:4]
    sel = pd.concat([cad, nor]).reset_index(drop=True)
    drop = ["LAD", "LCX", "RCA", "Cath", "CAD"]
    out = []
    for i, r in sel.iterrows():
        feat = {k: (r[k].item() if hasattr(r[k], "item") else r[k]) for k in sel.columns if k not in drop}
        # numpy -> python
        feat = {k: float(v) if isinstance(v, (float, int)) and not isinstance(v, bool) else str(v) for k, v in feat.items()}
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
    X = to_vector(patient)
    resp = {"waterfall": {}, "base_value": {}, "units": "probability points"}
    for t, m in MODELS.items():
        try:
            est = m.calibrated_classifiers_[0].base_estimator
            if hasattr(est, "coef_"):
                import sklearn
                ex = shap.LinearExplainer(est, X)
                sv = ex.shap_values(X)[0]
            else:
                ex = shap.TreeExplainer(est)
                sv = ex.shap_values(X)[0]
                if isinstance(sv, list): sv = sv[1] if len(sv) > 1 else sv[0]
            idx = np.argsort(np.abs(sv))[::-1][:12]
            resp["waterfall"][t] = [{"feature": FEATURES[i], "shap": round(float(sv[i]), 5), "value": float(X.iloc[0, i])} for i in idx]
            resp["base_value"][t] = round(float(m.predict_proba(X)[0, 1] - sv.sum()), 4)
        except Exception as e:
            resp["waterfall"][t] = [{"error": str(e)}]
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
