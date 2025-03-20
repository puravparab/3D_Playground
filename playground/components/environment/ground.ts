import * as THREE from 'three'

export function createGround() {
  // Create a texture loader
  const textureLoader = new THREE.TextureLoader()

  const groundTexture = textureLoader.load('/textures/grass.png')
  
  // Optional: Configure texture repetition for a tiled effect
  groundTexture.wrapS = THREE.RepeatWrapping
  groundTexture.wrapT = THREE.RepeatWrapping
  groundTexture.repeat.set(10, 10) // Repeat the texture 10 times in each direction
  
  // Create ground geometry
  const groundGeometry = new THREE.PlaneGeometry(100, 100)
  
  // Create material with the texture
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: groundTexture,
    roughness: 0.1,
    metalness: 0.4
  })
  
  // Create the ground mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2 // Rotate to be horizontal
  ground.position.y = -1
  
  // Enable shadow receiving
  ground.receiveShadow = true
  
  return ground
}