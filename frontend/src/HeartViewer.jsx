import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function Vessel({ position, color, label }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.15, 0.15, 2.2, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function riskColor(p) {
  if (p >= 0.7) return 'red'
  if (p >= 0.4) return 'orange'
  return 'green'
}

export default function HeartViewer({ lad = 0.2, lcx = 0.2, rca = 0.2 }) {
  return (
    <Canvas camera={{ position: [3, 2, 4] }} style={{ height: 400, background: '#0b1020' }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} />
      {/* heart placeholder */}
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshStandardMaterial color="#7a1f2b" roughness={0.4} />
      </mesh>
      <Vessel position={[-0.6, 0.3, 1.0]} color={riskColor(lad)} />
      <Vessel position={[0.6, 0.3, 1.0]} color={riskColor(lcx)} />
      <Vessel position={[0, -0.6, 1.0]} color={riskColor(rca)} />
      <OrbitControls />
    </Canvas>
  )
}
