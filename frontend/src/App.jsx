import { useEffect, useState } from 'react'
import HeartViewer, { riskColor } from './HeartViewer'

const RANGES = { Age: [20, 100], BP: [80, 250], PR: [40, 150], LDL: [50, 300], HDL: [20, 100], FBS: [60, 300], TG: [50, 500], 'EF-TTE': [20, 80], Weight: [30, 200], BMI: [15, 50], ESR: [1, 100], HB: [8, 20] }
const FIELDS = Object.keys(RANGES)
const VESSELS = [
  { id: 'LAD', name: 'Left Anterior Descending', terr: 'Anterior wall + apex' },
  { id: 'LCX', name: 'Left Circumflex', terr: 'Lateral wall' },
  { id: 'RCA', name: 'Right Coronary', terr: 'Inferior wall' },
]
const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }

function Bar({ v }) {
  if (v == null) return <span style={{ fontSize: 12, color: '#64748b' }}>--</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#eef2f7', borderRadius: 4 }}>
        <div style={{ width: `${v * 100}%`, height: 8, borderRadius: 4, background: riskColor(v) }} />
      </div>
      <b style={{ fontSize: 13, minWidth: 92, textAlign: 'right' }}>{v.toFixed(3)} {v >= 0.7 ? 'High' : v >= 0.4 ? 'Mid' : 'Low'}</b>
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState({ Age: 53, BP: 140, PR: 90, LDL: 120, HDL: 45, FBS: 90, TG: 150, 'EF-TTE': 55, Weight: 80, BMI: 27, ESR: 20, HB: 14 })
  const [full, setFull] = useState(null)
  const [res, setRes] = useState(null)
  const [water, setWater] = useState([])
  const [metrics, setMetrics] = useState({})
  const [samples, setSamples] = useState([])
  const [pid, setPid] = useState('')
  const [selected, setSelected] = useState('LAD')
  const [layers, setLayers] = useState({ skin: false, muscle: false, skeleton: false, lungs: false, diaphragm: false, beat: true })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('checking backend...')

  useEffect(() => {
    fetch('http://localhost:8000/api/samples').then(r => r.json()).then(d => {
      setSamples(d)
      if (d[0]) { setFull(d[0]); setPid(d[0].id); const f = {}; FIELDS.forEach(k => { if (d[0].features[k] !== undefined) f[k] = d[0].features[k] }); setForm(p => ({ ...p, ...f })) }
    }).catch(() => setSamples([]))
    fetch('http://localhost:8000/api/metrics').then(r => r.json()).then(setMetrics).catch(() => {})
    fetch('http://localhost:8000/health').then(r => r.json()).then(h => setStatus(`Backend OK - ${(h.loaded || []).join(',')}`)).catch(() => setStatus('Backend offline - uvicorn backend.main:app --port 8000'))
  }, [])

  const predict = async () => {
    for (const f of FIELDS) {
      const [lo, hi] = RANGES[f]; const v = Number(form[f])
      if (isNaN(v) || v < lo || v > hi) { alert(`${f} must be ${lo}-${hi}`); return }
    }
    setLoading(true)
    try {
      const clean = { ...(full?.features || {}), ...form }
      Object.keys(clean).forEach(k => { if (typeof clean[k] !== 'string') clean[k] = Number(clean[k]) })
      const r = await fetch('http://localhost:8000/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => { if (!r.ok) throw new Error('predict ' + r.status); return r.json() })
      setRes(r)
      const e = await fetch('http://localhost:8000/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => r.json())
      setWater(e.waterfall?.cad || [])
    } catch (err) { alert('Backend error: ' + err.message) }
    setLoading(false)
  }

  const probs = res ? { lad: res.lad_prob, lcx: res.lcx_prob, rca: res.rca_prob } : { lad: 0, lcx: 0, rca: 0 }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <div><b>CardioTwin 3D</b><span style={{ marginLeft: 10, fontSize: 12, color: '#cbd5e1' }}>Vessel-level risk - our original workstation</span></div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>{status}</div>
      </header>
      <div style={{ background: '#fef9c3', padding: '8px 20px', fontSize: 12 }}>Educational decision-support only - not a diagnosis. 303 referred patients, no external validation.</div>
      <main style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 14, padding: 14, maxWidth: 1280, margin: '0 auto' }}>
        <section>
          <div style={card}>
            <b>Segmented heart - click a vessel</b>
            <HeartViewer probs={probs} selected={selected} onSelect={setSelected} layers={layers} />
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 13, flexWrap: 'wrap' }}>
              <label><input type="checkbox" checked={layers.lungs} onChange={e => setLayers({ ...layers, lungs: e.target.checked })} /> Lungs & airway</label>
              <label><input type="checkbox" checked={layers.skeleton} onChange={e => setLayers({ ...layers, skeleton: e.target.checked })} /> Rib cage</label>
              <label><input type="checkbox" checked={layers.skin} onChange={e => setLayers({ ...layers, skin: e.target.checked })} /> Skin</label>
              <label><input type="checkbox" checked={layers.muscle} onChange={e => setLayers({ ...layers, muscle: e.target.checked })} /> Muscle</label>
              <label><input type="checkbox" checked={layers.beat} onChange={e => setLayers({ ...layers, beat: e.target.checked })} /> Heartbeat 72bpm</label>
            </div>
          </div>
          <div style={{ ...card, marginTop: 12 }}>
            <b>Why (exact SHAP, probability points)</b>
            {!water.length && <p style={{ fontSize: 12, color: '#64748b' }}>Run Predict.</p>}
            {water.slice(0, 8).map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0' }}>
                <span style={{ width: 170 }}>{w.feature}</span>
                <b style={{ color: w.shap >= 0 ? '#b42318' : '#12805c', width: 70, textAlign: 'right' }}>{w.shap >= 0 ? '+' : ''}{w.shap}</b>
              </div>
            ))}
          </div>
        </section>
        <section>
          <div style={card}>
            <div style={{ display: 'flex', gap: 8 }}>
              <b>Patient</b>
              <select value={pid} onChange={e => { const p = samples.find(s => s.id === e.target.value); setPid(e.target.value); if (p) { setFull(p); const f = {}; FIELDS.forEach(k => { if (p.features[k] !== undefined) f[k] = p.features[k] }); setForm(x => ({ ...x, ...f })) } }} style={{ flex: 1, padding: 6 }}>
                {samples.map(s => <option key={s.id} value={s.id}>{s.id} - {s.truth.CAD}</option>)}
              </select>
              <button onClick={predict} disabled={loading} style={{ padding: '8px 14px', background: '#0f766e', color: 'white', border: 0, borderRadius: 8 }}>{loading ? '...' : 'Predict'}</button>
            </div>
            {full && <p style={{ fontSize: 12, color: '#475569' }}>Truth: CAD {full.truth.CAD} LAD {full.truth.LAD} LCX {full.truth.LCX} RCA {full.truth.RCA}</p>}
            {res && <div style={{ background: res.cad_prob >= 0.5 ? '#fee2e2' : '#dcfce7', padding: 10, borderRadius: 8 }}><b>CAD {res.cad_prob.toFixed(3)}</b></div>}
            {VESSELS.map(v => (
              <div key={v.id} onClick={() => setSelected(v.id)} style={{ border: selected === v.id ? '2px solid #0f766e' : '1px solid #e2e8f0', borderRadius: 8, padding: 8, marginTop: 6, cursor: 'pointer' }}>
                <div style={{ fontSize: 13 }}><b>{v.id}</b> {v.name}</div>
                <Bar v={res?.[v.id.toLowerCase() + '_prob']} />
              </div>
            ))}
          </div>
          <div style={{ ...card, marginTop: 12 }}>
            <b>Vitals</b>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
              {FIELDS.map(f => <label key={f} style={{ fontSize: 11 }}>{f}<br /><input type="number" value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: 5 }} /></label>)}
            </div>
          </div>
          <div style={{ ...card, marginTop: 12 }}>
            <b>Evidence (nested 5-fold)</b>
            {Object.entries(metrics).map(([t, m]) => <div key={t} style={{ fontSize: 12 }}><b>{t}</b> {m.model} AUC {m.roc_auc} [{m.ci95?.join('-')}] F1 {m.f1}</div>)}
          </div>
        </section>
      </main>
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#64748b', padding: 12 }}>BodyParts3D CC BY-SA 2.1 JP (DBCLS) + UCI Sani ext CC BY 4.0. Our original code, no opponent copy.</footer>
    </div>
  )
}
