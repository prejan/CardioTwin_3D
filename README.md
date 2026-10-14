# CardioTwin 3D

**Vessel-level coronary risk, painted on a segmented 3D heart - with every prediction explained.**

CardioTwin 3D predicts overall coronary artery disease (CAD) and stenosis of the LAD, LCX and RCA from 55 routine clinical, ECG, lab and echo measurements, maps each probability onto segmented BodyParts3D coronary meshes you can orbit and click, and explains every prediction with exact SHAP values. All 303 dataset patients are browsable; every number is computed live - nothing is hardcoded.

> **Educational decision-support only - not a diagnosis.** Single referred cohort (303 patients), no external validation. Never replaces angiography or clinician judgement.

Multimodal AI Hackathon 2026 - Track A: Cardiovascular Risk Visualization & Prediction.

## Results (locked 61-patient test, seed 7 - the number to trust)

| Target | Model | ROC-AUC [95% CI] | Acc | F1 | Thr |
|---|---|---|---|---|---|
| CAD | LogisticRegression | 0.926 [0.854-0.982] | 0.836 | 0.881 | 0.65 |
| LAD | RandomForest | 0.923 [0.849-0.979] | 0.836 | 0.861 | 0.60 |
| LCX | XGBoost | 0.806 [0.678-0.919] | 0.754 | 0.694 | 0.40 |
| RCA | XGBoost | 0.704 [0.561-0.827] | 0.639 | 0.621 | 0.325 |

Nested 5-fold OOF: CAD 0.927 / LAD 0.849 / LCX 0.732 / RCA 0.712. Leakage guard: LAD/LCX/RCA/Cath never inputs (`tests/test_leakage.py`, 2 passed). Per-patient test predictions: `models/locked_test_predictions.csv`. Curves: Performance tab (ROC + calibration from locked predictions) and `docs/figures/`.

## Prerequisites

- Python 3.8+ with `venv`
- Node.js 20+ with npm
- No GPU needed. Trained models are committed, so nothing must be retrained.

## Setup & run (3 minutes, 2 terminals)

```powershell
# Terminal 1 - backend (from repo root)
cd CardioTwin_3D
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
uvicorn backend.main:app --port 8000
# health: http://localhost:8000/health  (must show 4 loaded models)
```

```powershell
# Terminal 2 - frontend
cd CardioTwin_3D\frontend
npm install
npm run dev
# app: http://localhost:5173/
```

Pick a patient (P-001…) → **Predict** → vessels recolor, dossier fills. Click any vessel, pill or card - all stay in sync.

### Verify it works

- `http://localhost:8000/health` → `loaded: ["cad","lad","lcx","rca"]`
- `http://localhost:8000/api/samples` → 303 patients
- First Predict takes ~30s (SHAP explains 4 models) - later ones are faster

### Troubleshooting

- `uvicorn: No module named 'backend'` → run from repo root, not from `backend\`
- Port 8000 busy (`WinError 10013`) → `netstat -ano | findstr :8000` then `taskkill /PID <n> /F`, or use `--port 8001` (update fetch URLs in `frontend/src/App.jsx`)
- `npm not recognized` → install Node 20+ and reopen the terminal
- Blank page → hard refresh Ctrl+Shift+R; keep backend running (frontend calls it live)

### Single URL (for judging / video)



## What the app does

- **Workstation:** segmented thorax/heart (orbit, zoom, Front/Left/Top views), layer toggles (lungs, ribs, skin, muscle), 72bpm heartbeat (follows PR in condition painting), vessel focus B&W, fullscreen, printable report.
- **Vessel dossiers:** CAD/LAD/LCX/RCA pills + per-vessel probability vs Youden threshold, angiogram truth, pushing-up/pulling-down top-3, exact SHAP bars with % shares (Top 12 / show all).
- **Condition painting (illustrative, not imaging):** smoker lungs tinted, hypertensive enlargement, LDL glow, low-EF weak beat - always labeled as illustration.
- **All 55 measurements** grouped like the clinical workup; every SHAP bar editable.
- **Performance tab:** locked-61 + nested tables, ROC + calibration graphs from real predictions.
- **How-to-use page** on first launch, dark theme toggle.

## Retrain & test

```powershell
.\venv\Scripts\Activate
python backend\train_locked.py    # locked 61 test -> models/metrics_final.json (~2 min)
python backend\train_nested.py   # nested 5-fold OOF -> models/metrics.json
python -m pytest tests -q        # leakage tests
python backend\make_figures.py   # docs/figures/roc.png + calibration.png
```

## API

| Endpoint | Purpose |
|---|---|
| `GET /health` | loaded models, build tag |
| `GET /api/samples` | all 303 patients + angiogram truth |
| `GET /api/metrics` | nested + locked metrics |
| `GET /api/curves` | ROC + calibration points |
| `POST /predict` | `{features...}` → 4 calibrated probs + thresholds |
| `POST /explain` | exact SHAP waterfall per vessel |

## Project layout

```
backend/   main.py (API+serve) train_locked.py train_nested.py train.py baseline.py make_figures.py
frontend/  src/App.jsx (workstation) src/HeartViewer.jsx (3D) public/anatomy/ public/howto/
models/    *.pkl metrics.json metrics_final.json locked_test_predictions.csv features.json
tests/     test_leakage.py
docs/      figures/roc.png calibration.png
```

## Attribution (required)

- Data: Extension of Z-Alizadeh Sani Dataset, UCI Machine Learning Repository (CC BY 4.0).
- Anatomy: BodyParts3D, Database Center for Life Science (CC BY-SA 2.1 JP); derived meshes redistributed under the same licence.
- App code is original. (C) Akatsuki.

## Limitations (stated in-app and in report)

Single-centre referred cohort, 71% CAD prevalence, no external validation; LCX/RCA moderate by data limits; whole-vessel probabilities (no lesion localization); generic anatomy, not patient-specific.
