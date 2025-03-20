import * as THREE from 'three'

export function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(100, 100)
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x33AA33, // Green
    roughness: 0.8,
    metalness: 0.2
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2 // Rotate to be horizontal
  ground.position.y = -1
  
  return ground
}