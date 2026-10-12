import { Suspense, useMemo, useEffect, useRef, Component } from 'react'
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
// Fixed spread around silhouette - never overlap, tuned front view
const SPREAD = { LAD: [-0.1, 1.15, 0.5], LCX: [1.3, 0.3, 0.3], RCA: [-1.3, 0.2, 0.3] }

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

function Pill({ id, prob, selected, onSelect, position }) {
  return (
    <Html position={position} center distanceFactor={6} zIndexRange={[30, 10]} style={{ pointerEvents: 'auto' }}>
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(id) }}
        style={{
          background: selected === id ? '#0f172a' : 'rgba(255,255,255,0.96)', color: selected === id ? 'white' : '#0f172a',
          border: `2px solid ${riskColor(prob)}`, borderRadius: 999, padding: '2px 9px',
          fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transform: selected === id ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {id} {(prob ?? 0).toFixed(2)}
      </button>
    </Html>
  )
}

function Thorax({ probs, selected, onSelect, layers, isolate, hasPred }) {
  const gltf = useLoader(GLTFLoader, '/anatomy/cardiotwin_anatomy.glb', (l) => { try { l.setMeshoptDecoder(MeshoptDecoder) } catch {} })
  const clone = useMemo(() => gltf.scene.clone(true), [gltf])
  useEffect(() => {
    const GRAY = new THREE.Color('#a8b0bc')
    clone.traverse((o) => {
      for (const [k, names] of Object.entries(LAYER_GROUPS)) {
        if (names.includes(o.name)) o.visible = layers[k] !== false
      }
      if (!o.isMesh) return
      const v = vesselOf(o.name || '')
      o.material = o.material.clone()
      if (v) {
        const p = probs[v.toLowerCase()]
        o.material.color = new THREE.Color(riskColor(p))
        o.material.emissive = new THREE.Color(riskColor(p))
        const dimmed = isolate && selected && selected !== v
        o.material.emissiveIntensity = layers.focusBW ? (selected === v ? 0.9 : 0.45) : (selected === v ? 0.65 : 0.2)
        o.material.transparent = !!dimmed
        o.material.opacity = dimmed ? 0.18 : 1
        o.userData.vessel = v
      } else if (layers.focusBW) {
        o.material.color.set('#a8b0bc')
        o.material.emissive = new THREE.Color('#000000')
        o.material.emissiveIntensity = 0
        o.material.roughness = 0.9
        o.material.metalness = 0
        o.material.transparent = false
        o.material.opacity = 1
        o.material.needsUpdate = true
      }
    })
  }, [clone, probs, selected, layers, isolate])
  return (
    <Beating beat={layers.beat}>
      <primitive object={clone} onClick={(e) => { e.stopPropagation(); const v = e.object?.userData?.vessel; if (v) onSelect(v) }} />
      {hasPred && Object.entries(SPREAD).map(([id, pos]) => (
        <Pill key={id} id={id} prob={probs[id.toLowerCase()]} selected={selected} onSelect={onSelect} position={pos} />
      ))}
    </Beating>
  )
}

export default function HeartViewer({ probs, selected, onSelect, layers, isolate, hasPred }) {
  return (
    <Canvas camera={{ position: [0.15, 0.3, 3.4] }} style={{ height: 500, background: 'linear-gradient(180deg,#ffffff,#e9eff6)', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 5, 6]} intensity={1.6} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.6]} />
      <Guard fallback={null}>
        <Suspense fallback={null}>
          <Thorax probs={probs} selected={selected} onSelect={onSelect} layers={layers} isolate={isolate} hasPred={hasPred} />
        </Suspense>
      </Guard>
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={7} />
    </Canvas>
  )
}
export { riskColor, TARGET_NODES }
