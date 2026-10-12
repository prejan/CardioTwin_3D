import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class TopGuard extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(e) { return { err: String(e?.message || e) } }
  componentDidCatch(e) { console.error('TOP CRASH', e) }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h2>UI crashed, but data is safe</h2>
          <p>Error: {this.state.err}</p>
          <p>Open DevTools Console (F12) and send the first red line. Click Predict after backend is up.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TopGuard>
      <App />
    </TopGuard>
  </StrictMode>,
)
