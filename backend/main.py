"""FastAPI stub - contract frozen Day1. Full logic Day3."""
from fastapi import FastAPI
app = FastAPI(title="CardioTwin 3D API")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/predict")
def predict(patient: dict):
    # TODO Day3: load models/*.pkl, return cad/lad/lcx/rca probs
    return {"cad_prob": 0.0, "lad_prob": 0.0, "lcx_prob": 0.0, "rca_prob": 0.0,
            "note": "stub - Day3 implements"}

@app.post("/explain")
def explain(patient: dict):
    # TODO Day3: SHAP values
    return {"shap": {}, "note": "stub - Day3 implements"}
