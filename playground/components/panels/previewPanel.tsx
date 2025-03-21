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
  onDeleteModel: (modelToDelete: StoredModelData) => void
}

export default function ModelPreviewPanel({ 
  modelUrl, 
  storedModels, 
  onModelSelect, 
  onDragStart,
  onDeleteModel
}: ModelPreviewPanelProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const modelObjectRef = useRef<THREE.Object3D | null>(null)
  
  // This will hold references to the renderers and models for each history item
  const historyRenderersRef = useRef<Map<number, THREE.WebGLRenderer>>(new Map())
  const historyModelsRef = useRef<Map<number, THREE.Object3D>>(new Map())
  const animationFramesRef = useRef<Map<number, number>>(new Map())
  
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
    
    // Clean up any existing model
    if (modelObjectRef.current) {
      modelObjectRef.current = null
    }
    
    setIsLoading(true)
    
    // Create a small Three.js scene for the preview
    const scene = new THREE.Scene()
    // Make the background transparent
    scene.background = null
    
    // Get container dimensions
    const width = previewRef.current.clientWidth
    const height = previewRef.current.clientHeight
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    // Move camera closer to make model appear larger
    camera.position.set(0, 0, 1.5)
    
    // Setup renderer with optimized settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    })
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.info.autoReset = false // Disable automatic info reset for better performance
    
    rendererRef.current = renderer
    previewRef.current.appendChild(renderer.domElement)
    
    // Add lights with higher intensity
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
    directionalLight.position.set(1, 2, 1)
    scene.add(directionalLight)
    
    // Add a second directional light from another angle for better coverage
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight2.position.set(-1, 1, -1)
    scene.add(directionalLight2)
    
    // Add a hemispheric light for more natural illumination
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
    scene.add(hemiLight)
    
    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controls.enableZoom = true
    
    // Load the model
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene
        modelObjectRef.current = model
        
        // Optimize shadows and material properties
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = true
            node.receiveShadow = true
            
            // Optimize material properties
            if (node.material instanceof THREE.MeshStandardMaterial) {
              node.material.roughness = 0.7
              node.material.metalness = 0.3
              node.material.envMapIntensity = 1.5
              node.material.dithering = true // Add dithering for smoother color transitions
              node.material.flatShading = true // Use flat shading for better performance
            }
          }
        })
        
        // Optimize model positioning and scaling
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)
        
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = (1 / maxDim) * 1.4
        model.scale.multiplyScalar(scale)
        
        scene.add(model)
        setIsLoading(false)
        
        // Optimize animation loop
        const animate = () => {
          if (document.visibilityState === 'visible') {
            model.rotation.y += 0.005
            controls.update()
            renderer.render(scene, camera)
          }
          const frameId = requestAnimationFrame(animate)
          animationFramesRef.current.set(0, frameId) // Store the frame ID
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
    
    // Optimize cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      // Stop animation loop
      animationFramesRef.current.forEach((frameId) => {
        cancelAnimationFrame(frameId)
      })
      animationFramesRef.current.clear()
      
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
      
      // Clear references
      modelObjectRef.current = null
    }
  }, [modelUrl])
  
  // Effect to handle the 3D previews for history items
  useEffect(() => {
    // Cancel all animation frames
    animationFramesRef.current.forEach((frameId) => {
      cancelAnimationFrame(frameId)
    })
    animationFramesRef.current.clear()
    
    // Clean up all existing history models
    historyModelsRef.current.forEach((model) => {
      if (model.parent) {
        model.parent.remove(model)
      }
    })
    historyModelsRef.current.clear()
    
    // Clean up all existing history renderers
    historyRenderersRef.current.forEach((renderer, index) => {
      const container = document.getElementById(`history-preview-${index}`)
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    })
    historyRenderersRef.current.clear()

    // Only proceed if the panel is expanded
    if (isHistoryCollapsed) return
    
    // Create new renderers for each history item
    storedModels.forEach((model, index) => {
      const container = document.getElementById(`history-preview-${index}`)
      if (!container) {
        console.warn(`Container not found for model ${index}`)
        return
      }
      
      // Create scene
      const scene = new THREE.Scene()
      scene.background = null
      
      // Get container dimensions
      const width = container.clientWidth
      const height = container.clientHeight
      
      // Setup camera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
      camera.position.set(0, 0, 1.5)
      
      // Setup renderer with enhanced settings
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
      })
      renderer.setSize(width, height)
      renderer.setClearColor(0x000000, 0)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.2
      
      container.appendChild(renderer.domElement)
      historyRenderersRef.current.set(index, renderer)
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
      directionalLight.position.set(1, 2, 1)
      scene.add(directionalLight)
      
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5)
      directionalLight2.position.set(-1, 1, -1)
      scene.add(directionalLight2)
      
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
      scene.add(hemiLight)
      
      // Load the model
      const loader = new GLTFLoader()
      loader.load(
        model.modelUrl,
        (gltf) => {
          const loadedModel = gltf.scene
          historyModelsRef.current.set(index, loadedModel)
          
          // Enable shadows and adjust material properties
          loadedModel.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true
              node.receiveShadow = true
              
              if (node.material instanceof THREE.MeshStandardMaterial) {
                node.material.roughness = 0.7
                node.material.metalness = 0.3
                node.material.envMapIntensity = 1.5
                node.material.dithering = true
                node.material.flatShading = true
              }
            }
          })
          
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(loadedModel)
          const center = box.getCenter(new THREE.Vector3())
          loadedModel.position.sub(center)
          
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = (1 / maxDim) * 1.6
          loadedModel.scale.multiplyScalar(scale)
          
          scene.add(loadedModel)
          
          // Create animation function
          const animate = () => {
            const frameId = requestAnimationFrame(animate)
            animationFramesRef.current.set(index, frameId)
            
            loadedModel.rotation.y += 0.01
            renderer.render(scene, camera)
          }
          
          animate()
        },
        undefined,
        (error) => {
          console.error(`Error loading history model ${index}:`, error)
        }
      )
    })
    
    // Cleanup
    return () => {
      animationFramesRef.current.forEach((frameId) => {
        cancelAnimationFrame(frameId)
      })
      animationFramesRef.current.clear()
      
      historyModelsRef.current.forEach((model) => {
        if (model.parent) {
          model.parent.remove(model)
        }
      })
      historyModelsRef.current.clear()
      
      historyRenderersRef.current.forEach((renderer) => {
        renderer.dispose()
      })
      historyRenderersRef.current.clear()
    }
  }, [storedModels, isHistoryCollapsed])
  
  const handleDragStart = (e: React.DragEvent) => {
    if (modelUrl) {
      e.dataTransfer.setData('text/plain', modelUrl)
      onDragStart()
    }
  }
  
  const handleModelDragStart = (e: React.DragEvent, modelUrl: string) => {
    e.dataTransfer.setData('text/plain', modelUrl)
    onDragStart()
    // Prevent event propagation to avoid parent handlers
    e.stopPropagation()
  }
  
  if (!modelUrl) {
    return null
  }
  
  return (
    <div className={`absolute right-6 top-6 w-80 bg-white bg-opacity-90 backdrop-blur-sm shadow-lg z-10 flex flex-col rounded-lg transition-all duration-300 ${
      isHistoryCollapsed ? 'h-14' : 'h-[calc(100vh-6rem)]'
    } overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700">History</h2>
        <button
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          aria-label={isHistoryCollapsed ? "Expand history" : "Collapse history"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform ${isHistoryCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {!isHistoryCollapsed && storedModels.length > 0 && (
        <div className="overflow-y-auto flex-1 p-4">
          <div className="space-y-3">
            {storedModels.map((modelData, index) => (
              <div 
                key={index} 
                className={`p-2 border rounded cursor-pointer transition-colors duration-200 ${
                  modelData.modelUrl === modelUrl 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                }`}
                onClick={() => onModelSelect(modelData)}
              >
                <div className="flex gap-2">
                  {/* 3D Preview container with gradient background */}
                  <div 
                    id={`history-preview-${index}`}
                    className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-300 rounded overflow-hidden cursor-move"
                    draggable
                    onDragStart={(e) => handleModelDragStart(e, modelData.modelUrl)}
                  ></div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-600 truncate">Model {index + 1}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(modelData.timestamp).toLocaleString()}
                    </div>
                    
                    <div className="mt-2 flex gap-2">
                      <a 
                        href={modelData.modelUrl}
                        download={`model-${index + 1}.glb`}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded hover:bg-green-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteModel(modelData);
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded hover:bg-red-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
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