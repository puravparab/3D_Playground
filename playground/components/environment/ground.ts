import * as THREE from 'three'

export function createGround() {
  const textureLoader = new THREE.TextureLoader()

  const groundTexture = textureLoader.load('/textures/grass.png')
  
  // Configure for seamless tiling
  groundTexture.wrapS = THREE.RepeatWrapping
  groundTexture.wrapT = THREE.RepeatWrapping
  groundTexture.repeat.set(10, 10) // Repeat the texture 10 times in each direction
  
  // Apply texture filtering to smooth transitions between tiles
  groundTexture.magFilter = THREE.LinearFilter
  groundTexture.minFilter = THREE.LinearMipmapLinearFilter
  
  // Generate mipmaps to improve texture appearance at different distances
  groundTexture.generateMipmaps = true
  
  // Create ground geometry
  const groundGeometry = new THREE.PlaneGeometry(100, 100)
  
  // Create material with the texture and use a more muted green color
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: groundTexture,
    color: 0x557755, // Darker, more muted green
    roughness: 1,
    metalness: 0,
    emissiveIntensity: 0.1
  })
  
  // Create the ground mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2 // Rotate to be horizontal
  ground.position.y = 0 // Position at y=0 to be the reference ground level
  
  // Enable shadow receiving
  ground.receiveShadow = true
  
  // Add a collider property to identify it as ground
  ground.userData.isGround = true
  
  return ground
}