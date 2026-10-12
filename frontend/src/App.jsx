import { useEffect, useState } from 'react'
import HeartViewer, { riskColor } from './HeartViewer'

const RANGES = { Age: [20, 100], BP: [80, 250], PR: [40, 150], LDL: [10, 300], HDL: [10, 120], FBS: [60, 450], TG: [30, 1200], 'EF-TTE': [10, 80], Weight: [30, 200], BMI: [15, 50], ESR: [1, 100], HB: [8, 20] }
const FIELDS = Object.keys(RANGES)
const UNITS = { Age: 'years', BP: 'mmHg', PR: 'bpm', LDL: 'mg/dL', HDL: 'mg/dL', FBS: 'mg/dL', TG: 'mg/dL', 'EF-TTE': '%', Weight: 'kg', BMI: 'kg/m2', ESR: 'mm/h', HB: 'g/dL' }
const VESSELS = [
  { id: 'LAD', name: 'Left Anterior Descending', terr: 'Front wall + apex. Proximal disease threatens a large territory.' },
  { id: 'LCX', name: 'Left Circumflex', terr: 'Side + back wall. Often silent until lateral ischemia.' },
  { id: 'RCA', name: 'Right Coronary', terr: 'Right side + bottom wall and conduction system.' },
]
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }

function Bar({ v }) {
  const n = Number(v)
  if (v == null || isNaN(n)) return <span style={{ fontSize: 12, color: '#64748b' }}>--</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#eef2f7', borderRadius: 4 }}>
        <div style={{ width: `${v * 100}%`, height: 8, borderRadius: 4, background: riskColor(v) }} />
      </div>
      <b style={{ fontSize: 13, minWidth: 92, textAlign: 'right' }}>{n.toFixed(3)} {n >= 0.7 ? 'High' : n >= 0.4 ? 'Mid' : 'Low'}</b>
    </div>
  )
}

function VesselDossier({ id, prob, thr, truth, waterAll, baseVal, model }) {
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
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 14 }}>{id} dossier - {isNaN(p) ? '--' : p.toFixed(3)} vs thr {isNaN(t) ? '0.50' : t.toFixed(2)} {truth ? `(angio ${truth})` : ''}</b>
        <button onClick={() => setAll(!all)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}>{all ? 'Top 12' : 'Show all'}</button>
      </div>
      <p style={{ fontSize: 12, color: '#475569' }}>{v.name}: {v.terr} Exact SHAP of the {model || 'calibrated'} model, avg {isNaN(Number(baseVal)) ? '--' : Number(baseVal).toFixed(2)}. % = share of absolute contribution. Probability is calibrated.</p>
      {err && <p style={{ fontSize: 12, color: '#b42318' }}>Explain note: {String(err.error).slice(0, 160)}</p>}
      {!!up.length && <p style={{ fontSize: 12 }}><b>Pushing up:</b> {up.map(w => `${w.feature} (${fv(w)})`).join(', ')}</p>}
      {!!dn.length && <p style={{ fontSize: 12 }}><b>Pulling down:</b> {dn.map(w => `${w.feature} (${fv(w)})`).join(', ')}</p>}
      <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>← lowers</span><span>raises →</span></div>
      {rows.map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
          <span style={{ width: 175 }}>{w.feature} <span style={{ color: '#64748b' }}>{fv(w)}</span></span>
          <div style={{ flex: 1, height: 7, background: '#eef2f7', borderRadius: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#cbd5e1' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 4, background: w.shap >= 0 ? '#d92d20' : '#12805c', left: w.shap >= 0 ? '50%' : `${50 - Math.min(50, w.pct / 2)}%`, width: `${Math.min(50, w.pct / 2)}%` }} />
          </div>
          <b style={{ width: 92, textAlign: 'right', color: w.shap >= 0 ? '#b42318' : '#12805c' }}>{w.shap >= 0 ? '+' : ''}{Number(w.shap).toFixed(4)} ({Number(w.pct).toFixed(1)}%)</b>
        </div>
      ))}
      {!rows.length && <p style={{ fontSize: 12, color: '#64748b' }}>Run Predict.</p>}
    </div>
  )
}

function PerfPage({ metrics }) {
  const order = ['CAD', 'LAD', 'LCX', 'RCA']
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 14, width: '100%' }}>
      <div style={card}>
        <b>Cross-validated performance - 303 patients, out-of-fold predictions only</b>
        <p style={{ fontSize: 12, color: '#475569' }}>Nested stratified 5-fold outer CV + inner selection + Platt cross-fitted. 95% bootstrap intervals. Youden thresholds on other patients' OOF. LAD/LCX/RCA/Cath never inputs.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}><th></th>{order.map(t => <th key={t} style={{ padding: 6 }}>{t}</th>)}</tr></thead>
            <tbody>
              {['model', 'roc_auc', 'acc', 'prec', 'rec', 'f1', 'thr'].map(k => (
                <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}><b>{k === 'roc_auc' ? 'ROC-AUC [95% CI]' : k}</b></td>
                  {order.map(t => {
                    const m = metrics[t] || {}
                    const v = k === 'roc_auc' ? `${m.roc_auc ?? '--'} [${(m.ci95 || []).join('-')}]` : (m[k] ?? '--')
                    return <td key={t} style={{ padding: 6 }}>{String(v)}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#475569' }}>ROC + calibration curves + confusion matrices in the 6-page report. LCX/RCA moderate by data limits, reported honestly. Single-centre, no external validation.</p>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('work')
  const [form, setForm] = useState({ Age: 53, BP: 140, PR: 90, LDL: 120, HDL: 45, FBS: 90, TG: 150, 'EF-TTE': 55, Weight: 80, BMI: 27, ESR: 20, HB: 14 })
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
  const [layers, setLayers] = useState({ skin: false, muscle: false, skeleton: false, lungs: false, diaphragm: false, beat: true, focusBW: true })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch('http://localhost:8000/api/samples').then(r => r.json()).then(d => {
      setSamples(d)
      if (d[0]) {
        setFull(d[0]); setPid(d[0].id)
        const f = {}; Object.keys(RANGES).forEach(k => { if (d[0].features[k] !== undefined) f[k] = d[0].features[k] })
        setForm(prev => ({ ...prev, ...f }))
      }
    }).catch(() => setSamples([]))
    fetch('http://localhost:8000/api/metrics').then(r => r.json()).then(setMetrics).catch(() => {})
    fetch('http://localhost:8000/health').then(r => r.json()).then(h => setStatus(`Backend OK - ${(h.loaded || []).join(',')} | ${samples.length || 303} pts`)).catch(() => setStatus('Backend offline'))
  }, [])

  const predict = async (of = null, ofull = null) => {
    const f0 = of || form
    for (const f of Object.keys(RANGES)) {
      const [lo, hi] = RANGES[f]; const v = Number(f0[f])
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
  const fs = () => { const el = document.getElementById('heart-card'); if (el?.requestFullscreen) el.requestFullscreen() }
  const shown = samples.filter(s => !q || s.id.toLowerCase().includes(q.toLowerCase()) || s.truth.CAD.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: '#eef2f7', minHeight: '100vh', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <b style={{ fontSize: 17 }}>CardioTwin 3D</b>
          <button onClick={() => setTab('work')} style={{ padding: '5px 12px', borderRadius: 7, border: 0, background: tab === 'work' ? '#14b8a6' : '#1e293b', color: 'white' }}>Workstation</button>
          <button onClick={() => setTab('perf')} style={{ padding: '5px 12px', borderRadius: 7, border: 0, background: tab === 'perf' ? '#14b8a6' : '#1e293b', color: 'white' }}>Performance</button>
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>{status}</div>
      </header>
      <div style={{ background: '#fef9c3', padding: '6px 18px', fontSize: 12 }}>Educational decision-support only - not a diagnosis. No external validation.</div>
      {tab === 'perf' ? <PerfPage metrics={metrics} /> : (
        <main style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 12, padding: 12, maxWidth: 1440, margin: '0 auto', width: '100%', flex: 1, alignItems: 'start' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div id="heart-card" style={{ ...card, padding: 10, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ fontSize: 14 }}>Heart - LAD / LCX / RCA live, click vessel</b>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'center' }}>
                  <label><input type="checkbox" checked={isolate} onChange={e => setIsolate(e.target.checked)} /> Isolate</label>
                  <button onClick={fs} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid #0f766e', background: '#0f766e', color: 'white' }}>⛶ Full screen</button>
                </div>
              </div>
              <HeartViewer probs={probs} selected={selected} onSelect={setSelected} layers={layers} isolate={isolate} hasPred={!!res} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
                <label><input type="checkbox" checked={layers.lungs} onChange={e => setLayers({ ...layers, lungs: e.target.checked })} /> Lungs</label>
                <label><input type="checkbox" checked={layers.skeleton} onChange={e => setLayers({ ...layers, skeleton: e.target.checked })} /> Ribs</label>
                <label><input type="checkbox" checked={layers.skin} onChange={e => setLayers({ ...layers, skin: e.target.checked })} /> Skin</label>
                <label><input type="checkbox" checked={layers.muscle} onChange={e => setLayers({ ...layers, muscle: e.target.checked })} /> Muscle</label>
                <label><input type="checkbox" checked={layers.beat} onChange={e => setLayers({ ...layers, beat: e.target.checked })} /> Beat 72</label>
                <label><input type="checkbox" checked={layers.focusBW} onChange={e => setLayers({ ...layers, focusBW: e.target.checked })} /> Vessel focus B&W</label>
              </div>
            </div>
            <VesselDossier id={selected} prob={res?.[selected.toLowerCase() + '_prob']} thr={res?.thresholds?.[selected.toLowerCase()]} truth={full?.truth?.[selected]} waterAll={waterAll} baseVal={baseAll[selected.toLowerCase()]} model={metrics[selected]?.model} />
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={card}>
              <div style={{ display: 'flex', gap: 8 }}>
                <b>Patient ({samples.length})</b>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search P-001..." style={{ flex: 1, padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <select value={pid} onChange={e => { const p = samples.find(s => s.id === e.target.value); setPid(e.target.value); if (p) { setFull(p); const f = {}; Object.keys(RANGES).forEach(k => { if (p.features[k] !== undefined) f[k] = p.features[k] }); const nf = { ...form, ...f }; setForm(nf); predict(nf, p) } }} style={{ flex: 1, padding: 6 }}>
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
            <div style={card}>
              <b>Vitals</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                {Object.keys(RANGES).map(f => <label key={f} style={{ fontSize: 11 }}>{f}<br /><input type="number" value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: 5 }} /></label>)}
              </div>
            </div>
          </section>
        </main>
      )}
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#64748b', padding: 8 }}>BodyParts3D CC BY-SA 2.1 JP + UCI Sani ext CC BY 4.0. Original code.</footer>
    </div>
  )
}
