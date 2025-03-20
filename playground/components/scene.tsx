'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { setupLights } from './lights'
import { createSky } from './environment/sky'
import { createGround } from './environment/ground'
import { useOrbitControls } from '@/hooks/useOrbitControls'

export default function Scene() {
  const mountRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!mountRef.current) return
    
    // Scene setup
    const scene = new THREE.Scene()
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 5, 10)
    camera.lookAt(0, 0, 0)
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x87CEEB)
    mountRef.current.appendChild(renderer.domElement)

    // Setup controls
    const orbitControls = useOrbitControls(camera, renderer.domElement)
    
    // Create environment
    const ground = createGround()
    const sky = createSky()
    setupLights(scene)
    
    scene.add(ground)
    scene.add(sky)
    
    // Window resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      orbitControls.update()
      
      renderer.render(scene, camera)
    }
    
    animate()
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
      orbitControls.dispose()
      
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
      
      // Dispose resources
      scene.remove(ground)
      scene.remove(sky)
      
      ground.geometry.dispose()
      if (ground.material instanceof THREE.Material) {
        ground.material.dispose()
      }
      
      sky.geometry.dispose()
      if (sky.material instanceof THREE.Material) {
        sky.material.dispose()
      }
    }
  }, [])
  
  return <div ref={mountRef} className="w-full h-screen" />
}