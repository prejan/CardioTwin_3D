import { Suspense, useMemo, useEffect, useRef, useState, Component } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { MeshoptDecoder } from 'meshopt-decoder'

const TARGET_NODES = {
  LAD: ['Coronary_LAD', 'Coronary_LAD_Septal'],
  LCX: ['Coronary_LCX'],
  RCA: ['Coronary_RCA', 'Coronary_RCA_Marginal', 'Coronary_RCA_PDA', 'Coronary_RCA_PL', 'Coronary_RCA_Septal'],
}
const LAYER_GROUPS = {
  skin: ['Layer_Skin'], muscle: ['Layer_Muscle'], skeleton: ['Layer_Skeleton'],
  lungs: ['Layer_Lungs'], diaphragm: ['Layer_Diaphragm'],
}

function riskColor(p) {
  if (p == null) return '#9aa4b2'
  if (p >= 0.7) return '#d92d20'
  if (p >= 0.4) return '#dc6803'
  return '#12805c'
}

class Guard extends Component {
  constructor(p) { super(p); this.state = { bad: false } }
  static getDerivedStateFromError() { return { bad: true } }
  render() { return this.state.bad ? this.props.fallback : this.props.children }
}

function Beating({ beat, children }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = beat ? 1 + 0.03 * Math.sin(clock.getElapsedTime() * 2 * Math.PI * 72 / 60) : 1
    ref.current.scale.setScalar(s)
  })
  return <group ref={ref}>{children}</group>
}

function vesselOf(name) {
  for (const [v, nodes] of Object.entries(TARGET_NODES)) {
    if (nodes.some(n => name === n || name.startsWith(n))) return v
  }
  return null
}

function Thorax({ probs, selected, onSelect, layers, isolate, hasPred }) {
  const gltf = useLoader(GLTFLoader, '/anatomy/cardiotwin_anatomy.glb', (l) => { try { l.setMeshoptDecoder(MeshoptDecoder) } catch {} })
  const clone = useMemo(() => gltf.scene.clone(true), [gltf])
  const [anchors, setAnchors] = useState({})

  useEffect(() => {
    const boxes = { LAD: [], LCX: [], RCA: [] }
    clone.traverse((o) => {
      for (const [k, names] of Object.entries(LAYER_GROUPS)) {
        if (names.includes(o.name)) o.visible = layers[k] !== false
      }
      if (!o.isMesh) return
      const v = vesselOf(o.name || '')
      if (v) {
        const p = probs[v.toLowerCase()]
        o.material = o.material.clone()
        o.material.color = new THREE.Color(riskColor(p))
        o.material.emissive = new THREE.Color(riskColor(p))
        const dimmed = isolate && selected && selected !== v
        o.material.emissiveIntensity = selected === v ? 0.65 : 0.2
        o.material.transparent = !!dimmed
        o.material.opacity = dimmed ? 0.18 : 1
        o.userData.vessel = v
        o.geometry.computeBoundingBox()
        const c = new THREE.Vector3()
        o.geometry.boundingBox.getCenter(c)
        o.localToWorld(c)
        boxes[v].push(c)
      }
    })
    const avg = {}
    for (const [v, pts] of Object.entries(boxes)) {
      if (!pts.length) continue
      const m = new THREE.Vector3()
      pts.forEach(p => m.add(p))
      m.divideScalar(pts.length)
      // push outward so label sits off the mesh
      m.x *= 1.35; m.y += 0.12
      avg[v] = m.toArray()
    }
    setAnchors(avg)
  }, [clone, probs, selected, layers, isolate])

  return (
    <Beating beat={layers.beat}>
      <primitive object={clone} onClick={(e) => { e.stopPropagation(); const v = e.object?.userData?.vessel; if (v) onSelect(v) }} />
      {hasPred && Object.entries(anchors).map(([id, pos]) => (
        <Html key={id} position={pos} center distanceFactor={5} style={{ pointerEvents: 'auto' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(id) }}
            style={{
              background: selected === id ? '#0f172a' : 'white', color: selected === id ? 'white' : '#0f172a',
              border: `2px solid ${riskColor(probs[id.toLowerCase()])}`, borderRadius: 999, padding: '4px 10px',
              fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(0,0,0,0.22)',
            }}
          >
            {id} {(probs[id.toLowerCase()] ?? 0).toFixed(2)}
          </button>
        </Html>
      ))}
    </Beating>
  )
}

export default function HeartViewer({ probs, selected, onSelect, layers, isolate, hasPred }) {
  return (
    <Canvas camera={{ position: [0.15, 0.3, 3.0] }} style={{ height: 500, background: 'linear-gradient(180deg,#ffffff,#e9eff6)', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 5, 6]} intensity={1.6} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.6]} />
      <Guard fallback={null}>
        <Suspense fallback={null}>
          <Thorax probs={probs} selected={selected} onSelect={onSelect} layers={layers} isolate={isolate} hasPred={hasPred} />
        </Suspense>
      </Guard>
      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={7} />
    </Canvas>
  )
}
export { riskColor, TARGET_NODES }
