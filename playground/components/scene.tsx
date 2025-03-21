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
import ModelControlsPanel from './panels/modelControlsPanel'

// Define types for our stored data
interface StoredModelData {
  imageUrl: string;
  modelUrl: string;
  timestamp: number;
}

export default function Scene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [storedModels, setStoredModels] = useState<StoredModelData[]>([])
  const orbitControlsRef = useRef<any>(null)
  const loadedModelsRef = useRef<THREE.Object3D[]>([])
  const [selectedModel, setSelectedModel] = useState<THREE.Object3D | null>(null)
  const [controlPosition, setControlPosition] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const draggedModelRef = useRef<THREE.Object3D | null>(null)
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const groundPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  
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
  
  // Update control panel position when a model is selected
  useEffect(() => {
    if (selectedModel && cameraRef.current && rendererRef.current) {
      updateControlPosition()
    }
  }, [selectedModel])
  
  // Main scene setup - run ONCE with empty dependency array
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer setup with optimized settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.info.autoReset = false; // Disable automatic info reset for better performance
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup controls
    const orbitControls = useOrbitControls(camera, renderer.domElement);
    orbitControlsRef.current = orbitControls;
    
    // Create environment
    const ground = createGround();
    // Make sure ground receives shadows
    if (ground instanceof THREE.Mesh) {
      ground.receiveShadow = true;
    }
    
    const sky = createSky();
    const lights = setupLights(scene);
    
    scene.add(ground);
    scene.add(sky);
    
    // Initialize raycaster
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    
    // Define updateControlPosition within useEffect to access the latest state
    function updateControlPosition() {
      if (!selectedModel || !camera) return;
      
      // Create a vector at the model's position
      const modelPosition = new THREE.Vector3();
      selectedModel.getWorldPosition(modelPosition);
      
      // Get the model's bounding box to position controls above the model
      const bbox = new THREE.Box3().setFromObject(selectedModel);
      modelPosition.y = bbox.max.y + 0.5; // Position above the model
      
      // Project the 3D position to 2D screen coordinates
      const widthHalf = window.innerWidth / 2;
      const heightHalf = window.innerHeight / 2;
      
      // Clone the position to avoid modifying the original
      const screenPosition = modelPosition.clone();
      
      // Project the position to screen space
      screenPosition.project(camera);
      
      // Convert to pixel coordinates
      const x = (screenPosition.x * widthHalf) + widthHalf;
      const y = -(screenPosition.y * heightHalf) + heightHalf;
      
      // Update position state
      setControlPosition({ x, y });
    }
    
    // Update control positions only when camera moves
    orbitControls.addEventListener('change', updateControlPosition);
    
    // Setup model dragging on ground plane
    const handleMouseDown = (event: MouseEvent) => {
      // Don't handle if clicking on UI
      const target = event.target as Element;
      if (target.closest('.controls-ui-panel')) return;
      
      // Calculate mouse position in normalized device coordinates
      mousePosRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mousePosRef.current, camera);
      
      // Check if we're clicking directly on any model
      const intersects = raycaster.intersectObjects(loadedModelsRef.current, true);
      
      if (intersects.length > 0) {
        // Find the top level parent in our loadedModels array
        let selectedObject = intersects[0].object;
        let rootObject = selectedObject;
        
        // Traverse up to find the root object that's in our loadedModels array
        while (rootObject.parent && rootObject.parent !== scene) {
          rootObject = rootObject.parent;
        }
        
        // Check if this root object is in our loadedModels array
        if (loadedModelsRef.current.includes(rootObject)) {
          setSelectedModel(rootObject);
          draggedModelRef.current = rootObject;
          
          // Disable orbit controls during drag
          orbitControls.enabled = false;
          
          isDraggingRef.current = true;
        }
      } else {
        // When clicking on empty space, deselect the model
        // But don't do this if we clicked on a UI element
        if (!target.closest('.controls-ui-panel')) {
          setSelectedModel(null);
        }
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !draggedModelRef.current) return;
      
      // Update mouse position
      mousePosRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Cast ray from camera through mouse position
      raycaster.setFromCamera(mousePosRef.current, camera);
      
      // Find intersection with ground plane
      const intersectionPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlaneRef.current, intersectionPoint)) {
        // Move the model to the intersection point (X and Z only)
        // Preserve the Y position to maintain height
        const currentY = draggedModelRef.current.position.y;
        draggedModelRef.current.position.set(intersectionPoint.x, currentY, intersectionPoint.z);
        
        // Don't update control position during dragging
        // updateControlPosition();
      }
    };
    
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        // Re-enable orbit controls
        orbitControls.enabled = true;
        
        isDraggingRef.current = false;
        draggedModelRef.current = null;
      }
    };
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateControlPosition(); // Update control positions on resize
    };
    
    // Add event listeners
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    
    // Optional: Add a simple environment map for better reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Create a simple environment map
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Only update controls if they're enabled
      if (orbitControls.enabled) {
        orbitControls.update();
      }
      
      // Only render if scene is visible
      if (document.visibilityState === 'visible') {
        renderer.render(scene, camera);
      }
    };
    
    animate();
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      orbitControls.dispose();
      
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose resources
      scene.remove(ground);
      scene.remove(sky);
      
      if (ground instanceof THREE.Mesh) {
        ground.geometry.dispose();
        if (ground.material instanceof THREE.Material) {
          ground.material.dispose();
        }
      }
      
      if (sky instanceof THREE.Mesh) {
        sky.geometry.dispose();
        if (sky.material instanceof THREE.Material) {
          sky.material.dispose();
        }
      }
      
      // Dispose the PMREM generator
      pmremGenerator.dispose();
      
      // Dispose renderer
      renderer.dispose();
      
      // Clear any remaining references
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      orbitControlsRef.current = null;
    };
  }, []); // Empty dependency array - only run once
  
  // Update control position from outside useEffect - for initial selection
  const updateControlPosition = () => {
    if (!selectedModel || !cameraRef.current) return;
    
    // Create a vector at the model's position
    const modelPosition = new THREE.Vector3();
    selectedModel.getWorldPosition(modelPosition);
    
    // Get the model's bounding box to position controls above the model
    const bbox = new THREE.Box3().setFromObject(selectedModel);
    modelPosition.y = bbox.max.y + 0.5; // Position above the model
    
    // Project the 3D position to 2D screen coordinates
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    
    // Clone the position to avoid modifying the original
    const screenPosition = modelPosition.clone();
    
    // Project the position to screen space
    screenPosition.project(cameraRef.current);
    
    // Convert to pixel coordinates
    const x = (screenPosition.x * widthHalf) + widthHalf;
    const y = -(screenPosition.y * heightHalf) + heightHalf;
    
    // Update position state
    setControlPosition({ x, y });
  };

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
    e.preventDefault();
    
    if (!sceneRef.current || !cameraRef.current) return;
    
    const modelUrl = e.dataTransfer.getData('text/plain');
    if (modelUrl) {
      // Load the model into the scene
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
  
          // Enable shadows on all meshes in the model
          model.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              
              // Adjust material properties if it's a MeshStandardMaterial
              if (node.material instanceof THREE.MeshStandardMaterial) {
                node.material.roughness = 0.7;
                node.material.metalness = 0.3;
                node.material.envMapIntensity = 1.5;
              }
            }
          });
  
          // Scale up the model to be larger (3x larger)
          const scale = 3.0;
          model.scale.set(scale, scale, scale);
          
          // Add the model to the scene first so we can calculate its bounding box
          sceneRef.current?.add(model);
          
          // Position the model with some randomness so multiple models don't overlap
          const randomX = Math.random() * 8 - 4; // Random position between -4 and 4
          const randomZ = Math.random() * 8 - 4; // Random position between -4 and 4
          
          // Calculate bounding box after scaling
          const bbox = new THREE.Box3().setFromObject(model);
          const height = bbox.max.y - bbox.min.y;
          
          // Set the model position - ensure it's sitting on the ground (y=0)
          model.position.set(randomX, height / 2, randomZ);
          
          // Add to loaded models array for selection and manipulation
          loadedModelsRef.current.push(model);
          
          // Auto-select the newly added model
          setSelectedModel(model);
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
          console.error('An error happened while loading the model:', error);
        }
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleModelSelect = (modelData: StoredModelData) => {
    setModelUrl(modelData.modelUrl);
    setImagePreviewUrl(modelData.imageUrl);
  };
  
  // Prevent UI clicks from propagating to the scene
  const handleUIClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  // Model manipulation functions
  const rotateModel = (direction: 'left' | 'right') => {
    if (!selectedModel) return;
    
    const rotationAmount = direction === 'left' ? -Math.PI / 16 : Math.PI / 16;
    selectedModel.rotation.y += rotationAmount;
    
    // Don't update control position during rotation
    // updateControlPosition();
  };
  
  const scaleModel = (direction: 'up' | 'down') => {
    if (!selectedModel) return;
    
    const scaleFactor = direction === 'up' ? 1.1 : 0.9;
    selectedModel.scale.multiplyScalar(scaleFactor);
    
    // Update position to keep bottom at ground level
    const bbox = new THREE.Box3().setFromObject(selectedModel);
    const height = bbox.max.y - bbox.min.y;
    selectedModel.position.y = height / 2;
    
    // Don't update control position during scaling
    // updateControlPosition();
  };
  
  const moveHeight = (direction: 'up' | 'down') => {
    if (!selectedModel) return;
    
    const moveDistance = 0.5;
    
    if (direction === 'up') {
      // Increase height from ground
      selectedModel.position.y += moveDistance;
    } else {
      // Decrease height but don't go below ground
      const bbox = new THREE.Box3().setFromObject(selectedModel);
      const minHeight = (bbox.max.y - bbox.min.y) / 2;
      selectedModel.position.y = Math.max(minHeight, selectedModel.position.y - moveDistance);
    }
    
    // Don't update control position during height adjustment
    // updateControlPosition();
  };
  
  const deleteModel = () => {
    if (!selectedModel || !sceneRef.current) return;
    
    // Remove from scene
    sceneRef.current.remove(selectedModel);
    
    // Remove from loadedModels array
    loadedModelsRef.current = loadedModelsRef.current.filter(model => model !== selectedModel);
    
    // Clear selection
    setSelectedModel(null);
  };
  
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
      
      {selectedModel && (
        <div 
          className="absolute pointer-events-none z-20"
          style={{ 
            left: `${controlPosition.x}px`, 
            top: `${controlPosition.y}px`,
            transform: 'translate(-50%, -100%)' // Center horizontally and place above
          }}
        >
          <div 
            className="pointer-events-auto controls-ui-panel"
            onClick={handleUIClick}
          >
            <ModelControlsPanel
              onRotate={rotateModel}
              onScale={scaleModel}
              onMove={moveHeight}
              onDelete={deleteModel}
            />
          </div>
        </div>
      )}
      
      {/* Instructions overlay when model is selected */}
      {selectedModel && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
          Click and drag the model to move it across the ground
        </div>
      )}
    </div>
  );
}