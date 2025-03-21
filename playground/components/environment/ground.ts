import * as THREE from 'three'

export function createGround() {
  const textureLoader = new THREE.TextureLoader()

  const groundTexture = textureLoader.load('/textures/concrete.png')
  
  // Configure for seamless tiling with optimized settings
  groundTexture.wrapS = THREE.RepeatWrapping
  groundTexture.wrapT = THREE.RepeatWrapping
  groundTexture.repeat.set(8, 8)
  
  // Optimize texture filtering
  groundTexture.magFilter = THREE.LinearFilter
  groundTexture.minFilter = THREE.LinearMipmapLinearFilter
  groundTexture.generateMipmaps = true
  
  // Optimize texture memory usage
  groundTexture.anisotropy = 4
  
  // Create optimized ground geometry with fewer segments
  const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1)
  
  // Create material with enhanced green color
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: groundTexture,
    color: 0xffffff, // Brighter, more vibrant green
    roughness: 0.8,  // Slightly less rough for better light reflection
    metalness: 0.0,
    emissive: 0x1b5e20, // Subtle green emissive glow
    emissiveIntensity: 0.05,
    dithering: true
  })
  
  // Create the ground mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  
  // Enable shadow receiving with optimized settings
  ground.receiveShadow = true
  
  // Add a collider property to identify it as ground
  ground.userData.isGround = true
  
  return ground
}