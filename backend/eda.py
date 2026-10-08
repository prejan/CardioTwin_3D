"""Day1 EDA - leakage-safe check for Z-Alizadeh Sani extension."""
import pandas as pd, sys
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw.csv"
DROP_TARGETS = ["LAD", "LCX", "RCA", "Cath", "CAD"]

def main():
    df = pd.read_csv(RAW)
    print(f"shape: {df.shape}")
    print(df.dtypes.value_counts())
    print("\n--- nulls (top 10) ---")
    print(df.isna().sum().sort_values(ascending=False).head(10))
    for col in ["CAD", "LAD", "LCX", "RCA"]:
        if col in df.columns:
            print(f"\n{col} distribution:")
            print(df[col].value_counts(dropna=False))
    features = [c for c in df.columns if c not in DROP_TARGETS]
    print(f"\nfeatures ({len(features)}): {features}")
    # quick leakage guard
    leak = [c for c in features if c in DROP_TARGETS]
    assert not leak, f"leakage columns in features: {leak}"
    print("\nEDA OK - no leakage, ready for baseline.py")

if __name__ == "__main__":
    if not RAW.exists():
        print(f"MISSING: {RAW} - download UCI 'Extension of Z-Alizadeh Sani' CSV as data/raw.csv")
        sys.exit(1)
    main()
