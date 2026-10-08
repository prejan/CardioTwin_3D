import { useState } from 'react'
import HeartViewer, { riskColor } from './HeartViewer'

const DEFAULTS = { Age: 53, BP: 140, PR: 90, FBS: 90, TG: 150, LDL: 120, HDL: 45, BUN: 18, ESR: 20, HB: 14, K: 4.2, Na: 141, WBC: 7000, 'EF-TTE': 55, Weight: 80, Length: 170, BMI: 27, Sex: 'Male', DM: 'No', HTN: 'Yes', 'Current Smoker': 'No', 'Typical Chest Pain': 'Yes', Dyspnea: 'Yes', 'Q Wave': 'No', 'St Elevation': 'No', Tinversion: 'No', LVH: 'No', 'Region RWMA': 'No', VHD: 'No' }
const FIELDS = ['Age', 'BP', 'PR', 'LDL', 'HDL', 'FBS', 'TG', 'EF-TTE', 'Weight', 'BMI', 'ESR', 'HB']

function Bar({ label, v }) {
  return (
    <div style={{ margin: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <b>{label}</b><span>{(v ?? 0).toFixed(3)}</span>
      </div>
      <div style={{ height: 8, background: '#eee', borderRadius: 4 }}>
        <div style={{ width: `${(v ?? 0) * 100}%`, height: 8, borderRadius: 4, background: riskColor(v ?? 0) }} />
      </div>
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState(DEFAULTS)
  const [res, setRes] = useState({ cad_prob: 0.81, lad_prob: 0.66, lcx_prob: 0.26, rca_prob: 0.48 })
  const [exp, setExp] = useState({})
  const [selected, setSelected] = useState('LAD')
  const [loading, setLoading] = useState(false)

  const predict = async () => {
    setLoading(true)
    try {
      const clean = { ...form }
      ;['Age', 'BP', 'PR', 'FBS', 'TG', 'LDL', 'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na', 'WBC', 'EF-TTE', 'Weight', 'Length', 'BMI'].forEach(k => { if (clean[k] !== undefined) clean[k] = Number(clean[k]) })
      const r = await fetch('http://localhost:8000/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => r.json())
      setRes(r)
      const e = await fetch('http://localhost:8000/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) }).then(r => r.json())
      setExp(e.top_global || {})
    } catch (err) {
      alert('Start backend first: uvicorn backend.main:app --reload --port 8000. ' + err)
    }
    setLoading(false)
  }

  const vesselInfo = {
    LAD: 'Left Anterior Descending - front wall. High risk = anterior MI risk.',
    LCX: 'Left Circumflex - lateral wall.',
    RCA: 'Right Coronary Artery - inferior wall + conduction.',
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      <h1>CardioTwin 3D v2 - Vessel-Aware Risk</h1>
      <p style={{ background: '#fff3cd', padding: 8, borderRadius: 4 }}>
        Educational / decision-support only - not a substitute for diagnostic imaging. Model: XGB calibrated on UCI 303.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div>
          <HeartViewer probs={{ lad: res.lad_prob, lcx: res.lcx_prob, rca: res.rca_prob }} selected={selected} onSelect={setSelected} />
          <p style={{ fontSize: 13 }}>Click a vessel. Red 0.7+, Orange 0.4+, Green below. Drag to rotate, scroll to zoom.</p>
          <div style={{ background: '#f6f8ff', padding: 10, borderRadius: 6, fontSize: 13 }}>
            <b>{selected}</b>: {vesselInfo[selected]} Prob: <b>{(res[selected.toLowerCase() + '_prob'] ?? 0).toFixed(3)}</b>
          </div>
        </div>
        <div>
          <div style={{ background: res.cad_prob >= 0.5 ? '#fde2e2' : '#dff5e1', padding: 10, borderRadius: 6 }}>
            <b>CAD overall: {(res.cad_prob ?? 0).toFixed(3)} - {(res.cad_prob >= 0.5 ? 'CAD likely' : 'Normal likely')}</b>
          </div>
          <Bar label="LAD" v={res.lad_prob} /><Bar label="LCX" v={res.lcx_prob} /><Bar label="RCA" v={res.rca_prob} />
          <h3>Patient inputs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {FIELDS.map(f => (
              <label key={f} style={{ fontSize: 12 }}>{f}<br />
                <input style={{ width: '100%' }} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
              </label>
            ))}
          </div>
          <button onClick={predict} disabled={loading} style={{ marginTop: 10, padding: '8px 16px', background: '#1d4ed8', color: 'white', border: 0, borderRadius: 6 }}>
            {loading ? 'Predicting...' : 'Predict + Update 3D'}
          </button>
          <p style={{ fontSize: 12, color: '#555' }}>Backend must run: uvicorn backend.main:app --reload --port 8000</p>
          {Object.keys(exp).length > 0 && (
            <div style={{ fontSize: 12 }}>
              <h4>Top CAD drivers (global importance)</h4>
              {Object.entries(exp).slice(0, 8).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
