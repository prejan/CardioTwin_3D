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
    return { centered: g, scale: 2.2 / Math.max(size.x, size.y, size.z) }
  }, [geom])
  return (
    <mesh geometry={centered} scale={scale} rotation={[0.15, -0.35, 0]}>
      <meshStandardMaterial color="#e0607a" roughness={0.55} metalness={0.05} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Branch({ pts, color, r = 0.032, selected, name, onClick }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), [pts])
  return (
    <mesh onClick={(e) => { e.stopPropagation(); onClick(name) }} renderOrder={10}>
      <tubeGeometry args={[curve, 32, selected ? r * 1.5 : r, 8, false]} />
      <meshStandardMaterial color={color} emissive={selected ? color : 'black'} emissiveIntensity={selected ? 0.5 : 0} roughness={0.3} />
    </mesh>
  )
}

// Front view like reference: LCA top-center bifurcates. All z ~ surface 0.65-0.95.
function CoronaryTree({ probs, selected, onSelect }) {
  const cLAD = riskColor(probs.lad), cLCX = riskColor(probs.lcx), cRCA = riskColor(probs.rca)
  return (
    <group>
      {/* LCA trunk */}
      <Branch name="LAD" pts={[[0.0, 1.02, 0.6], [-0.04, 0.92, 0.68]]} color={cLAD} r={0.045} selected={selected === 'LAD'} onClick={onSelect} />
      {/* LAD main down anterior groove */}
      <Branch name="LAD" pts={[[-0.04, 0.92, 0.68], [-0.07, 0.5, 0.9], [-0.1, 0.05, 0.95], [-0.18, -0.45, 0.78], [-0.26, -0.85, 0.5]]} color={cLAD} r={0.04} selected={selected === 'LAD'} onClick={onSelect} />
      {/* Diagonal 1 + 2 off LAD */}
      <Branch name="LAD" pts={[[-0.07, 0.42, 0.9], [-0.32, 0.18, 0.82], [-0.52, -0.08, 0.6]]} color={cLAD} r={0.024} selected={selected === 'LAD'} onClick={onSelect} />
      <Branch name="LAD" pts={[[-0.09, 0.02, 0.94], [-0.33, -0.22, 0.78], [-0.48, -0.45, 0.55]]} color={cLAD} r={0.022} selected={selected === 'LAD'} onClick={onSelect} />
      {/* LCX main left groove */}
      <Branch name="LCX" pts={[[-0.02, 0.94, 0.66], [0.3, 0.78, 0.7], [0.62, 0.42, 0.72], [0.74, 0.0, 0.55], [0.6, -0.42, 0.35]]} color={cLCX} r={0.04} selected={selected === 'LCX'} onClick={onSelect} />
      {/* OM1 + OM2 */}
      <Branch name="LCX" pts={[[0.58, 0.4, 0.72], [0.38, 0.02, 0.85], [0.22, -0.38, 0.7]]} color={cLCX} r={0.024} selected={selected === 'LCX'} onClick={onSelect} />
      <Branch name="LCX" pts={[[0.72, -0.02, 0.55], [0.5, -0.35, 0.62], [0.35, -0.6, 0.45]]} color={cLCX} r={0.022} selected={selected === 'LCX'} onClick={onSelect} />
      {/* RCA main right groove */}
      <Branch name="RCA" pts={[[0.06, 1.0, 0.58], [0.5, 0.85, 0.62], [0.85, 0.45, 0.6], [0.9, -0.05, 0.5], [0.68, -0.5, 0.38], [0.3, -0.8, 0.35]]} color={cRCA} r={0.042} selected={selected === 'RCA'} onClick={onSelect} />
      {/* Acute marginal */}
      <Branch name="RCA" pts={[[0.88, 0.05, 0.52], [0.62, -0.18, 0.7], [0.4, -0.42, 0.62]]} color={cRCA} r={0.022} selected={selected === 'RCA'} onClick={onSelect} />
    </group>
  )
}

function FallbackHeart() {
  return (
    <mesh>
      <sphereGeometry args={[1.05, 32, 32]} />
      <meshStandardMaterial color="#7a1f2b" roughness={0.5} />
    </mesh>
  )
}

export default function HeartViewer({ probs = { lad: 0, lcx: 0, rca: 0 }, selected, onSelect }) {
  return (
    <Canvas camera={{ position: [0, 0.3, 4.0] }} style={{ height: 460, background: '#0b1020', borderRadius: 8 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 5, 6]} intensity={1.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#442222', 0.6]} />
      <Suspense fallback={<FallbackHeart />}>
        <HeartSTL />
      </Suspense>
      <CoronaryTree probs={probs} selected={selected} onSelect={onSelect} />
      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={7} />
    </Canvas>
  )
}
export { riskColor }
