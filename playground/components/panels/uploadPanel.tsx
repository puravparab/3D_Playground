'use client'

import { useState } from 'react'
import Image from 'next/image'

interface UploadPanelProps {
  onUpload: (file: File) => void
  isLoading: boolean
}

export default function UploadPanel({ onUpload, isLoading }: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      // Create a preview URL for the image
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setSelectedFile(file)
    }
  }
  
  const handleGenerateClick = () => {
    if (selectedFile) {
      onUpload(selectedFile)
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
          {previewUrl ? (
            <div className="relative w-full h-40 mx-auto mb-4">
              <Image 
                src={previewUrl} 
                alt="Preview" 
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
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
          )}
          
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
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
      
      {selectedFile && !isLoading && (
        <button
          onClick={handleGenerateClick}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
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