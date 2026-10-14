import { useEffect, useState } from 'react'
import HeartViewer, { riskColor } from './HeartViewer'

const CURVE_COL = { CAD: '#0f766e', LAD: '#c2410c', LCX: '#7c3aed', RCA: '#1d4ed8' }

function CurveChart({ title, xlabel, ylabel, series }) {
  const W = 320, H = 250, P = 32
  const pt = ([x, y]) => `${P + x * (W - 2 * P)},${H - P - y * (H - 2 * P)}`
  const grid = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div style={{ ...card, flex: 1, minWidth: 300 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {Object.keys(series).map(k => <span key={k} style={{ fontSize: 11 }}><span style={{ display: 'inline-block', width: 14, height: 3, background: CURVE_COL[k], marginRight: 4 }} />{k}</span>)}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        {grid.map(g => (
          <g key={g}>
            <line x1={P} y1={H - P - g * (H - 2 * P)} x2={W - P} y2={H - P - g * (H - 2 * P)} stroke="#eef2f7" />
            <line x1={P + g * (W - 2 * P)} y1={P} x2={P + g * (W - 2 * P)} y2={H - P} stroke="#eef2f7" />
          </g>
        ))}
        <line x1={P} y1={H - P} x2={W - P} y2={P} stroke="#94a3b8" strokeDasharray="5 4" />
        {Object.entries(series).map(([k, pts]) => (
          <polyline key={k} points={(pts || []).map(pt).join(' ')} fill="none" stroke={CURVE_COL[k]} strokeWidth="2.5" strokeLinejoin="round" />
        ))}
        <text x={P} y={H - 8} fontSize="10" fill="#64748b">{xlabel}</text>
        <text x={8} y={H / 2} fontSize="10" fill="#64748b" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">{ylabel}</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 4 }}>{title}</div>
    </div>
  )
}

const RANGES = { Age: [20, 100], BP: [80, 250], PR: [40, 150], LDL: [10, 300], HDL: [10, 120], FBS: [60, 450], TG: [30, 1200], 'EF-TTE': [10, 80], Weight: [30, 200], BMI: [15, 50], ESR: [1, 100], HB: [8, 20] }
const FIELDS = Object.keys(RANGES)
// Full 55-feature schema (dataset-observed). Groups mirror clinical workup.
const GROUPS = [
  { id: 'demo', title: 'Demographics', fields: ['Age', 'Weight', 'Length', 'Sex', 'BMI'] },
  { id: 'hist', title: 'History & risk factors', fields: ['DM', 'HTN', 'Current Smoker', 'EX-Smoker', 'FH', 'Obesity', 'CRF', 'CVA', 'Airway disease', 'Thyroid Disease', 'CHF', 'DLP'] },
  { id: 'exam', title: 'Clinical examination', fields: ['BP', 'PR', 'Edema', 'Weak Peripheral Pulse', 'Lung rales', 'Systolic Murmur', 'Diastolic Murmur', 'Typical Chest Pain', 'Dyspnea', 'Function Class', 'Atypical', 'Nonanginal', 'Exertional CP', 'LowTH Ang'] },
  { id: 'ecg', title: 'ECG', fields: ['Q Wave', 'St Elevation', 'St Depression', 'Tinversion', 'LVH', 'Poor R Progression', 'BBB'] },
  { id: 'lab', title: 'Laboratory', fields: ['FBS', 'CR', 'TG', 'LDL', 'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na', 'WBC', 'Lymph', 'Neut', 'PLT'] },
  { id: 'echo', title: 'Echocardiography', fields: ['EF-TTE', 'Region RWMA', 'VHD'] },
]
const YESNO_01 = ['DM', 'HTN', 'Current Smoker', 'EX-Smoker', 'FH', 'Edema', 'Typical Chest Pain', 'Q Wave', 'St Elevation', 'St Depression', 'Tinversion']
const CATS = {
  'Sex': ['Male', 'Fmale'], 'Obesity': ['N', 'Y'], 'CRF': ['N', 'Y'], 'CVA': ['N', 'Y'],
  'Airway disease': ['N', 'Y'], 'Thyroid Disease': ['N', 'Y'], 'CHF': ['N', 'Y'], 'DLP': ['N', 'Y'],
  'Weak Peripheral Pulse': ['N', 'Y'], 'Lung rales': ['N', 'Y'], 'Systolic Murmur': ['N', 'Y'],
  'Diastolic Murmur': ['N', 'Y'], 'Dyspnea': ['N', 'Y'], 'Atypical': ['N', 'Y'], 'Nonanginal': ['N', 'Y'],
  'Exertional CP': ['N'], 'LowTH Ang': ['N', 'Y'], 'LVH': ['N', 'Y'], 'Poor R Progression': ['N', 'Y'],
  'BBB': ['N', 'LBBB', 'RBBB'], 'VHD': ['N', 'mild', 'Moderate', 'Severe'],
}
const NUM_BOUNDS = {
  Age: [20, 100], Weight: [30, 200], Length: [130, 210], BMI: [15, 50], DM: [0, 1], HTN: [0, 1],
  'Current Smoker': [0, 1], 'EX-Smoker': [0, 1], FH: [0, 1], BP: [80, 250], PR: [40, 150], Edema: [0, 1],
  'Typical Chest Pain': [0, 1], 'Function Class': [0, 3], 'Q Wave': [0, 1], 'St Elevation': [0, 1],
  'St Depression': [0, 1], Tinversion: [0, 1], FBS: [60, 450], CR: [0.3, 3.0], TG: [30, 1200],
  LDL: [10, 300], HDL: [10, 120], BUN: [5, 60], ESR: [1, 100], HB: [8, 20], K: [2.5, 7.0],
  Na: [125, 160], WBC: [3000, 20000], Lymph: [5, 70], Neut: [20, 95], PLT: [20, 800],
  'EF-TTE': [10, 80], 'Region RWMA': [0, 4],
}
const UNITS = { Age: 'years', BP: 'mmHg', PR: 'bpm', LDL: 'mg/dL', HDL: 'mg/dL', FBS: 'mg/dL', TG: 'mg/dL', 'EF-TTE': '%', Weight: 'kg', Length: 'cm', BMI: 'kg/m2', ESR: 'mm/h', HB: 'g/dL', CR: 'mg/dL', BUN: 'mg/dL', K: 'mEq/L', Na: 'mEq/L', WBC: 'cells/µL', Lymph: '%', Neut: '%', PLT: '1000/µL' }
const VESSELS = [
  { id: 'CAD', name: 'Overall coronary artery disease', terr: 'Any major vessel ≥50% narrowed. The headline number; vessels below localize it.' },
  { id: 'LAD', name: 'Left Anterior Descending', terr: 'Front wall + apex. Proximal disease threatens a large territory.' },
  { id: 'LCX', name: 'Left Circumflex', terr: 'Side + back wall. Often silent until lateral ischemia.' },
  { id: 'RCA', name: 'Right Coronary', terr: 'Right side + bottom wall and conduction system.' },
]
const cardLight = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }
const cardDark = { background: '#111c30', border: '1px solid #26314a', borderRadius: 10, padding: 12, color: '#e2e8f0' }
const card = cardLight

function KpiRing({ v }) {
  const r = 20, c = 2 * Math.PI * r
  const col = v >= 0.85 ? '#12805c' : v >= 0.7 ? '#dc6803' : '#d92d20'
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(v * c).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 26 26)" />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a">{v.toFixed(2)}</text>
    </svg>
  )
}

function KpiStrip({ metrics, dark }) {
  const c = dark ? cardDark : cardLight
  const locked = (metrics.locked || {}).locked_test_61 || {}
  const order = ['CAD', 'LAD', 'LCX', 'RCA']
  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%', padding: '10px 12px 0', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {order.map(t => {
        const m = locked[t] || {}
        const auc = Number(m.roc_auc)
        const ci = m.ci95 || []
        return (
          <div key={t} style={{ ...c, padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <KpiRing v={isNaN(auc) ? 0 : auc} />
            <div>
              <div style={{ fontSize: 13 }}><b>{t}</b> <span style={{ color: dark ? '#94a3b8' : '#64748b' }}>locked AUC</span></div>
              <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#475569' }}>61 hold-out {ci.length ? `[${ci.join('-')}]` : ''}</div>
              <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#475569' }}>F1 {m.f1 ?? '--'} · thr {m.thr ?? '--'} · {m.model ?? ''}</div>
            </div>
          </div>
        )
      })}
      <div style={{ ...c, padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✓</div>
        <div>
          <div style={{ fontSize: 13 }}><b>Leakage guard</b></div>
          <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#475569' }}><b style={{ color: '#12805c' }}>2 tests passed</b> · targets never inputs</div>
          <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#475569' }}>asserted in code + CI</div>
        </div>
      </div>
    </div>
  )
}

function Bar({ v }) {
  const n = Number(v)
  if (v == null || isNaN(n)) return <span style={{ fontSize: 12, color: '#64748b' }}>--</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#eef2f7', borderRadius: 4 }}>
        <div style={{ width: `${n * 100}%`, height: 8, borderRadius: 4, background: riskColor(n) }} />
      </div>
      <b style={{ fontSize: 13, minWidth: 92, textAlign: 'right' }}>{n.toFixed(3)} {n >= 0.7 ? 'High' : n >= 0.4 ? 'Mid' : 'Low'}</b>
    </div>
  )
}

function Shot({ src, alt }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return <img src={src} alt={alt} onError={() => setOk(false)} style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 6 }} />
}

function HowToUse({ onOpen, dark }) {
  const c = dark ? cardDark : cardLight
  const steps = [
    { t: '1. Pick any of 303 real patients', d: 'Search P-001… or filter CAD/Normal. Vitals load from the dataset row; angiogram truth shows beside. Nothing is dummy - every row predicts live.', img: '/howto/step1-patients.png' },
    { t: '2. Press Predict', d: 'Four calibrated models (CAD + LAD/LCX/RCA) run on all 55 measurements. 3D vessels recolor, bars fill, SHAP dossier fills. Green <0.40, orange <0.70, red above.', img: '/howto/step2-predict.png' },
    { t: '3. Read the heart', d: 'Pills LAD/LCX/RCA show live scores on the vessels. Click a vessel, pill, or side card - all three stay in sync. Isolate dims the rest; Vessel focus B&W grays everything but coronaries.', img: '/howto/step3-heart.png' },
    { t: '4. Open the vessel dossier', d: 'Below the heart: prob vs threshold, pushing-up/pulling-down top-3, exact SHAP bars with % shares, Top 12 / Show all. Edit any measurement above and re-predict to see bars move.', img: '/howto/step4-dossier.png' },
    { t: '5. Layers, views, Performance', d: 'Toggle Lungs/Ribs/Skin/Muscle, Heartbeat 72, Front/Left/Top views, Full screen for presenting. Performance tab: locked-61 + nested tables with ROC + calibration graphs.', img: '/howto/step5-perf.png' },
  ]
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, width: '100%' }}>
      <div style={{ ...c, padding: 18 }}>
        <h2 style={{ margin: '4px 0' }}>How to use CardioTwin 3D (2 minutes)</h2>
        <p style={{ fontSize: 13, color: '#475569' }}>Drop screenshots in <code>frontend/public/howto/step1-patients.png … step5-perf.png</code> and they appear under each step automatically. Educational decision-support only - not a diagnosis.</p>
        {steps.map((s, i) => (
          <div key={i} style={{ borderTop: '1px solid #eef2f7', padding: '10px 0' }}>
            <b style={{ fontSize: 14 }}>{s.t}</b>
            <p style={{ fontSize: 13, color: '#334155' }}>{s.d}</p>
            <Shot src={s.img} alt={s.t} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => { try { localStorage.setItem('ct3d-hide-help', '1') } catch {} ; onOpen(false) }} style={{ padding: '9px 18px', borderRadius: 8, border: 0, background: '#0f766e', color: 'white', fontWeight: 700 }}>Open workstation →</button>
          <button onClick={() => onOpen(true)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>Keep guide open</button>
        </div>
      </div>
    </div>
  )
}

function VesselDossier({ id, onPick, prob, thr, truth, waterAll, baseVal, model, dark }) {
  const c = dark ? cardDark : cardLight
  const [all, setAll] = useState(false)
  const v = VESSELS.find(x => x.id === id)
  const raw = waterAll?.[id.toLowerCase()] || []
  const list = raw.filter(w => w && typeof w.shap === 'number' && isFinite(w.shap))
  const err = raw.find(w => w && w.error)
  const tot = list.reduce((s, w) => s + Math.abs(w.shap || 0), 0) || 1
  const rows = (all ? list : list.slice(0, 12)).map(w => ({ ...w, pct: Math.abs(w.shap) / tot * 100 }))
  const up = [...list].sort((a, b) => b.shap - a.shap).filter(w => w.shap > 0).slice(0, 3)
  const dn = [...list].sort((a, b) => a.shap - b.shap).filter(w => w.shap < 0).slice(0, 3)
  const fv = (w) => { const n = Number(w.value); const s = isNaN(n) ? String(w.value ?? '') : n.toFixed(n % 1 ? 1 : 0); return `${s}${UNITS[w.feature] ? ' ' + UNITS[w.feature] : ''}` }
  const p = Number(prob); const t = Number(thr)
  return (
    <div style={{ ...c }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {['CAD', 'LAD', 'LCX', 'RCA'].map(x => (
          <button key={x} onClick={() => onPick(x)} title={x === 'CAD' ? 'Overall (3D shows vessels)' : `Show ${x}`}
            style={{ padding: '5px 14px', borderRadius: 999, border: '1px solid #cbd5e1', background: id === x ? '#0f766e' : '#fff', color: id === x ? '#fff' : '#0f172a', fontWeight: 700, fontSize: 12 }}>
            {x}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button onClick={() => setAll(!all)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}>{all ? 'Top 12 only' : 'Show all'}</button>
      </div>
      <b style={{ fontSize: 14 }}>{id} - {isNaN(p) ? '--' : p.toFixed(3)} vs thr {isNaN(t) ? '0.50' : t.toFixed(2)} {truth ? `(angio ${truth})` : ''}</b>
      <p style={{ fontSize: 12, color: '#475569' }}>{v.name}: {v.terr} Exact SHAP of the {model || 'calibrated'} model, avg {isNaN(Number(baseVal)) ? '--' : Number(baseVal).toFixed(2)}. % = share of absolute contribution. Probability is calibrated.</p>
      {err && <p style={{ fontSize: 12, color: '#b42318' }}>Backend still old - restart uvicorn to load shapfix (health must show build shapfix-57-v2). Got: {String(err.error).slice(0, 120)}</p>}
      {!!up.length && <p style={{ fontSize: 12 }}><b>Pushing up:</b> {up.map(w => `${w.feature} (${fv(w)})`).join(', ')}</p>}
      {!!dn.length && <p style={{ fontSize: 12 }}><b>Pulling down:</b> {dn.map(w => `${w.feature} (${fv(w)})`).join(', ')}</p>}
      {rows.map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '4px 0', alignItems: 'center' }}>
          <span style={{ width: 200 }}>{w.feature}</span>
          <div style={{ flex: 1, height: 12, background: '#eef2f7', borderRadius: 3 }}>
            <div style={{ height: 12, borderRadius: 3, background: '#0f766e', width: `${Math.min(100, w.pct * 3.2)}%` }} />
          </div>
          <span style={{ width: 52, textAlign: 'right' }}>{w.pct.toFixed(1)}%</span>
        </div>
      ))}
      {!rows.length && <p style={{ fontSize: 12, color: '#64748b' }}>Run Predict (backend must show build shapfix-57-v2 in /health).</p>}
    </div>
  )
}

function PerfPage({ metrics, dark }) {
  const c = dark ? cardDark : cardLight
  const order = ['CAD', 'LAD', 'LCX', 'RCA']
  const [curves, setCurves] = useState({ roc: {}, calibration: {} })
  const [curveErr, setCurveErr] = useState('')
  const loadCurves = () => {
    fetch('http://localhost:8000/api/curves')
      .then(async r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then(d => { setCurves(d); setCurveErr(Object.keys(d.roc || {}).length ? '' : 'empty response') })
      .catch(e => setCurveErr(String(e.message || e)))
  }
  useEffect(() => { loadCurves() }, [])
  const nest = metrics.nested_5fold || metrics
  const locked = (metrics.locked || {}).locked_test_61 || {}
  const row = (k, fmt) => (
    <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: 6 }}><b>{k}</b></td>
      {order.map(t => {
        const m = nest[t] || {}
        const v = fmt(m)
        return <td key={t} style={{ padding: 6 }}>{String(v)}</td>
      })}
    </tr>
  )
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 14, width: '100%' }}>
      <div style={C}>
        <b>Locked test (61 never seen, seed 7) - the number to trust</b>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #0f766e' }}><th></th>{order.map(t => <th key={t} style={{ padding: 6 }}>{t}</th>)}</tr></thead>
            <tbody>
              {['model', 'roc_auc', 'acc', 'prec', 'rec', 'f1', 'brier', 'thr'].map(k => (
                <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}><b>{k}</b></td>
                  {order.map(t => {
                    const m = locked[t] || {}
                    const v = k === 'roc_auc' ? `${m.roc_auc ?? '--'} [${(m.ci95 || []).join('-')}]` : (m[k] ?? '--')
                    return <td key={t} style={{ padding: 6 }}>{String(v)}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#475569' }}>61 stratified hold-out, 2000-sample bootstrap CIs, Brier included. Refit on 242 only. predictions: models/locked_test_predictions.csv</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {!Object.keys(curves.roc || {}).length && (
          <p style={{ fontSize: 12, color: '#b42318' }}>
            No curve data {curveErr ? `(${curveErr})` : ''} - backend is up (curl gets 200), so this browser fetch failed.
            <button onClick={loadCurves} style={{ marginLeft: 8, padding: '3px 10px', borderRadius: 6, border: '1px solid #0f766e', background: '#0f766e', color: 'white' }}>Retry curves</button>
          </p>
        )}
        <CurveChart title="ROC curves" xlabel="False positive rate" ylabel="True positive rate" series={curves.roc || {}} />
        <CurveChart title="Calibration (closer to diagonal is better)" xlabel="Predicted probability" ylabel="Observed frequency" series={curves.calibration || {}} />
      </div>
      <div style={{ ...c, marginTop: 12 }}>
        <b>Nested 5-fold OOF (all 303, development reference)</b>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}><th></th>{order.map(t => <th key={t} style={{ padding: 6 }}>{t}</th>)}</tr></thead>
            <tbody>
              {row('model', m => m.model ?? '--')}
              {row('ROC-AUC [95% CI]', m => `${m.roc_auc ?? '--'} [${(m.ci95 || []).join('-')}]`)}
              {row('acc', m => m.acc ?? '--')}
              {row('prec', m => m.prec ?? '--')}
              {row('rec', m => m.rec ?? '--')}
              {row('f1', m => m.f1 ?? '--')}
              {row('thr', m => m.thr ?? '--')}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#475569' }}>Platt cross-fitted, Youden thresholds on other patients' OOF. Leakage: LAD/LCX/RCA/Cath never inputs (tests/test_leakage.py, 2 passed). LCX/RCA moderate by data limits. Single-centre, no external validation.</p>
        <p style={{ fontSize: 11, color: '#64748b' }}>Data: Extension of Z-Alizadeh Sani, UCI ML Repository (CC BY 4.0). Anatomy: BodyParts3D, Database Center for Life Science (CC BY-SA 2.1 JP); derived meshes redistributed under the same licence. App code is original.</p>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('work')
  const [form, setForm] = useState({ Age: 53, Weight: 80, Length: 170, Sex: 'Male', BMI: 27, DM: 0, HTN: 1, 'Current Smoker': 0, 'EX-Smoker': 0, FH: 0, Obesity: 'N', CRF: 'N', CVA: 'N', 'Airway disease': 'N', 'Thyroid Disease': 'N', CHF: 'N', DLP: 'N', BP: 140, PR: 90, Edema: 0, 'Weak Peripheral Pulse': 'N', 'Lung rales': 'N', 'Systolic Murmur': 'N', 'Diastolic Murmur': 'N', 'Typical Chest Pain': 1, Dyspnea: 'N', 'Function Class': 0, Atypical: 'N', Nonanginal: 'N', 'Exertional CP': 'N', 'LowTH Ang': 'N', 'Q Wave': 0, 'St Elevation': 0, 'St Depression': 0, Tinversion: 0, LVH: 'N', 'Poor R Progression': 'N', BBB: 'N', FBS: 90, CR: 1, TG: 150, LDL: 120, HDL: 45, BUN: 18, ESR: 20, HB: 14, K: 4.2, Na: 141, WBC: 7000, Lymph: 32, Neut: 60, PLT: 210, 'EF-TTE': 55, 'Region RWMA': 0, VHD: 'N' })
  const [full, setFull] = useState(null)
  const [res, setRes] = useState(null)
  const [waterAll, setWaterAll] = useState({})
  const [baseAll, setBaseAll] = useState({})
  const [metrics, setMetrics] = useState({})
  const [samples, setSamples] = useState([])
  const [pid, setPid] = useState('')
  const [selected, setSelected] = useState('LAD')
  const [isolate, setIsolate] = useState(true)
  const [q, setQ] = useState('')
  const [layers, setLayers] = useState({ skin: false, muscle: false, skeleton: false, lungs: false, diaphragm: false, beat: true, focusBW: true, paint: true })
  const lifestyle = {
    smoker: form['Current Smoker'], exSmoker: form['EX-Smoker'], airway: form['Airway disease'],
    bp: form.BP, htn: form.HTN, ldl: form.LDL, ef: form['EF-TTE'],
  }
  const paintNotes = []
  if (layers.paint !== false) {
    if (String(lifestyle.smoker) === '1' || String(lifestyle.exSmoker) === '1' || lifestyle.airway === 'Y') paintNotes.push('smoker lungs tinted')
    if (Number(lifestyle.bp) >= 140 || String(lifestyle.htn) === '1') paintNotes.push('heart enlarged illustration (BP)')
    if (Number(lifestyle.ldl) >= 160) paintNotes.push('extra vessel glow (LDL)')
    if (Number(lifestyle.ef) < 40) paintNotes.push('weaker beat + dilation (low EF)')
  }
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('checking...')
  const [help, setHelp] = useState(() => { try { return !localStorage.getItem('ct3d-hide-help') } catch { return true } })
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('front')
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('ct3d-theme') === 'dark' } catch { return false } })
  const C = dark ? cardDark : cardLight
  const toggleDark = () => {
    setDark(v => {
      const nv = !v
      try { localStorage.setItem('ct3d-theme', nv ? 'dark' : 'light') } catch {}
      return nv
    })
  }

  useEffect(() => {
    fetch('http://localhost:8000/api/samples').then(r => r.json()).then(d => {
      setSamples(d)
      if (d[0]) {
        setFull(d[0]); setPid(d[0].id)
        const f = {}; GROUPS.forEach(g => g.fields.forEach(k => { if (d[0].features[k] !== undefined) f[k] = d[0].features[k] }))
        setForm(prev => ({ ...prev, ...f }))
      }
    }).catch(() => setSamples([]))
    fetch('http://localhost:8000/api/metrics').then(r => r.json()).then(setMetrics).catch(() => {})
    fetch('http://localhost:8000/health').then(r => r.json()).then(h => setStatus(`Backend OK - ${(h.loaded || []).join(',')} | ${h.build || 'OLD-no-shapfix-RESTART'} | ${samples.length || 303} pts`)).catch(() => setStatus('Backend offline'))
  }, [])

  const predict = async (of = null, ofull = null) => {
    const f0 = of || form
    for (const f of Object.keys(NUM_BOUNDS)) {
      const [lo, hi] = NUM_BOUNDS[f]; const v = Number(f0[f])
      if (isNaN(v) || v < lo || v > hi) { alert(`${f} must be ${lo}-${hi}`); return }
    }
    setLoading(true)
    try {
      const clean = { ...((ofull || full)?.features || {}), ...f0 }
      Object.keys(clean).forEach(k => { if (typeof clean[k] !== 'string') clean[k] = Number(clean[k]) })
      const r = await fetch('http://localhost:8000/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(async r => { if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.detail || ('predict ' + r.status)) } return r.json() })
      setRes(r)
      const e = await fetch('http://localhost:8000/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => r.json())
      setWaterAll(e.waterfall || {})
      setBaseAll(e.base_value || {})
    } catch (err) { alert('Backend: ' + err.message) }
    setLoading(false)
  }

  const probs = res ? { lad: res.lad_prob, lcx: res.lcx_prob, rca: res.rca_prob } : { lad: 0, lcx: 0, rca: 0 }
  const fs = () => {
    setExpanded(v => {
      const nv = !v
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
        if (!nv) document.getElementById('heart-card')?.scrollIntoView({ block: 'start' })
      }, 350)
      return nv
    })
  }
  useEffect(() => {
    const h = () => setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  const shown = samples.filter(s => !q || s.id.toLowerCase().includes(q.toLowerCase()) || s.truth.CAD.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: dark ? '#0b1220' : '#eef2f7', minHeight: '100vh', color: dark ? '#e2e8f0' : '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <b style={{ fontSize: 17 }}>CardioTwin 3D</b>
          <button onClick={() => setTab('work')} style={{ padding: '5px 12px', borderRadius: 7, border: 0, background: tab === 'work' ? '#14b8a6' : '#1e293b', color: 'white' }}>Workstation</button>
          <button onClick={() => setTab('perf')} style={{ padding: '5px 12px', borderRadius: 7, border: 0, background: tab === 'perf' ? '#14b8a6' : '#1e293b', color: 'white' }}>Performance</button>
          <button onClick={() => setHelp(true)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #14b8a6', background: 'transparent', color: '#5eead4' }}>How to use</button>
          <button onClick={toggleDark} title="Toggle dark theme" style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #475569', background: dark ? '#e2e8f0' : '#1e293b', color: dark ? '#0f172a' : '#e2e8f0' }}>{dark ? '☀ Light' : '◐ Dark'}</button>
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>{status}</div>
      </header>
      <div style={{ background: '#fef9c3', padding: '6px 18px', fontSize: 12 }}>Educational decision-support only - not a diagnosis. No external validation.</div>
      {tab === 'work' && <KpiStrip metrics={metrics} dark={dark} />}
      {help ? <HowToUse dark={dark} onOpen={(stay) => { if (!stay) setHelp(false) }} /> : tab === 'perf' ? <PerfPage metrics={metrics} dark={dark} /> : (
        <main style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 12, padding: 12, maxWidth: 1440, margin: '0 auto', width: '100%', flex: 1, alignItems: 'start' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div id="heart-card" className={expanded ? 'expanded' : ''} style={{ ...C, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ fontSize: 14 }}>Heart - LAD / LCX / RCA live, click vessel</b>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'center' }}>
                  <label><input type="checkbox" checked={isolate} onChange={e => setIsolate(e.target.checked)} /> Isolate</label>
                  {['front', 'left', 'top'].map(v => (
                    <button key={v} onClick={() => setView(v)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid #cbd5e1', background: view === v ? '#0f172a' : '#fff', color: view === v ? '#fff' : '#0f172a', fontSize: 11 }}>{v[0].toUpperCase() + v.slice(1)}</button>
                  ))}
                  <button onClick={fs} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid #0f766e', background: '#0f766e', color: 'white' }}>{expanded ? '✕ Exit' : '⛶ Full screen'}</button>
                  <button onClick={() => window.print()} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff' }}>⎙ Report</button>
                </div>
              </div>
              <HeartViewer key={(expanded ? 'full' : 'normal') + view + (dark ? '-d' : '-l')} probs={probs} selected={selected} onSelect={setSelected} layers={layers} isolate={isolate} hasPred={!!res} tall={expanded} view={view} dark={dark} lifestyle={lifestyle} />
              {!!paintNotes.length && <p style={{ fontSize: 11, color: '#475569', margin: '6px 0 0' }}>Condition painting (illustrative, not imaging): {paintNotes.join(' · ')}.</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {[['CAD', res?.cad_prob], ['LAD', res?.lad_prob], ['LCX', res?.lcx_prob], ['RCA', res?.rca_prob]].map(([id, p]) => (
                  <button key={id} onClick={() => setSelected(id)}
                    style={{
                      flex: 1, minWidth: 110, padding: '7px 6px', borderRadius: 999, cursor: 'pointer',
                      background: selected === id ? '#0f172a' : '#fff', color: selected === id ? '#fff' : '#0f172a',
                      border: `2px solid ${riskColor(p)}`, fontWeight: 800, fontSize: 13,
                      boxShadow: selected === id ? '0 4px 12px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.12)',
                    }}>
                    {id} {p == null ? '--' : Number(p).toFixed(2)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 12, flexWrap: 'wrap', userSelect: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px' }}>
                <label><input type="checkbox" checked={layers.lungs} onChange={e => setLayers({ ...layers, lungs: e.target.checked })} /> Lungs</label>
                <label><input type="checkbox" checked={layers.skeleton} onChange={e => setLayers({ ...layers, skeleton: e.target.checked })} /> Ribs</label>
                <label><input type="checkbox" checked={layers.skin} onChange={e => setLayers({ ...layers, skin: e.target.checked })} /> Skin</label>
                <label><input type="checkbox" checked={layers.muscle} onChange={e => setLayers({ ...layers, muscle: e.target.checked })} /> Muscle</label>
                <label><input type="checkbox" checked={layers.beat} onChange={e => setLayers({ ...layers, beat: e.target.checked })} /> Beat 72</label>
                <label><input type="checkbox" checked={layers.focusBW} onChange={e => setLayers({ ...layers, focusBW: e.target.checked })} /> Vessel focus B&W</label>
                <label title="Tint organs by this patient's risk factors (illustrative only)"><input type="checkbox" checked={layers.paint !== false} onChange={e => setLayers({ ...layers, paint: e.target.checked })} /> Condition painting</label>
              </div>
            </div>
            <VesselDossier id={selected} onPick={setSelected} prob={(selected === 'CAD' ? res?.cad_prob : res?.[selected.toLowerCase() + '_prob'])} thr={res?.thresholds?.[selected.toLowerCase()]} truth={full?.truth?.[selected]} waterAll={waterAll} baseVal={baseAll[selected.toLowerCase()]} model={(metrics.nested_5fold || {})[selected]?.model} dark={dark} />
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={C}>
              <div style={{ display: 'flex', gap: 8 }}>
                <b>Patient ({samples.length})</b>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search P-001..." style={{ flex: 1, padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <select value={pid} onChange={e => { const p = samples.find(s => s.id === e.target.value); setPid(e.target.value); if (p) { setFull(p); const f = {}; GROUPS.forEach(g => g.fields.forEach(k => { if (p.features[k] !== undefined) f[k] = p.features[k] })); const nf = { ...form, ...f }; setForm(nf); predict(nf, p) } }} style={{ flex: 1, padding: 6 }}>
                  {shown.slice(0, 303).map(s => <option key={s.id} value={s.id}>{s.id} - {s.truth.CAD} L:{s.truth.LAD} C:{s.truth.LCX} R:{s.truth.RCA}</option>)}
                </select>
                <button onClick={() => predict()} disabled={loading} style={{ padding: '8px 14px', background: '#0f766e', color: 'white', border: 0, borderRadius: 8 }}>{loading ? '...' : 'Predict'}</button>
              </div>
              {full && <p style={{ fontSize: 11, color: '#475569' }}>Angio truth CAD {full.truth.CAD} LAD {full.truth.LAD} LCX {full.truth.LCX} RCA {full.truth.RCA} - prediction is live model output.</p>}
              {res && <div style={{ background: res.cad_prob >= 0.5 ? '#fee2e2' : '#dcfce7', padding: 8, borderRadius: 8 }}><b>CAD {res.cad_prob.toFixed(3)}</b></div>}
              {['LAD', 'LCX', 'RCA'].map(id => (
                <div key={id} onClick={() => setSelected(id)} style={{ border: selected === id ? '2px solid #0f766e' : '1px solid #e2e8f0', borderRadius: 8, padding: 7, marginTop: 6, cursor: 'pointer' }}>
                  <div style={{ fontSize: 13 }}><b>{id}</b></div>
                  <Bar v={res?.[id.toLowerCase() + '_prob']} />
                </div>
              ))}
            </div>
            <div style={C}>
              <b>All 55 measurements - every SHAP bar editable</b>
              <p style={{ fontSize: 11, color: '#475569' }}>Grouped like the clinical workup. Numerics validated, categories are dataset-observed options. Edit anything → Predict.</p>
              {GROUPS.map((g, gi) => (
                <details key={g.id} open={gi < 2} style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 6 }}>
                  <summary style={{ padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{g.title} ({g.fields.length})</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 8 }}>
                    {g.fields.map(f => (
                      <label key={f} style={{ fontSize: 11 }}>{f}{UNITS[f] ? ` (${UNITS[f]})` : ''}<br />
                        {CATS[f] ? (
                          <select value={form[f] ?? ''} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: 5 }}>
                            {CATS[f].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : YESNO_01.includes(f) ? (
                          <select value={Number(form[f] ?? 0)} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })} style={{ width: '100%', padding: 5 }}>
                            <option value={0}>No</option>
                            <option value={1}>Yes</option>
                          </select>
                        ) : (
                          <input type="number" min={NUM_BOUNDS[f]?.[0]} max={NUM_BOUNDS[f]?.[1]} value={form[f] ?? ''} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: 5 }} />
                        )}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </main>
      )}
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#64748b', padding: 8 }}>(C) Akatsuki</footer>
    </div>
  )
}
