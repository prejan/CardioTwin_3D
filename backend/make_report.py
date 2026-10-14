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

pdf.add_page()
h("5. System")
p("Anatomy: BodyParts3D thorax and heart glTF with coronary segments mapped to model targets (LAD: Coronary_LAD with septal branch; LCX: Coronary_LCX; RCA: five segments). Rotate, zoom, vessel click with synced pills, cards and dossiers; front/left/top presets; isolate mode; vessel-focus monochrome (grey anatomy, coloured coronaries); heartbeat animation; layer toggles for lungs, ribs, skin and muscle; fullscreen overlay; printable report. A condition-painting mode, always labelled illustrative rather than imaging, tints smoker lungs, enlarges hypertensive hearts, brightens high-LDL vessels and weakens low-EF beats. Dashboard: 303 searchable patients with angiogram truth beside live predictions, 55-field grouped form with validation, vessel dossiers (probability versus threshold, top pushing-up and pulling-down factors, exact SHAP waterfall with top-12/all toggle), performance tab with locked and nested tables and live ROC/calibration graphs, first-run guide, dark theme. The interface renders on demand in a modern browser without a dedicated GPU.")
h("6. Limitations, safety and attribution")
p("Single-centre referred cohort with no external validation; recalibration is required before any other use. LCX and RCA carry wide intervals and modest recall. Probabilities are per-vessel, with no lesion localization, because the dataset contains none. Anatomy is generic adult reference, not patient-specific. What-if edits show model behaviour, not causal effects. The interface carries a permanent educational-use disclaimer; this system is not a medical device. Data: Extension of Z-Alizadeh Sani Dataset, UCI Machine Learning Repository (CC BY 4.0). Anatomy: BodyParts3D, Database Center for Life Science (CC BY-SA 2.1 JP); derived meshes redistributed under the same licence. Application code is original. (C) Akatsuki.")

out = BASE / "docs" / "CardioTwin3D_Report.pdf"
pdf.output(str(out))
print("saved", out)
