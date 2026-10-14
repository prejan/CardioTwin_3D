from fpdf import FPDF
from fpdf.enums import XPos, YPos
import json
from pathlib import Path

BASE = Path(r"C:\Users\a955017\CardioTwin_3D")
final = json.loads((BASE / "models" / "metrics_final.json").read_text())
LOCKED = final["locked_test_61"]

class Report(FPDF):
    def footer(self):
        self.set_y(-14)
        self.set_font("Times", "I", 8)
        self.set_text_color(0, 0, 0)
        self.cell(0, 8, f"CardioTwin 3D - Track A - page {self.page_no()}/{{nb}}", align="C")

pdf = Report(format="A4")
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.set_margins(20, 16, 20)

def title(t, size=18):
    pdf.set_font("Times", "B", size)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 8, t, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

def sub(t):
    pdf.set_font("Times", "I", 11)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 6, t, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)

def h(t):
    pdf.set_font("Times", "B", 12)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 7, t, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

def p(t, size=11):
    pdf.set_font("Times", "", size)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 5.6, t, align="J", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(1)

def table(rows):
    pdf.set_font("Times", "", 9.5)
    W = (170 - 30) / 4
    pdf.set_font("Times", "B", 9.5)
    pdf.cell(30, 6, "", border=1)
    for t in ["CAD", "LAD", "LCX", "RCA"]:
        pdf.cell(W, 6, t, border=1, align="C")
    pdf.ln()
    pdf.set_font("Times", "", 9.5)
    for k, label in rows:
        pdf.cell(30, 6, label, border=1)
        for t in ["CAD", "LAD", "LCX", "RCA"]:
            v = LOCKED[t].get(k, "--")
            if isinstance(v, list):
                v = f"{v[0]}-{v[1]}"
            pdf.cell(W, 6, str(v), border=1, align="C")
        pdf.ln()
    pdf.ln(2)

pdf.add_page()
pdf.ln(6)
title("CardioTwin 3D")
title("Interpretable Vessel-Level Coronary Risk Mapping", 13)
sub("Multimodal AI Hackathon 2026 - Track A: Cardiovascular Risk Visualization & Prediction")
sub("Team Akatsuki - research prototype for education and decision support only; not a diagnosis and not a substitute for angiography or clinician judgement.")
h("Abstract")
p("CardioTwin 3D predicts overall coronary artery disease (CAD) and stenosis of the left anterior descending (LAD), left circumflex (LCX) and right coronary artery (RCA) from 55 routine clinical, ECG, laboratory and echocardiographic measurements. Each probability is painted onto segmented BodyParts3D coronary meshes in an interactive 3D viewer and explained with exact SHAP values. Models are validated on a locked 61-patient hold-out (seed 7) and nested 5-fold cross-validation with bootstrap intervals. Locked ROC-AUC: CAD 0.926 [0.854-0.982], LAD 0.923 [0.849-0.979], LCX 0.806 [0.678-0.919], RCA 0.704 [0.561-0.827]. The system runs as a single URL without a GPU and was developed on 303 referred patients with no external validation.")
h("1. Clinical motivation and approach")
p("Pre-test risk scores return one number for the whole heart. A clinician reading an echo, an ECG and a lipid panel wants to know which territory is at stake and which findings drive the estimate. CardioTwin 3D provides both: four calibrated probabilities with per-target thresholds, each mapped to its artery in green (<0.40), amber (0.40-0.70) or red (>0.70), and each explained measurement by measurement. Four rules guided construction. First, leakage features (LAD, LCX, RCA, Cath, CAD) are never model inputs, asserted in code and covered by unit tests. Second, probabilities are Platt-calibrated with Youden thresholds chosen on out-of-fold data. Third, every number in the interface comes from live inference; nothing is hardcoded. Fourth, limits are displayed in the interface rather than hidden.")

pdf.add_page()
h("2. Data")
p("UCI Extension of Z-Alizadeh Sani dataset: 303 patients from a Tehran referral centre, 71% CAD prevalence. 55 inputs in six clinical groups: demographics (5), history and risk factors (12), examination (14), ECG (7), laboratory (14), echocardiography (3). Overall CAD follows the dataset definition (positive when any of LAD, LCX, RCA is stenotic at >=50%). There are no missing cells. The interface exposes all 55 measurements with dataset-observed options, so every explanation bar is editable. Split seed is fixed at 7.")
h("2b. Feature groups used by the models")
pdf.set_font("Times", "", 9.5)
pdf.set_text_color(0, 0, 0)
pdf.cell(70, 6, "Group (features)", border=1)
pdf.cell(100, 6, "Examples", border=1)
pdf.ln()
for g, ex in [("Demographics (5)", "Age, Sex, BMI, Weight, Length"), ("History (12)", "Diabetes, hypertension, smoking, family history, obesity"), ("Examination (14)", "Blood pressure, pulse, chest-pain type, murmurs, dyspnea"), ("ECG (7)", "Q wave, ST elevation/depression, T inversion, LVH, BBB"), ("Laboratory (14)", "FBS, cholesterol panel, BUN, ESR, WBC, platelets"), ("Echo (3)", "Ejection fraction, wall-motion region, valve disease")]:
    pdf.cell(70, 6, g, border=1)
    pdf.cell(100, 6, ex, border=1)
    pdf.ln()
pdf.ln(2)
h("3. Methods")
p("Candidate families (all SHAP-compatible): L2/L1 logistic regression, random forest, gradient boosting (XGBoost), with imputation, scaling and one-hot encoding inside each pipeline so folds learn their own statistics. Inner 5-fold ROC-AUC selection on the 242-patient development set chose logistic regression (CAD), random forest with 300 trees (LAD) and XGBoost with 300 trees of depth 4 (LCX, RCA). Calibration is Platt (sigmoid), cross-fitted for evaluation and refit on all development data. Explanations use TreeExplainer for tree models and LinearExplainer otherwise, with one-hot columns summed back to the original measurement and shown in calibrated-probability points with percentage shares. The viewer is React with React Three Fiber; the service is FastAPI serving the built interface from the same port. Seeds, pinned dependencies, committed weights, metrics and per-patient locked predictions make every table reproducible. Retraining takes minutes: backend/train_locked.py, backend/train_nested.py, backend/make_figures.py.")

pdf.add_page()
h("4. Results: locked 61-patient test (seed 7)")
p("The table below is the number to trust: 61 stratified hold-out patients never seen in development, scored once, with 2000-sample bootstrap intervals and Brier scores.")
table([("model", "Model"), ("roc_auc", "ROC-AUC"), ("acc", "Accuracy"), ("prec", "Precision"), ("rec", "Recall"), ("f1", "F1"), ("brier", "Brier"), ("thr", "Threshold")])
p("Nested 5-fold out-of-fold reference over all 303 patients: CAD 0.927, LAD 0.849, LCX 0.732, RCA 0.712. CAD and LAD are informative; LCX and RCA are moderate, which repeated model-class trials show to be a limit of routine measurements rather than of the chosen models. Per-target thresholds trade precision for recall on the weaker vessels; each cut-off is shown beside its probability in the interface.")

pdf.add_page()
h("4b. ROC and calibration (locked 61)")
p("Curves computed from models/locked_test_predictions.csv. Line styles distinguish vessels in print.")
for img, cap in [("roc.png", "Figure 1. ROC curves per vessel, locked test."), ("calibration.png", "Figure 2. Calibration: observed versus predicted frequency; the diagonal is ideal.")]:
    q = BASE / "docs" / "figures" / img
    if q.exists():
        pdf.image(str(q), w=125)
        p(cap, 10)
p("Reading the curves: CAD and LAD rise steeply with areas above 0.92, LCX follows at 0.81, and RCA at 0.70 stays closest to the diagonal, matching its wider confidence interval. Calibration is reasonable for CAD and LAD across the middle bins; the sparse extreme bins reflect only 61 test patients and should not be over-read. These plots, like the table, come from the committed locked_test_predictions.csv, so any reviewer can redraw them.")
p("Future work, in order: external validation on a second centre with recalibration; lesion-level labels from imaging to move beyond whole-vessel probabilities; prospective silent-mode evaluation beside angiography scheduling; and a compact on-device model export so the workstation runs fully offline.")

pdf.add_page()
h("5. System")
p("Anatomy: BodyParts3D thorax and heart glTF with coronary segments mapped to model targets (LAD: Coronary_LAD with septal branch; LCX: Coronary_LCX; RCA: five segments). Rotate, zoom, vessel click with synced pills, cards and dossiers; front/left/top presets; isolate mode; vessel-focus monochrome (grey anatomy, coloured coronaries); heartbeat animation; layer toggles for lungs, ribs, skin and muscle; fullscreen overlay; printable report. A condition-painting mode, always labelled illustrative rather than imaging, tints smoker lungs, enlarges hypertensive hearts, brightens high-LDL vessels and weakens low-EF beats.")
p("Data flow per prediction: (1) the 55-field form is validated against clinical ranges; (2) one-hot encoding aligns the row to the 57 training columns; (3) four calibrated pipelines return probabilities with Youden thresholds; (4) Tree/Linear SHAP explainers attribute all 57 columns, summed back to measurements with percentage shares; (5) the 3D scene, vessel cards, dossier and pills update from the same response object, so the dashboard and the model cannot disagree. Median end-to-end latency is under a minute on CPU with SHAP dominating; the 3D scene renders on demand without a dedicated GPU.")
p("Worked example: patient P-001 (angiogram CAD with LAD and RCA stenosis) receives CAD 0.88 against a 0.65 threshold, LAD 0.71 (high), RCA 0.50 (moderate) and LCX 0.23 (low). The dossier's top drivers are typical chest pain and age pushing risk up, with normal wall motion pulling it down; editing LDL from 155 to 250 mg/dL and re-predicting moves every bar live. A contrasting healthy record (P-005) scores CAD 0.13 with all vessels green, demonstrating the full operating range on real rows rather than synthetic inputs.")
h("5b. Judging criteria mapping")
pdf.set_font("Times", "", 9.5)
pdf.cell(52, 6, "Criterion (weight)", border=1)
pdf.cell(118, 6, "Where it is met", border=1)
pdf.ln()
for _c, _w in [("Predictive (30%)", "Locked 61 test + nested CV, calibration, thresholds; Sec. 4"), ("3D visualization (25%)", "Segmented coronaries, synced selection, views, fullscreen; Sec. 5"), ("Interpretability (20%)", "Per-vessel SHAP dossiers with units and shares; Sec. 5"), ("Integration (15%)", "Single URL, live 303-patient base, shared response object"), ("Technical (10%)", "Pinned deps, tests, committed weights, open data/anatomy")]:
    pdf.cell(52, 6, _c, border=1)
    pdf.cell(118, 6, _w, border=1)
    pdf.ln()
h("6. Limitations, safety and attribution")
p("Single-centre referred cohort with no external validation; recalibration is required before any other use. LCX and RCA carry wide intervals and modest recall. Probabilities are per-vessel, with no lesion localization, because the dataset contains none. Anatomy is generic adult reference, not patient-specific. What-if edits show model behaviour, not causal effects. The interface carries a permanent educational-use disclaimer; this system is not a medical device. Data: Extension of Z-Alizadeh Sani Dataset, UCI Machine Learning Repository (CC BY 4.0). Anatomy: BodyParts3D, Database Center for Life Science (CC BY-SA 2.1 JP); derived meshes redistributed under the same licence. Application code is original. (C) Akatsuki.")

out = BASE / "docs" / "CardioTwin3D_Report.pdf"
pdf.output(str(out))
print("saved", out)
