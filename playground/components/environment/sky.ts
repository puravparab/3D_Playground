import * as THREE from 'three'

export function createSky() {
  const skyGeometry = new THREE.SphereGeometry(500, 32, 32)
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x87CEEB,
    side: THREE.BackSide
  })
  return new THREE.Mesh(skyGeometry, skyMaterial)
}