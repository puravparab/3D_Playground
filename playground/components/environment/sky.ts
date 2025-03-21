import * as THREE from 'three'

export function createSky() {
  const skyGeometry = new THREE.SphereGeometry(500, 32, 32)
  
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x8cc0f5, 
    side: THREE.BackSide,
    fog: true,
    transparent: true,
    opacity: 0.8
  })
  
  return new THREE.Mesh(skyGeometry, skyMaterial)
}