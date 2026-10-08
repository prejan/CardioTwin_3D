import { useState } from 'react'
import HeartViewer, { riskColor } from './HeartViewer'

const DEFAULTS = { Age: 53, BP: 140, PR: 90, FBS: 90, TG: 150, LDL: 120, HDL: 45, BUN: 18, ESR: 20, HB: 14, K: 4.2, Na: 141, WBC: 7000, 'EF-TTE': 55, Weight: 80, Length: 170, BMI: 27, Sex: 'Male', DM: 'No', HTN: 'Yes', 'Current Smoker': 'No', 'Typical Chest Pain': 'Yes', Dyspnea: 'Yes', 'Q Wave': 'No', 'St Elevation': 'No', Tinversion: 'No', LVH: 'No', 'Region RWMA': 'No', VHD: 'No' }
const FIELDS = ['Age', 'BP', 'PR', 'LDL', 'HDL', 'FBS', 'TG', 'EF-TTE', 'Weight', 'BMI', 'ESR', 'HB']

function Bar({ label, v }) {
  if (v == null) return <div style={{ fontSize: 13 }}><b>{label}</b>: -- click Predict --</div>
  return (
    <div style={{ margin: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <b>{label}</b><span>{v.toFixed(3)} {v >= 0.7 ? '(HIGH)' : v >= 0.4 ? '(MID)' : '(LOW)'}</span>
      </div>
      <div style={{ height: 8, background: '#eee', borderRadius: 4 }}>
        <div style={{ width: `${v * 100}%`, height: 8, borderRadius: 4, background: riskColor(v) }} />
      </div>
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState(DEFAULTS)
  const [res, setRes] = useState(null)
  const [exp, setExp] = useState({})
  const [selected, setSelected] = useState('LAD')
  const [loading, setLoading] = useState(false)
  const [apiOk, setApiOk] = useState('unknown - click Predict to call XGB backend')

  const predict = async () => {
    setLoading(true)
    try {
      const clean = { ...form }
      ;['Age', 'BP', 'PR', 'FBS', 'TG', 'LDL', 'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na', 'WBC', 'EF-TTE', 'Weight', 'Length', 'BMI'].forEach(k => { if (clean[k] !== undefined) clean[k] = Number(clean[k]) })
      const h = await fetch('http://localhost:8000/health').then(r => r.json())
      setApiOk(`backend OK - loaded: ${(h.loaded || []).join(',')} | features: ${h.n_features}`)
      const r = await fetch('http://localhost:8000/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => r.json())
      console.log('XGB predict raw:', r)
      setRes(r)
      const e = await fetch('http://localhost:8000/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => r.json())
      setExp(e.top_global || {})
    } catch (err) {
      setApiOk('backend NOT reachable - start: uvicorn backend.main:app --reload --port 8000')
      alert('Start backend first: uvicorn backend.main:app --reload --port 8000. ' + err)
    }
    setLoading(false)
  }

  const vesselInfo = {
    LAD: 'Left Anterior Descending - front wall.',
    LCX: 'Left Circumflex - lateral wall.',
    RCA: 'Right Coronary Artery - inferior wall.',
  }
  const probs = res ? { lad: res.lad_prob, lcx: res.lcx_prob, rca: res.rca_prob } : { lad: 0, lcx: 0, rca: 0 }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      <h1>CardioTwin 3D v2 - XGB Live</h1>
      <p style={{ background: '#fff3cd', padding: 8, borderRadius: 4 }}>
        Educational only - not diagnostic. ML: XGB calibrated (models/cad.pkl etc) on UCI 303. No hardcoding - 3D colors come from /predict.
      </p>
      <p style={{ fontSize: 12, background: '#eef', padding: 6 }}>API status: {apiOk}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div>
          <HeartViewer probs={probs} selected={selected} onSelect={setSelected} />
          <p style={{ fontSize: 13 }}>Click vessel. Red 0.7+, Orange 0.4+, Green below.</p>
          <div style={{ background: '#f6f8ff', padding: 10, borderRadius: 6, fontSize: 13 }}>
            <b>{selected}</b>: {vesselInfo[selected]} Prob: <b>{res ? res[selected.toLowerCase() + '_prob'].toFixed(3) : '-- press Predict --'}</b>
          </div>
        </div>
        <div>
          {!res && <div style={{ background: '#eee', padding: 10, borderRadius: 6 }}><b>No prediction yet.</b> Change inputs, click Predict to run XGB models.</div>}
          {res && (
            <div style={{ background: res.cad_prob >= 0.5 ? '#fde2e2' : '#dff5e1', padding: 10, borderRadius: 6 }}>
              <b>CAD: {res.cad_prob.toFixed(3)} - {res.cad_prob >= 0.5 ? 'CAD likely' : 'Normal likely'}</b> (from models/cad.pkl)
            </div>
          )}
          <Bar label="LAD (models/lad.pkl)" v={res?.lad_prob} /><Bar label="LCX (models/lcx.pkl)" v={res?.lcx_prob} /><Bar label="RCA (models/rca.pkl)" v={res?.rca_prob} />
          <h3>Patient inputs (try Age 35 vs 65 - result MUST change if ML real)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {FIELDS.map(f => (
              <label key={f} style={{ fontSize: 12 }}>{f}<br />
                <input style={{ width: '100%' }} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </label>
            ))}
          </div>
          <button onClick={predict} disabled={loading} style={{ marginTop: 10, padding: '8px 16px', background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6 }}>
            {loading ? 'Running XGB...' : 'Run XGB Predict + Update 3D'}
          </button>
          {Object.keys(exp).length > 0 && (
            <div style={{ fontSize: 12 }}>
              <h4>Top CAD drivers (from backend /explain)</h4>
              {Object.entries(exp).slice(0, 8).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
