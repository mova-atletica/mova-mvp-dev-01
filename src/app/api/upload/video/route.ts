import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateFileName } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Check file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Video file too large (max 100MB)' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const fileName = generateFileName(file.name, 'videos');
    
    // Upload to Google Cloud Storage
    const videoUrl = await uploadFile(buffer, fileName, file.type);
    
    return NextResponse.json({ 
      success: true, 
      videoUrl,
      fileName 
    });
    
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
} 