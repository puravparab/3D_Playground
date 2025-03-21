'use client'

import { useState, useEffect } from 'react'

interface UploadPanelProps {
  onUpload: (file: File, modelType: string) => void
  isLoading: boolean
  initialPreviewUrl?: string | null
}

export default function UploadPanel({ onUpload, isLoading, initialPreviewUrl }: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<'trellis' | 'hyper3d' | 'hunyuan'>('trellis')
  
  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      
      // Create a preview URL for the selected file
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      
      // Clean up the object URL when component unmounts or when file changes
      return () => URL.revokeObjectURL(objectUrl)
    }
  }
  
  const handleGenerateClick = () => {
    if (selectedFile) {
      onUpload(selectedFile, selectedModel)
    }
  }
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0])
    }
  }
  
  return (
    <div className="absolute left-6 top-6 w-72 bg-white bg-opacity-75 backdrop-blur-sm shadow-lg z-10 p-4 flex flex-col rounded-lg">
      <h2 className="text-xl text-slate-700 font-bold mb-4">Upload Image</h2>
      
      {/* Model Selection */}
      <div className="mb-4">
        <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Model
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as 'trellis' | 'hyper3d' | 'hunyuan')}
          className="w-full px-3 py-2 border border-gray-300 text-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          disabled={isLoading}
        >
          <option value="trellis">Trellis (Fast)</option>
          <option value="hyper3d">Hyper3D Rodin (High Quality)</option>
          <option value="hunyuan">Hunyuan 3D (Versatile)</option>
        </select>
      </div>
      
      {previewUrl ? (
        <div className="mb-4 relative">
          <img 
            src={previewUrl} 
            alt="Image preview" 
            className="w-full h-40 object-cover rounded-md border border-gray-300"
          />
          <button
            onClick={() => {
              setPreviewUrl(null)
              setSelectedFile(null)
            }}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <div 
          className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
            dragActive ? 'border-blue-500 bg-blue-50 bg-opacity-80' : 'border-gray-300'
          } ${isLoading ? 'opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white bg-opacity-80 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
              >
                <span>Upload an image</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
            
            {selectedFile && (
              <p className="text-xs mt-2 text-green-600">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>
        </div>
      )}
      
      {selectedFile && !isLoading && (
        <button
          onClick={handleGenerateClick}
          className="mt-4 w-full bg-violet-600 hover:bg-violet-800 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 cursor-pointer"
        >
          Generate 3D Model
        </button>
      )}
      
      {isLoading && (
        <div className="mt-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Converting image to 3D model...</p>
        </div>
      )}
    </div>
  )
}