"""Final evidence: locked 61 test + 3x repeated 5-fold + Brier + bootstrap. Fixed classes from nested CV."""
import json, numpy as np, pandas as pd
from pathlib import Path
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
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

def model_name(m):
    from sklearn.pipeline import Pipeline
    if isinstance(m, Pipeline):
        return type(m.steps[-1][1]).__name__
    return type(m).__name__

def norm(s):
    return s.astype(str).str.lower().map(lambda v: 1 if v in ("cad", "stenotic", "1", "yes") else 0).values

def boot_ci(y, p, fn, n=2000, seed=7):
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2: continue
        try: vals.append(fn(y[idx], p[idx]))
        except Exception: continue
    return [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)]

def youden(y, p):
    best, bt = -1, 0.5
    for t in np.linspace(0.1, 0.9, 33):
        yp = (p >= t).astype(int)
        se = (yp[y == 1] == 1).mean() if (y == 1).sum() else 0
        sp = (yp[y == 0] == 0).mean() if (y == 0).sum() else 0
        j = se + sp - 1
        if j > best: best, bt = j, t
    return round(float(bt), 3)

def main():
    import sklearn
    df = pd.read_csv(RAW)
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].str.lower() == "stenotic") | (df["LCX"].str.lower() == "stenotic") | (df["RCA"].str.lower() == "stenotic")).map({True: "CAD", False: "Normal"})
    X = pd.get_dummies(df.drop(columns=[c for c in DROP if c in df.columns]), drop_first=True)
    feats = X.values
    assert not any(c in list(X.columns) for c in DROP if c != "CAD"), "LEAKAGE"
    assert "CAD" not in list(X.columns), "LEAKAGE CAD"
    y_all = {t: norm(df[t]) for t in ["CAD", "LAD", "LCX", "RCA"]}
    rep_aucs = {t: [] for t in y_all}
    for rep in range(3):
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=100 + rep)
        for t, y in y_all.items():
            oof = np.zeros(len(y))
            for tr, te in skf.split(feats, y):
                m = CalibratedClassifierCV(FIXED[t], method="sigmoid", cv=3)
                m.fit(X.iloc[tr], y[tr])
                oof[te] = m.predict_proba(X.iloc[te])[:, 1]
            rep_aucs[t].append(roc_auc_score(y, oof))
    rep = {t: {"mean": round(float(np.mean(v)), 3), "sd": round(float(np.std(v)), 3), "runs": [round(float(x), 3) for x in v]} for t, v in rep_aucs.items()}

    strat = df["CAD"].map({"CAD": 1, "Normal": 0}).values
    tr_idx, te_idx = train_test_split(np.arange(len(df)), test_size=61, random_state=7, stratify=strat)
    Xtr, Xte = X.iloc[tr_idx], X.iloc[te_idx]
    locked, test_rows = {}, []
    for t, y in y_all.items():
        ytr, yte = y[tr_idx], y[te_idx]
        m = CalibratedClassifierCV(FIXED[t], method="sigmoid", cv=5)
        m.fit(Xtr, ytr)
        p = m.predict_proba(Xte)[:, 1]
        thr = THR[t]
        yp = (p >= thr).astype(int)
        locked[t] = {
            "model": model_name(FIXED[t]),
            "roc_auc": round(float(roc_auc_score(yte, p)), 3),
            "ci95": boot_ci(yte, p, roc_auc_score),
            "acc": round(float(accuracy_score(yte, yp)), 3),
            "prec": round(float(precision_score(yte, yp, zero_division=0)), 3),
            "rec": round(float(recall_score(yte, yp, zero_division=0)), 3),
            "f1": round(float(f1_score(yte, yp, zero_division=0)), 3),
            "brier": round(float(brier_score_loss(yte, p)), 3),
            "thr": thr, "n_test": 61,
        }
        for i, gi in enumerate(te_idx):
            test_rows.append({"id": f"P-{gi+1:03d}", "target": t, "y": int(yte[i]), "p": round(float(p[i]), 4)})
    out = {"sklearn": sklearn.__version__, "seed_locked": 7, "n": len(df),
           "repeated_5fold_x3_auc": rep, "locked_test_61": locked, "oofs_note": "repeated means of OOF AUC per repeat"}
    (OUT / "metrics_final.json").write_text(json.dumps(out, indent=2))
    pd.DataFrame(test_rows).to_csv(OUT / "locked_test_predictions.csv", index=False)
    print(json.dumps({"repeated": rep, "locked": {k: (v["roc_auc"], v["ci95"]) for k, v in locked.items()}}, indent=2))

if __name__ == "__main__":
    main()
