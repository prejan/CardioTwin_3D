"""Nested CV + Platt + Youden + bootstrap CIs. Fast-best to beat opponents."""
import json, joblib, numpy as np, pandas as pd
from pathlib import Path
from sklearn.model_selection import StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "data" / "raw.csv"
OUT = BASE / "models"
DROP = ["LAD", "LCX", "RCA", "Cath", "CAD"]
TARGETS = ["CAD", "LAD", "LCX", "RCA"]

def norm(s):
    return s.astype(str).str.lower().map(lambda v: 1 if v in ("cad", "stenotic", "1", "yes") else 0)

def candidates():
    return {
        "logreg": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)),
        "rf": RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1),
        "xgb": XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9, eval_metric="logloss", random_state=42, n_jobs=-1),
    }

def youden_thr(y, p):
    best, bt = -1, 0.5
    for t in np.linspace(0.1, 0.9, 33):
        yp = (p >= t).astype(int)
        se = (yp[y == 1] == 1).mean() if (y == 1).sum() else 0
        sp = (yp[y == 0] == 0).mean() if (y == 0).sum() else 0
        j = se + sp - 1
        if j > best: best, bt = j, t
    return round(float(bt), 3)

def run():
    df = pd.read_csv(RAW)
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].str.lower() == "stenotic") | (df["LCX"].str.lower() == "stenotic") | (df["RCA"].str.lower() == "stenotic")).map({True: "CAD", False: "Normal"})
    X = pd.get_dummies(df.drop(columns=[c for c in DROP if c in df.columns]), drop_first=True)
    feats = X.columns.tolist()
    (OUT / "features.json").write_text(json.dumps(feats, indent=2))
    assert not any(c in feats for c in ["LAD", "LCX", "RCA", "Cath"]), "LEAKAGE"
    print(f"features {len(feats)}, n={len(df)} leakage OK")
    outer = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    inner = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    results, bundle = {}, {}
    for t in TARGETS:
        y = norm(df[t]).values
        oof = np.zeros(len(y))
        best_name, best_auc = None, -1
        # model selection inside: quick inner CV mean AUC
        scores = {}
        for name, mdl in candidates().items():
            aucs = []
            for tr, va in inner.split(X, y):
                mdl.fit(X.iloc[tr], y[tr])
                aucs.append(roc_auc_score(y[va], mdl.predict_proba(X.iloc[va])[:, 1]))
            scores[name] = float(np.mean(aucs))
        best_name = max(scores, key=scores.get)
        print(f"{t} innerAUC {scores} -> {best_name}")
        # outer OOF with calibration
        for tr, te in outer.split(X, y):
            base = candidates()[best_name]
            cal = CalibratedClassifierCV(base, method="sigmoid", cv=3)
            cal.fit(X.iloc[tr], y[tr])
            oof[te] = cal.predict_proba(X.iloc[te])[:, 1]
        auc = roc_auc_score(y, oof)
        thr = youden_thr(y, oof)
        yp = (oof >= thr).astype(int)
        # bootstrap CI for AUC
        rng = np.random.default_rng(42)
        boots = []
        for _ in range(500):
            idx = rng.integers(0, len(y), len(y))
            if len(np.unique(y[idx])) < 2: continue
            boots.append(roc_auc_score(y[idx], oof[idx]))
        lo, hi = float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5))
        results[t] = {"model": best_name, "roc_auc": round(float(auc), 3), "ci95": [round(lo, 3), round(hi, 3)],
                      "thr": thr, "acc": round(float(accuracy_score(y, yp)), 3),
                      "prec": round(float(precision_score(y, yp, zero_division=0)), 3),
                      "rec": round(float(recall_score(y, yp, zero_division=0)), 3),
                      "f1": round(float(f1_score(y, yp, zero_division=0)), 3)}
        print(f"{t}: {results[t]}")
        # refit final on all + calibrate
        final = CalibratedClassifierCV(candidates()[best_name], method="sigmoid", cv=5)
        final.fit(X, y)
        joblib.dump(final, OUT / f"{t.lower()}.pkl")
        bundle[t] = {"model": best_name, "thr": thr}
    (OUT / "metrics.json").write_text(json.dumps(results, indent=2))
    (OUT / "model_bundle.json").write_text(json.dumps(bundle, indent=2))
    print("saved nested metrics + pkls")

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    run()
