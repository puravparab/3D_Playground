import * as THREE from 'three'

export function useRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x87CEEB) // Light blue for sky
  return renderer
}