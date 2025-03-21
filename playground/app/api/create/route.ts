// app/api/generate-model/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

// API key is only available on server
const FAL_API_KEY = process.env.FAL_API_KEY;

export async function POST(request: NextRequest) {
  if (!FAL_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    fal.config({
      credentials: FAL_API_KEY
    });

    // Get the uploaded image
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ 
				error: 'No image file provided' 
			}, { status: 400 });
    }

    // Upload to fal storage and get URL
    const imageUrl = await fal.storage.upload(imageFile);
    // Generate 3D model
    const result = await fal.subscribe("fal-ai/trellis", {
      input: {
        image_url: imageUrl
      },
      logs: true,
    });

    // Return model information to the client
    return NextResponse.json({ 
      modelUrl: result.data.model_mesh.url,
      fileName: result.data.model_mesh.file_name,
      contentType: result.data.model_mesh.content_type,
      fileSize: result.data.model_mesh.file_size
    });
    
  } catch (error) {
    console.error('Error generating 3D model:', error);
    return NextResponse.json({ 
      error: 'Failed to generate 3D model',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}