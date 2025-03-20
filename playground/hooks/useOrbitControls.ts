// utils/createOrbitControls.ts
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function useOrbitControls(
  camera: THREE.Camera, 
  domElement: HTMLElement
) {
  const controls = new OrbitControls(camera, domElement)
  
  // Configure controls
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.screenSpacePanning = false
  controls.minPolarAngle = 0
  controls.maxPolarAngle = Math.PI / 2 - 0.1
  controls.minDistance = 1
  controls.maxDistance = 100
  
  return controls
}