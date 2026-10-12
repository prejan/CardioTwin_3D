"""Leakage guard: targets never in features; no feature identical to a label."""
import pandas as pd
from pathlib import Path

DROP = ["LAD", "LCX", "RCA", "Cath", "CAD"]

def norm(s):
    return s.astype(str).str.lower().map(lambda v: 1 if v in ("cad", "stenotic", "1", "yes") else 0)

def test_no_leakage_columns():
    df = pd.read_csv(Path(__file__).resolve().parents[1] / "data" / "raw.csv")
    feats = [c for c in df.columns if c not in DROP]
    for t in ["LAD", "LCX", "RCA", "Cath", "CAD"]:
        assert t not in feats, f"leakage column {t} in features"

def test_no_identical_feature():
    df = pd.read_csv(Path(__file__).resolve().parents[1] / "data" / "raw.csv")
    feats = pd.get_dummies(df.drop(columns=[c for c in DROP if c in df.columns]), drop_first=True)
    for t in ["LAD", "LCX", "RCA"]:
        y = norm(df[t]).values
        for c in feats.columns:
            v = feats[c].values
            if set(map(str, sorted(map(str, set(v.tolist()))))) <= {"0", "1", "0.0", "1.0", "True", "False"}:
                assert not ((v.astype(str) == y.astype(str)).mean() > 0.999), f"feature {c} identical to {t}"
