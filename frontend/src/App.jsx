import { useState } from 'react'
import HeartViewer from './HeartViewer'

function App() {
  const [risk, setRisk] = useState({ lad: 0.85, lcx: 0.35, rca: 0.15 })
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>CardioTwin 3D - Day1 Smoke</h1>
      <p style={{ background: '#fff3cd', padding: 8 }}>
        Educational / decision-support only - not a substitute for diagnostic imaging.
      </p>
      <HeartViewer lad={risk.lad} lcx={risk.lcx} rca={risk.rca} />
      <div style={{ marginTop: 12 }}>
        <label>LAD {risk.lad} <input type="range" min="0" max="1" step="0.05" value={risk.lad} onChange={e => setRisk({ ...risk, lad: parseFloat(e.target.value) })} /></label><br />
        <label>LCX {risk.lcx} <input type="range" min="0" max="1" step="0.05" value={risk.lcx} onChange={e => setRisk({ ...risk, lcx: parseFloat(e.target.value) })} /></label><br />
        <label>RCA {risk.rca} <input type="range" min="0" max="1" step="0.05" value={risk.rca} onChange={e => setRisk({ ...risk, rca: parseFloat(e.target.value) })} /></label>
      </div>
      <p>Rotate/zoom with mouse. Red 0.7+, Orange 0.4+, Green below.</p>
    </div>
  )
}
export default App
