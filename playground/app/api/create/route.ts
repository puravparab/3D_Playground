// app/api/generate-model/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

// API key is only available on server
const FAL_API_KEY = process.env.FAL_API_KEY;

// Type definitions for model inputs and outputs
type TrellisInput = {
  image_url: string;
};

type Hyper3dRodinInput = {
  input_image_urls: string[];
  condition_mode: "concat" | "fuse";
  geometry_file_format: "glb" | "usdz" | "fbx" | "obj" | "stl";
  material: "PBR" | "Shaded";
  quality: "high" | "medium" | "low" | "extra-low";
  tier: "Regular" | "Sketch";
};

type HunyuanInput = {
  input_image_url: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  octree_resolution?: number;
  textured_mesh?: boolean;
};

type ModelOutput = {
  model_mesh: {
    url: string;
    file_name: string;
    content_type: string;
    file_size: number;
  };
  textures?: Array<{
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    width: number;
    height: number;
  }>;
};

// Supported models configuration
const SUPPORTED_MODELS = {
  trellis: {
    endpoint: "fal-ai/trellis",
    getInput: (imageUrl: string): TrellisInput => ({
      image_url: imageUrl
    })
  },
  hyper3d: {
    endpoint: "fal-ai/hyper3d/rodin",
    getInput: (imageUrl: string): Hyper3dRodinInput => ({
      input_image_urls: [imageUrl],
      condition_mode: "concat",
      geometry_file_format: "glb",
      material: "PBR",
      quality: "medium",
      tier: "Regular"
    })
  },
  hunyuan: {
    endpoint: "fal-ai/hunyuan3d/v2",
    getInput: (imageUrl: string): HunyuanInput => ({
      input_image_url: imageUrl,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      octree_resolution: 256,
      textured_mesh: true
    })
  }
} as const;

type ModelType = keyof typeof SUPPORTED_MODELS;

export async function POST(request: NextRequest) {
  if (!FAL_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    fal.config({
      credentials: FAL_API_KEY
    });

    // Get the uploaded image and model type
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const modelType = (formData.get('modelType') as ModelType) || 'trellis';
    
    if (!imageFile) {
      return NextResponse.json({ 
        error: 'No image file provided' 
      }, { status: 400 });
    }

    if (!SUPPORTED_MODELS[modelType]) {
      return NextResponse.json({ 
        error: 'Invalid model type',
        supportedModels: Object.keys(SUPPORTED_MODELS)
      }, { status: 400 });
    }

    // Upload to fal storage and get URL
    const imageUrl = await fal.storage.upload(imageFile);

    // Get model configuration
    const modelConfig = SUPPORTED_MODELS[modelType];

    // Generate 3D model
    const result = await fal.subscribe(modelConfig.endpoint, {
      input: modelConfig.getInput(imageUrl),
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    const modelOutput = result.data as ModelOutput;

    // Return model information to the client
    return NextResponse.json({ 
      modelUrl: modelOutput.model_mesh.url,
      fileName: modelOutput.model_mesh.file_name,
      contentType: modelOutput.model_mesh.content_type,
      fileSize: modelOutput.model_mesh.file_size,
      textures: modelOutput.textures,
      modelType
    });
    
  } catch (error) {
    console.error('Error generating 3D model:', error);
    return NextResponse.json({ 
      error: 'Failed to generate 3D model',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}