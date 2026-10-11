import { Suspense, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const TARGET_NODES = {
  LAD: ['Coronary_LAD', 'Coronary_LAD_Septal'],
  LCX: ['Coronary_LCX'],
  RCA: ['Coronary_RCA', 'Coronary_RCA_Marginal', 'Coronary_RCA_PDA', 'Coronary_RCA_PL', 'Coronary_RCA_Septal'],
  CAD: ['Heart_Wall_Anterior', 'Heart_Wall_Posterior'],
}

function riskColor(p) {
  if (p >= 0.7) return '#e31b23'
  if (p >= 0.4) return '#ff9f1c'
  return '#2ec4b6'
}

function SegmentedHeart({ probs, selected, onSelect }) {
  const { scene } = useGLTF('/anatomy/cardiotwin_anatomy.glb')
  const clone = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    clone.traverse((o) => {
      if (!o.isMesh) return
      const nm = o.name || ''
      let prob = null, vessel = null
      for (const [v, nodes] of Object.entries(TARGET_NODES)) {
        if (v === 'CAD') continue
        if (nodes.some(n => nm === n || nm.startsWith(n))) { vessel = v; break }
      }
      if (vessel) {
        prob = probs[vessel.toLowerCase()]
        o.material = o.material.clone()
        o.material.color = new THREE.Color(riskColor(prob ?? 0))
        o.material.emissive = new THREE.Color(riskColor(prob ?? 0))
        o.material.emissiveIntensity = selected === vessel ? 0.55 : 0.12
        o.userData.vessel = vessel
      } else if (nm.includes('Heart_Wall')) {
        o.material = o.material.clone()
        o.material.color = new THREE.Color('#c2556e')
        o.material.roughness = 0.55
      }
    })
  }, [clone, probs, selected])

  return (
    <primitive
      object={clone}
      scale={1}
      onClick={(e) => {
        e.stopPropagation()
        let o = e.object
        if (o?.userData?.vessel) onSelect(o.userData.vessel)
      }}
    />
  )
}

export default function HeartViewer({ probs = { lad: 0, lcx: 0, rca: 0 }, selected, onSelect }) {
  return (
    <Canvas camera={{ position: [0.4, 0.5, 3.4] }} style={{ height: 460, background: '#0b1020', borderRadius: 8 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 5, 6]} intensity={1.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} />
      <hemisphereLight args={['#ffffff', '#442222', 0.6]} />
      <Suspense fallback={null}>
        <SegmentedHeart probs={probs} selected={selected} onSelect={onSelect} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={7} />
    </Canvas>
  )
}
export { riskColor, TARGET_NODES }
useGLTF.preload('/anatomy/cardiotwin_anatomy.glb')
