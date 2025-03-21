import * as THREE from 'three'

export function setupLights(scene: THREE.Scene) {
  // Increase ambient light intensity for better base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  
  // Main directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  
  // Configure shadow properties for better shadows
  if (directionalLight.shadow) {
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    
    // Adjust shadow camera frustum to properly capture the scene
    const shadowCam = directionalLight.shadow.camera;
    shadowCam.left = -10;
    shadowCam.right = 10;
    shadowCam.top = 10;
    shadowCam.bottom = -10;
  }
  scene.add(directionalLight)
  
  // Add a second directional light from opposite side to fill shadows
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8)
  fillLight.position.set(-5, 8, -5)
  scene.add(fillLight)
  
  // Add a softer light from below for more natural lighting
  const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3)
  bottomLight.position.set(0, -5, 0)
  scene.add(bottomLight)
  
  // Add a hemisphere light for more balanced lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
  scene.add(hemiLight)
  
  return { ambientLight, directionalLight, fillLight, bottomLight, hemiLight }
}