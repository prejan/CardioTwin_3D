"""Convert downloaded xlsx to data/raw.csv"""
from pathlib import Path
import pandas as pd
data_dir = Path(__file__).resolve().parents[1] / "data"
xls = list(data_dir.glob("*.xlsx")) + list(data_dir.glob("*.xls"))
print("found:", xls)
if not xls:
    raise SystemExit("Put the UCI xlsx in data/ first. File name like 'extention of Z-Alizadeh sani dataset.xlsx'")
f = xls[0]
# read all sheets, use the one with 303 rows
xl = pd.ExcelFile(f)
print("sheets:", xl.sheet_names)
best = None
for sh in xl.sheet_names:
    df = pd.read_excel(f, sheet_name=sh)
    print(sh, df.shape, df.columns.tolist()[:5])
    if df.shape[0] >= 300:
        best = df
        break
if best is None:
    best = pd.read_excel(f)
# clean column names
best.columns = [str(c).strip() for c in best.columns]
out = data_dir / "raw.csv"
best.to_csv(out, index=False)
print(f"saved -> {out} shape={best.shape}")
print("cols:", best.columns.tolist()[-10:])
