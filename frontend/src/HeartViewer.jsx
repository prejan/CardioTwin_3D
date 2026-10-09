import { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three-stdlib'

function riskColor(p) {
  if (p >= 0.7) return '#e31b23'
  if (p >= 0.4) return '#ff9f1c'
  return '#2ec4b6'
}

function HeartSTL() {
  const geom = useLoader(STLLoader, '/heart.stl')
  const centered = useMemo(() => {
    const g = geom.clone()
    g.computeBoundingBox()
    const c = new THREE.Vector3()
    g.boundingBox.getCenter(c)
    g.translate(-c.x, -c.y, -c.z)
    g.computeVertexNormals()
    return g
  }, [geom])
  return (
    <mesh geometry={centered} scale={0.012} rotation={[-0.2, 0.3, 0]}>
      <meshStandardMaterial color="#8a2532" roughness={0.5} metalness={0.15} />
    </mesh>
  )
}

function Coronary({ points, prob, selected, onClick, name }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), [points])
  return (
    <mesh onClick={(e) => { e.stopPropagation(); onClick(name) }}>
      <tubeGeometry args={[curve, 40, selected ? 0.13 : 0.09, 10, false]} />
      <meshStandardMaterial color={riskColor(prob)} emissive={selected ? riskColor(prob) : 'black'} emissiveIntensity={selected ? 0.5 : 0} roughness={0.3} />
    </mesh>
  )
}

const PATHS = {
  LAD: [[0.05, 1.0, 0.55], [-0.08, 0.45, 1.0], [-0.15, -0.25, 0.92], [-0.1, -0.85, 0.45]],
  LCX: [[0.15, 0.85, 0.6], [0.65, 0.45, 0.75], [0.9, -0.05, 0.45], [0.65, -0.6, 0.1]],
  RCA: [[-0.15, 0.85, 0.6], [-0.65, 0.35, 0.65], [-0.8, -0.25, 0.35], [-0.45, -0.8, 0.05]],
}

function FallbackHeart() {
  return (
    <mesh>
      <sphereGeometry args={[1.05, 40, 40]} />
      <meshStandardMaterial color="#7a1f2b" roughness={0.45} />
    </mesh>
  )
}

export default function HeartViewer({ probs = { lad: 0, lcx: 0, rca: 0 }, selected, onSelect }) {
  return (
    <Canvas camera={{ position: [2.8, 1.6, 3.6] }} style={{ height: 420, background: '#0b1020', borderRadius: 8 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.3} />
      <Suspense fallback={<FallbackHeart />}>
        <HeartSTL />
      </Suspense>
      <Coronary name="LAD" points={PATHS.LAD} prob={probs.lad} selected={selected === 'LAD'} onClick={onSelect} />
      <Coronary name="LCX" points={PATHS.LCX} prob={probs.lcx} selected={selected === 'LCX'} onClick={onSelect} />
      <Coronary name="RCA" points={PATHS.RCA} prob={probs.rca} selected={selected === 'RCA'} onClick={onSelect} />
      <OrbitControls enablePan={false} />
    </Canvas>
  )
}
export { riskColor }
