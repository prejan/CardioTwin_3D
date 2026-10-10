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
    return { centered: g, scale: 2.2 / maxDim }
  }, [geom])
  return (
    <mesh geometry={centered} scale={scale} rotation={[0.15, -0.35, 0]}>
      <meshStandardMaterial color="#a62b3a" roughness={0.5} metalness={0.1} side={THREE.DoubleSide} transparent opacity={0.98} />
    </mesh>
  )
}

function Coronary({ points, prob, selected, onClick, name }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), [points])
  return (
    <mesh onClick={(e) => { e.stopPropagation(); onClick(name) }} renderOrder={10}>
      <tubeGeometry args={[curve, 48, selected ? 0.06 : 0.045, 10, false]} />
      <meshStandardMaterial color={riskColor(prob)} emissive={selected ? riskColor(prob) : 'black'} emissiveIntensity={selected ? 0.55 : 0} roughness={0.25} depthTest={true} />
    </mesh>
  )
}

// Hugging HRA-Male surface (heart ~2.2 tall, front z~0.8). Thin + on-surface.
const PATHS = {
  LAD: [[0.02, 0.95, 0.72], [-0.02, 0.45, 0.92], [-0.08, -0.1, 0.95], [-0.22, -0.75, 0.62]],
  LCX: [[0.05, 0.88, 0.68], [0.55, 0.5, 0.78], [0.82, 0.05, 0.62], [0.72, -0.45, 0.35]],
  RCA: [[-0.02, 0.88, 0.68], [-0.58, 0.48, 0.75], [-0.85, -0.02, 0.58], [-0.6, -0.55, 0.35]],
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
    <Canvas camera={{ position: [0, 0.35, 4.0] }} style={{ height: 420, background: '#0b1020', borderRadius: 8 }}>
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
      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={7} />
    </Canvas>
  )
}
export { riskColor }
