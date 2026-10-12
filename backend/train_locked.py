"""Locked 61 test, fast. Classes fixed by nested CV."""
import json, numpy as np, pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, f1_score, brier_score_loss
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "data" / "raw.csv"
OUT = BASE / "models"
DROP = ["LAD", "LCX", "RCA", "Cath", "CAD"]
FIXED = {
    "CAD": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)),
    "LAD": RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1),
    "LCX": XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9, eval_metric="logloss", random_state=42, n_jobs=-1),
    "RCA": XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9, eval_metric="logloss", random_state=42, n_jobs=-1),
}
THR = {"CAD": 0.65, "LAD": 0.60, "LCX": 0.40, "RCA": 0.325}

def norm(s):
    return s.astype(str).str.lower().map(lambda v: 1 if v in ("cad", "stenotic", "1", "yes") else 0).values

def boot(y, p, fn, n=2000):
    rng = np.random.default_rng(7)
    v = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if len(np.unique(y[i])) < 2: continue
        try: v.append(fn(y[i], p[i]))
        except Exception: continue
    return [round(float(np.percentile(v, 2.5)), 3), round(float(np.percentile(v, 97.5)), 3)]

def mname(m):
    from sklearn.pipeline import Pipeline as P
    return type(m.steps[-1][1]).__name__ if isinstance(m, P) else type(m).__name__

def main():
    import sklearn
    df = pd.read_csv(RAW)
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].str.lower() == "stenotic") | (df["LCX"].str.lower() == "stenotic") | (df["RCA"].str.lower() == "stenotic")).map({True: "CAD", False: "Normal"})
    X = pd.get_dummies(df.drop(columns=[c for c in DROP if c in df.columns]), drop_first=True)
    assert "CAD" not in X.columns and not any(c in X.columns for c in ["LAD", "LCX", "RCA", "Cath"])
    y_all = {t: norm(df[t]) for t in ["CAD", "LAD", "LCX", "RCA"]}
    strat = df["CAD"].map({"CAD": 1, "Normal": 0}).values
    tri, tei = train_test_split(np.arange(len(df)), test_size=61, random_state=7, stratify=strat)
    Xtr, Xte = X.iloc[tri], X.iloc[tei]
    locked, rows = {}, []
    for t, y in y_all.items():
        m = CalibratedClassifierCV(FIXED[t], method="sigmoid", cv=5)
        m.fit(Xtr, y[tri])
        p = m.predict_proba(Xte)[:, 1]
        yp = (p >= THR[t]).astype(int)
        yt = y[tei]
        locked[t] = {"model": mname(FIXED[t]), "roc_auc": round(float(roc_auc_score(yt, p)), 3),
            "ci95": boot(yt, p, roc_auc_score), "acc": round(float(accuracy_score(yt, yp)), 3),
            "prec": round(float(precision_score(yt, yp, zero_division=0)), 3),
            "rec": round(float(recall_score(yt, yp, zero_division=0)), 3),
            "f1": round(float(f1_score(yt, yp, zero_division=0)), 3),
            "brier": round(float(brier_score_loss(yt, p)), 3), "thr": THR[t], "n_test": 61}
        print(t, locked[t], flush=True)
        for i, gi in enumerate(tei):
            rows.append({"id": f"P-{gi+1:03d}", "target": t, "y": int(yt[i]), "p": round(float(p[i]), 4)})
    (OUT / "metrics_final.json").write_text(json.dumps({"sklearn": sklearn.__version__, "seed_locked": 7, "n": len(df), "locked_test_61": locked}, indent=2))
    pd.DataFrame(rows).to_csv(OUT / "locked_test_predictions.csv", index=False)
    print("saved metrics_final.json", flush=True)

if __name__ == "__main__":
    main()
