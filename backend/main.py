"""CardioTwin 3D API v2 - real XGB models."""
import json, joblib, pandas as pd
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BASE = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE / "models"
app = FastAPI(title="CardioTwin 3D API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

FEATURES = json.loads((MODEL_DIR / "features.json").read_text())
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
    # patient has raw cols like Age, BP... -> one row -> get_dummies -> align
    df = pd.DataFrame([patient])
    df = pd.get_dummies(df, drop_first=True)
    for c in FEATURES:
        if c not in df.columns:
            df[c] = 0
    return df[FEATURES]

@app.get("/health")
def health():
    return {"ok": True, "loaded": list(MODELS.keys()), "n_features": len(FEATURES)}

@app.post("/predict")
def predict(patient: dict):
    for k, (lo, hi) in RANGES.items():
        if k in patient:
            try:
                v = float(patient[k])
            except Exception:
                raise HTTPException(status_code=400, detail=f"{k} must be numeric")
            if not (lo <= v <= hi):
                raise HTTPException(status_code=400, detail=f"{k}={v} out of range [{lo}-{hi}]")
    X = to_vector(patient)
    out = {}
    for t, m in MODELS.items():
        out[f"{t}_prob"] = round(float(m.predict_proba(X)[0, 1]), 3)
    out["disclaimer"] = "Educational / decision-support only - not diagnostic."
    return out

@app.post("/explain")
def explain(patient: dict):
    X = to_vector(patient)
    # global importance from first calibrated estimator
    resp = {"per_feature": {}, "top_global": {}}
    try:
        m = MODELS["cad"]
        est = m.calibrated_classifiers_[0].base_estimator
        imp = est.feature_importances_
        top_idx = sorted(range(len(imp)), key=lambda i: imp[i], reverse=True)[:10]
        resp["top_global"] = {FEATURES[i]: round(float(imp[i]), 4) for i in top_idx}
        row = X.iloc[0]
        # patient-specific: value * global importance as simple contribution proxy
        contrib = {FEATURES[i]: round(float(row[FEATURES[i]] * imp[i]), 4) for i in top_idx}
        resp["per_feature"] = contrib
    except Exception as e:
        resp["error"] = str(e)
    return resp
