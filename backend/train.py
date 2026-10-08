"""v2 train - XGB calibrated for CAD/LAD/LCX/RCA. Saves .pkl + metrics + features."""
import json, joblib, pandas as pd
from pathlib import Path
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "data" / "raw.csv"
MODEL_DIR = BASE / "models"
TARGETS = ["CAD", "LAD", "LCX", "RCA"]
DROP = ["LAD", "LCX", "RCA", "Cath", "CAD"]

def norm_target(s):
    s = s.astype(str).str.strip().str.lower()
    return s.map(lambda v: 1 if v in ("cad", "stenotic", "1", "yes", "1.0") else 0)

def run():
    df = pd.read_csv(RAW)
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].astype(str).str.lower() == "stenotic") |
                     (df["LCX"].astype(str).str.lower() == "stenotic") |
                     (df["RCA"].astype(str).str.lower() == "stenotic")).map({True: "CAD", False: "Normal"})
        print("Derived CAD")
    X_full = df.drop(columns=[c for c in DROP if c in df.columns])
    X_full = pd.get_dummies(X_full, drop_first=True)
    feature_list = X_full.columns.tolist()
    (MODEL_DIR / "features.json").write_text(json.dumps(feature_list, indent=2))
    print(f"features: {len(feature_list)}")
    results = {}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    for t in TARGETS:
        y = norm_target(df[t])
        print(f"\n{t}: pos={int(y.sum())}/{len(y)}")
        base = XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05,
                             subsample=0.9, colsample_bytree=0.9,
                             eval_metric="logloss", random_state=42, n_jobs=-1)
        model = CalibratedClassifierCV(base, method="sigmoid", cv=3)
        cvr = cross_validate(model, X_full, y, cv=cv, scoring=scoring)
        m = {k: round(float(cvr[f"test_{k}"].mean()), 3) for k in scoring}
        results[t] = m
        print(f"{t} XGB-cal: {m}")
        model.fit(X_full, y)
        joblib.dump(model, MODEL_DIR / f"{t.lower()}.pkl")
        print(f"saved {t.lower()}.pkl")
    (MODEL_DIR / "metrics.json").write_text(json.dumps(results, indent=2))
    print(f"\nsaved metrics.json -> {MODEL_DIR/'metrics.json'}")

if __name__ == "__main__":
    MODEL_DIR.mkdir(exist_ok=True)
    run()
