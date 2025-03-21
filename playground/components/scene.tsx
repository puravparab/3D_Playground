'use client'

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { setupLights } from './lights'
import { createSky } from './environment/sky'
import { createGround } from './environment/ground'
import { useOrbitControls } from '@/hooks/useOrbitControls'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import UploadPanel from './panels/uploadPanel'
import ModelPreviewPanel from './panels/previewPanel'

// Define types for our stored data
interface StoredModelData {
  imageUrl: string;
  modelUrl: string;
  timestamp: number;
}

export default function Scene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [storedModels, setStoredModels] = useState<StoredModelData[]>([])
  
  // Load data from local storage on mount
  useEffect(() => {
    const savedModels = localStorage.getItem('savedModels')
    if (savedModels) {
      try {
        const parsedModels = JSON.parse(savedModels) as StoredModelData[]
        setStoredModels(parsedModels)
        
        // If we have saved models, set the most recent one as active
        if (parsedModels.length > 0) {
          // Sort by timestamp descending
          const sortedModels = [...parsedModels].sort((a, b) => b.timestamp - a.timestamp)
          setModelUrl(sortedModels[0].modelUrl)
          setImagePreviewUrl(sortedModels[0].imageUrl)
        }
      } catch (error) {
        console.error('Error parsing saved models:', error)
      }
    }
  }, [])
  
  // Save to local storage whenever storedModels changes
  useEffect(() => {
    localStorage.setItem('savedModels', JSON.stringify(storedModels))
  }, [storedModels])
  
  useEffect(() => {
    if (!mountRef.current) return
    
    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene
    
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

  const handleImageUpload = async (file: File) => {
    try {
      setIsLoading(true);
      
      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file);
      setImagePreviewUrl(imageUrl);
      
      // Create a FormData object and append the file
      const formData = new FormData();
      formData.append('image', file);
      
      // Call your API route
      const response = await fetch('/api/create', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate model');
      }
      
      const result = await response.json();
      console.log('API result:', result);
      
      const newModelUrl = result.modelUrl;
      setModelUrl(newModelUrl);
      
      // Save to stored models
      const newModel: StoredModelData = {
        imageUrl: imageUrl,
        modelUrl: newModelUrl,
        timestamp: Date.now()
      };
      
      // Add to beginning of array and limit to 10 most recent
      const updatedModels = [newModel, ...storedModels].slice(0, 10);
      setStoredModels(updatedModels);
      
    } catch (error) {
      console.error("Error generating 3D model:", error);
      alert("Error generating 3D model. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    if (!sceneRef.current) return
    
    const modelUrl = e.dataTransfer.getData('text/plain')
    if (modelUrl) {
      // Load the model into the scene
      const loader = new GLTFLoader()
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene
          
          // Position the model with some randomness so multiple models don't overlap
          const randomX = Math.random() * 4 - 2 // Random position between -2 and 2
          const randomZ = Math.random() * 4 - 2 // Random position between -2 and 2
          
          model.position.set(randomX, 1, randomZ)
          model.scale.set(1, 1, 1) // Adjust scale as needed
          
          // Add the model to the scene
          sceneRef.current?.add(model)
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
          console.error('An error happened while loading the model:', error)
        }
      )
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  const handleModelSelect = (modelData: StoredModelData) => {
    setModelUrl(modelData.modelUrl);
    setImagePreviewUrl(modelData.imageUrl);
  }
  
  return (
    <div 
      ref={mountRef} 
      className="w-full h-screen relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <UploadPanel 
        onUpload={handleImageUpload} 
        isLoading={isLoading} 
        initialPreviewUrl={imagePreviewUrl}
      />
      
      {modelUrl && (
        <ModelPreviewPanel 
          modelUrl={modelUrl} 
          storedModels={storedModels}
          onModelSelect={handleModelSelect} 
          onDragStart={() => {}} 
        />
      )}
    </div>
  )
}