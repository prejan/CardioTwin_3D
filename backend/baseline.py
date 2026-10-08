"""Day1 baseline - 4 heads: CAD, LAD, LCX, RCA. Excludes targets from X."""
import json, pandas as pd
from pathlib import Path
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "data" / "raw.csv"
OUT = BASE / "models" / "metrics_baseline.json"
TARGETS = ["CAD", "LAD", "LCX", "RCA"]
DROP = ["LAD", "LCX", "RCA", "Cath"]

def norm_target(s):
    # handles CAD/Normal and Stenotic/Normal variants -> 0/1
    s = s.astype(str).str.strip().str.lower()
    return s.map(lambda v: 1 if v in ("cad", "stenotic", "1", "yes", "1.0") else 0)

def run():
    df = pd.read_csv(RAW)
    # Derive overall CAD if missing: CAD=1 if any vessel Stenotic (per UCI definition >=50%)
    if "CAD" not in df.columns:
        df["CAD"] = ((df["LAD"].astype(str).str.lower() == "stenotic") | (df["LCX"].astype(str).str.lower() == "stenotic") | (df["RCA"].astype(str).str.lower() == "stenotic")).astype(int).map({1: "CAD", 0: "Normal"})
        print("Derived CAD from LAD/LCX/RCA")
    df = df.dropna(subset=["LAD", "LCX", "RCA"])
    X_full = df.drop(columns=[c for c in DROP + ["CAD"] if c in df.columns])
    X_full = pd.get_dummies(X_full, drop_first=True)
    results = {}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    for t in TARGETS:
        y = norm_target(df[t])
        X = X_full.copy()
        for mname, model in [
            ("logreg", make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))),
            ("rf", RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)),
        ]:
            cvr = cross_validate(model, X, y, cv=cv, scoring=scoring)
            results[f"{t}_{mname}"] = {k: round(float(cvr[f'test_{k}'].mean()), 3) for k in scoring}
            print(f"{t}_{mname}: {results[f'{t}_{mname}']}")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(results, indent=2))
    print(f"saved -> {OUT}")

if __name__ == "__main__":
    run()
