import * as THREE from 'three'

export function setupLights(scene: THREE.Scene) {
  // Increase ambient light for better base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)
  
  // Main directional light with softer shadows
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(5, 8, 5)
  directionalLight.castShadow = true
  
  // Optimize shadow properties for better quality
  if (directionalLight.shadow) {
    directionalLight.shadow.mapSize.width = 1024 // Increased for better shadow quality
    directionalLight.shadow.mapSize.height = 1024
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    
    // Adjust shadow camera frustum for better coverage
    const shadowCam = directionalLight.shadow.camera;
    shadowCam.left = -10;
    shadowCam.right = 10;
    shadowCam.top = 10;
    shadowCam.bottom = -10;
  }
  scene.add(directionalLight)
  
  // Add a softer fill light from the opposite side
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
  fillLight.position.set(-5, 6, -5)
  scene.add(fillLight)
  
  // Add a subtle bottom light for better ground illumination
  const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3)
  bottomLight.position.set(0, -3, 0)
  scene.add(bottomLight)
  
  // Add a balanced hemisphere light for more natural lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2)
  hemiLight.position.set(0, 10, 0)
  scene.add(hemiLight)
  
  return { ambientLight, directionalLight, fillLight, bottomLight, hemiLight }
}