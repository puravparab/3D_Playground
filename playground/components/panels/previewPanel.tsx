// components/ModelPreviewPanel.tsx
'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface ModelPreviewPanelProps {
  modelUrl: string | null
  onDragStart: () => void
}

export default function ModelPreviewPanel({ modelUrl, onDragStart }: ModelPreviewPanelProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const thumbnailRef = useRef<HTMLImageElement>(null)
  
  const handleDragStart = (e: React.DragEvent) => {
    if (modelUrl) {
      e.dataTransfer.setData('text/plain', modelUrl)
      onDragStart()
    }
  }
  
  if (!modelUrl) {
    return null
  }
  
  return (
    <div className="absolute right-6 top-6 w-72 bg-white bg-opacity-75 backdrop-blur-sm shadow-lg z-10 p-4 flex flex-col rounded-lg">
      <h2 className="text-xl font-bold mb-4">3D Model Preview</h2>
      
      <div 
        className="flex-1 border border-gray-300 rounded-md overflow-hidden relative h-48"
        ref={previewRef}
      >
        {/* We'll just show a placeholder for the model - in a real app, you might want to render a preview */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70">
          <img 
            ref={thumbnailRef}
            src="/model-placeholder.png" 
            alt="Model preview" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
      
      <div 
        className="mt-4 p-3 bg-blue-100 bg-opacity-80 border border-blue-300 rounded-md cursor-move"
        draggable
        onDragStart={handleDragStart}
      >
        <p className="text-center text-blue-800 font-medium">Drag to add to scene</p>
      </div>
    </div>
  )
}