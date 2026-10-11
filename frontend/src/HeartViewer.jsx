import { Suspense, useMemo, useEffect, useRef, Component } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
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

function Thorax({ probs, selected, onSelect, layers }) {
  const gltf = useLoader(GLTFLoader, '/anatomy/cardiotwin_anatomy.glb', (l) => { try { l.setMeshoptDecoder(MeshoptDecoder) } catch {} })
  const clone = useMemo(() => gltf.scene.clone(true), [gltf])
  useEffect(() => {
    clone.traverse((o) => {
      for (const [k, names] of Object.entries(LAYER_GROUPS)) {
        if (names.includes(o.name)) o.visible = layers[k] !== false
      }
      if (!o.isMesh) return
      const nm = o.name || ''
      let vessel = null
      for (const [v, nodes] of Object.entries(TARGET_NODES)) {
        if (nodes.some(n => nm === n || nm.startsWith(n))) { vessel = v; break }
      }
      if (vessel) {
        const p = probs[vessel.toLowerCase()]
        o.material = o.material.clone()
        o.material.color = new THREE.Color(riskColor(p))
        o.material.emissive = new THREE.Color(riskColor(p))
        o.material.emissiveIntensity = selected === vessel ? 0.5 : 0.15
        o.userData.vessel = vessel
      }
    })
  }, [clone, probs, selected, layers])
  return (
    <Beating beat={layers.beat}>
      <primitive object={clone} onClick={(e) => { e.stopPropagation(); const v = e.object?.userData?.vessel; if (v) onSelect(v) }} />
    </Beating>
  )
}

export default function HeartViewer({ probs, selected, onSelect, layers }) {
  return (
    <Canvas camera={{ position: [0.5, 0.5, 3.2] }} style={{ height: 480, background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 5, 6]} intensity={1.5} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.55]} />
      <Guard fallback={null}>
        <Suspense fallback={null}>
          <Thorax probs={probs} selected={selected} onSelect={onSelect} layers={layers} />
        </Suspense>
      </Guard>
      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={7} />
    </Canvas>
  )
}
export { riskColor, TARGET_NODES }
