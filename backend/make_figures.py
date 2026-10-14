"""Publication ROC + calibration figures from locked_test_predictions.csv -> docs/figures/"""
from pathlib import Path
import pandas as pd
import numpy as np

BASE = Path(__file__).resolve().parents[1]
CSV = BASE / "models" / "locked_test_predictions.csv"
FIG = BASE / "docs" / "figures"
COLORS = {"CAD": "#0f766e", "LAD": "#c2410c", "LCX": "#7c3aed", "RCA": "#1d4ed8"}

def main():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from sklearn.metrics import roc_curve, roc_auc_score
    import json
    FIG.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(CSV)
    STYLES = {"CAD": ("black", "-", "o"), "LAD": ("black", "--", "s"), "LCX": ("dimgray", "-.", "^"), "RCA": ("gray", ":", "D")}
    try:
        final = json.loads((BASE / "models" / "metrics_final.json").read_text())["locked_test_61"]
    except Exception:
        final = {}

    plt.rcParams.update({"font.family": "serif", "font.serif": ["Times New Roman"], "axes.edgecolor": "black"})
    # ---- ROC ----
    fig, ax = plt.subplots(figsize=(5.2, 4.6), dpi=150)
    for t in ["CAD", "LAD", "LCX", "RCA"]:
        d = df[df["target"] == t]
        fpr, tpr, _ = roc_curve(d["y"], d["p"])
        auc = final.get(t, {}).get("roc_auc", roc_auc_score(d["y"], d["p"]))
        ax.plot(fpr, tpr, color=COLORS[t], lw=2.2, label=f"{t} (AUC {auc:.3f})")
    ax.plot([0, 1], [0, 1], color="#94a3b8", ls="--", lw=1)
    ax.set_xlabel("False positive rate")
    ax.set_ylabel("True positive rate")
    ax.set_title("ROC curves - locked 61 test")
    ax.legend(frameon=True, fontsize=9)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(FIG / "roc.png")
    print("saved", FIG / "roc.png")

    # ---- Calibration ----
    fig, ax = plt.subplots(figsize=(5.2, 4.6), dpi=150)
    for t in ["CAD", "LAD", "LCX", "RCA"]:
        d = df[df["target"] == t].sort_values("p")
        p, y = d["p"].values, d["y"].values
        xs, ys = [], []
        for b in range(10):
            lo, hi = b / 10, (b + 1) / 10
            m = (p >= lo) & (p < hi if b < 9 else p <= hi)
            if m.sum() >= 2:
                xs.append(float(p[m].mean())); ys.append(float(y[m].mean()))
        ax.plot(xs, ys, "o-", color=COLORS[t], lw=2, ms=5, label=t)
    ax.plot([0, 1], [0, 1], color="#94a3b8", ls="--", lw=1)
    ax.set_xlabel("Predicted probability")
    ax.set_ylabel("Observed frequency")
    ax.set_title("Calibration - locked 61 test")
    ax.legend(frameon=True, fontsize=9)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.grid(alpha=0.25)
    fig.tight_layout()
    fig.savefig(FIG / "calibration.png")
    print("saved", FIG / "calibration.png")

if __name__ == "__main__":
    main()
