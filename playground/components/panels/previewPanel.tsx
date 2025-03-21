'use client'

import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

interface StoredModelData {
  imageUrl: string
  modelUrl: string
  timestamp: number
}

interface ModelPreviewPanelProps {
  modelUrl: string | null
  storedModels: StoredModelData[]
  onModelSelect: (modelData: StoredModelData) => void
  onDragStart: () => void
}

export default function ModelPreviewPanel({ 
  modelUrl, 
  storedModels, 
  onModelSelect, 
  onDragStart 
}: ModelPreviewPanelProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  
  // This will hold references to the renderers for each model in history
  const historyRenderersRef = useRef<Map<number, THREE.WebGLRenderer>>(new Map())
  
  useEffect(() => {
    if (!previewRef.current || !modelUrl) return
    
    // Clean up any existing renderer first
    if (rendererRef.current) {
      if (previewRef.current.contains(rendererRef.current.domElement)) {
        previewRef.current.removeChild(rendererRef.current.domElement)
      }
      rendererRef.current.dispose()
      rendererRef.current = null
    }
    
    setIsLoading(true)
    
    // Create a small Three.js scene for the preview
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    
    // Get container dimensions
    const width = previewRef.current.clientWidth
    const height = previewRef.current.clientHeight
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 0, 2)
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    rendererRef.current = renderer
    previewRef.current.appendChild(renderer.domElement)
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(0, 1, 1)
    scene.add(directionalLight)
    
    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controls.enableZoom = true
    
    // Setup animation loop variable to stop it when component unmounts
    let animationFrameId: number
    
    // Load the model
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        // Model loaded successfully
        const model = gltf.scene
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)
        
        // Scale the model to fit the preview
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 1 / maxDim
        model.scale.multiplyScalar(scale)
        
        // Add the model to the scene
        scene.add(model)
        setIsLoading(false)
        
        // Rotate the model slowly for a nice effect
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate)
          
          // Gentle rotation
          model.rotation.y += 0.005
          
          controls.update()
          renderer.render(scene, camera)
        }
        
        animate()
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
      },
      (error) => {
        console.error('An error happened while loading the model:', error)
        setIsLoading(false)
      }
    )
    
    // Handle window resize
    const handleResize = () => {
      if (!previewRef.current) return
      
      const width = previewRef.current.clientWidth
      const height = previewRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      
      renderer.setSize(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      // Stop animation loop
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      
      // Dispose of resources
      controls.dispose()
      
      // Dispose of renderer properly
      if (rendererRef.current) {
        if (previewRef.current && previewRef.current.contains(rendererRef.current.domElement)) {
          try {
            previewRef.current.removeChild(rendererRef.current.domElement)
          } catch (e) {
            console.warn('Could not remove renderer from DOM', e)
          }
        }
        rendererRef.current.dispose()
        rendererRef.current = null
      }
    }
  }, [modelUrl])
  
  // Effect to handle the 3D previews for history items
  useEffect(() => {
    // Clean up all existing history renderers first
    historyRenderersRef.current.forEach((renderer, index) => {
      const container = document.getElementById(`history-preview-${index}`)
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    })
    
    // Clear the map
    historyRenderersRef.current.clear()
    
    // Create new renderers for each history item
    storedModels.forEach((model, index) => {
      const container = document.getElementById(`history-preview-${index}`)
      if (!container) return
      
      // Create scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0f0f0)
      
      // Get container dimensions
      const width = container.clientWidth
      const height = container.clientHeight
      
      // Setup camera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
      camera.position.set(0, 0, 2)
      
      // Setup renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)
      
      // Store the renderer reference
      historyRenderersRef.current.set(index, renderer)
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
      directionalLight.position.set(0, 1, 1)
      scene.add(directionalLight)
      
      // Load the model
      const loader = new GLTFLoader()
      loader.load(
        model.modelUrl,
        (gltf) => {
          // Model loaded successfully
          const loadedModel = gltf.scene
          
          // Center the model
          const box = new THREE.Box3().setFromObject(loadedModel)
          const center = box.getCenter(new THREE.Vector3())
          loadedModel.position.sub(center)
          
          // Scale the model to fit the preview
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 1 / maxDim
          loadedModel.scale.multiplyScalar(scale)
          
          // Add the model to the scene
          scene.add(loadedModel)
          
          // Create a simple animation function
          const animate = () => {
            if (!historyRenderersRef.current.has(index)) return
            
            requestAnimationFrame(animate)
            
            // Gentle rotation
            loadedModel.rotation.y += 0.01
            
            renderer.render(scene, camera)
          }
          
          animate()
        },
        undefined,
        (error) => {
          console.error('An error happened while loading history model:', error)
        }
      )
    })
    
    // Cleanup
    return () => {
      historyRenderersRef.current.forEach((renderer) => {
        renderer.dispose()
      })
      historyRenderersRef.current.clear()
    }
  }, [storedModels])
  
  const handleDragStart = (e: React.DragEvent) => {
    if (modelUrl) {
      e.dataTransfer.setData('text/plain', modelUrl)
      onDragStart()
    }
  }
  
  const handleDownload = () => {
    if (modelUrl) {
      const link = document.createElement('a')
      link.href = modelUrl
      link.download = 'model.glb' // Default name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  
  if (!modelUrl) {
    return null
  }
  
  return (
    <div className="absolute right-6 top-6 w-80 bg-white bg-opacity-75 backdrop-blur-sm shadow-lg z-10 p-4 flex flex-col rounded-lg max-h-[85vh] overflow-hidden">
      <h2 className="text-xl text-slate-700 font-bold mb-2">History</h2>
      
      <div 
        className="flex-1 border border-gray-300 rounded-md overflow-hidden relative h-48"
        ref={previewRef}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {storedModels.length > 0 && (
        <div className="mt-4">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {storedModels.map((model, index) => (
              <div 
                key={index} 
                className={`p-2 border rounded cursor-pointer transition-colors duration-200 ${
                  model.modelUrl === modelUrl 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                }`}
                onClick={() => onModelSelect(model)}
              >
                <div className="flex gap-2">
                  {/* 3D Preview container */}
                  <div 
                    id={`history-preview-${index}`}
                    className="w-16 h-16 bg-gray-100 rounded overflow-hidden"
                  ></div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-600 truncate">Model {index + 1}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(model.timestamp).toLocaleString()}
                    </div>
                    
                    <div className="mt-2">
                      <a 
                        href={model.modelUrl}
                        download={`model-${index + 1}.glb`}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded hover:bg-green-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}