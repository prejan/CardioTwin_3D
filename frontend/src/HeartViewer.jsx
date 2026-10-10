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
  const { centered, scale } = useMemo(() => {
    const g = geom.clone()
    g.computeBoundingBox()
    const size = new THREE.Vector3()
    g.boundingBox.getSize(size)
    const center = new THREE.Vector3()
    g.boundingBox.getCenter(center)
    g.translate(-center.x, -center.y, -center.z)
    g.computeVertexNormals()
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const s = 2.2 / maxDim
    console.log('heart.stl size', size, 'auto-scale', s)
    return { centered: g, scale: s }
  }, [geom])
  return (
    <mesh geometry={centered} scale={scale} rotation={[0.2, -0.4, 0]}>
      <meshStandardMaterial color="#a62b3a" roughness={0.45} metalness={0.1} side={THREE.DoubleSide} transparent opacity={0.96} />
    </mesh>
  )
}

function Coronary({ points, prob, selected, onClick, name }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), [points])
  return (
    <mesh onClick={(e) => { e.stopPropagation(); onClick(name) }} renderOrder={10}>
      <tubeGeometry args={[curve, 40, selected ? 0.14 : 0.1, 10, false]} />
      <meshStandardMaterial color={riskColor(prob)} emissive={selected ? riskColor(prob) : 'black'} emissiveIntensity={selected ? 0.6 : 0} roughness={0.25} depthTest={false} />
    </mesh>
  )
}

const PATHS = {
  LAD: [[0.05, 1.05, 0.75], [-0.08, 0.5, 1.15], [-0.15, -0.3, 1.05], [-0.1, -0.9, 0.6]],
  LCX: [[0.15, 0.9, 0.75], [0.7, 0.5, 0.9], [1.0, -0.05, 0.6], [0.7, -0.65, 0.25]],
  RCA: [[-0.15, 0.9, 0.75], [-0.7, 0.4, 0.8], [-0.9, -0.3, 0.5], [-0.5, -0.85, 0.2]],
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
    <Canvas camera={{ position: [0, 0.4, 4.2] }} style={{ height: 420, background: '#0b1020', borderRadius: 8 }}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} />
      <hemisphereLight args={['#ffffff', '#331111', 0.5]} />
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
