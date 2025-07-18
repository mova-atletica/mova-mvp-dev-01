import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateFileName } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    // Debug: Check environment variables
    console.log('Environment check:', {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'Set' : 'Missing',
      bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME ? 'Set' : 'Missing',
      keyFile: process.env.GOOGLE_CLOUD_KEY_FILE ? 'Set' : 'Missing',
    });

    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const fileName = generateFileName(file.name, 'images');
    
    // Upload to Google Cloud Storage
    const imageUrl = await uploadFile(buffer, fileName, file.type);
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      fileName 
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ 
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 