"""Fetch UCI id=411 and save data/raw.csv"""
from pathlib import Path
try:
    from ucimlrepo import fetch_ucirepo
except ImportError:
    raise SystemExit("run: pip install ucimlrepo openpyxl")
ds = fetch_ucirepo(id=411)
import pandas as pd
X = ds.data.features
y = ds.data.targets
print("X:", X.shape, "y:", y.shape if y is not None else None)
print(X.columns.tolist()[:10])
if y is not None:
    print(y.columns.tolist())
    df = pd.concat([X, y], axis=1)
else:
    df = X
out = Path(__file__).resolve().parents[1] / "data" / "raw.csv"
out.parent.mkdir(exist_ok=True)
df.to_csv(out, index=False)
print(f"saved -> {out} shape={df.shape}")
