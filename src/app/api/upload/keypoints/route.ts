import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateFileName } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    const { keypoints, exerciseId } = await req.json();
    
    if (!keypoints) {
      return NextResponse.json({ error: 'No keypoints data provided' }, { status: 400 });
    }

    // Convert keypoints to JSON string
    const keypointsJson = JSON.stringify(keypoints, null, 2);
    const buffer = Buffer.from(keypointsJson, 'utf-8');
    
    // Generate unique filename
    const fileName = generateFileName(`keypoints-${exerciseId || Date.now()}.json`, 'keypoints');
    
    // Upload to Google Cloud Storage
    const keypointsUrl = await uploadFile(buffer, fileName, 'application/json');
    
    return NextResponse.json({ 
      success: true, 
      keypointsUrl,
      fileName 
    });
    
  } catch (error) {
    console.error('Error uploading keypoints:', error);
    return NextResponse.json({ error: 'Failed to upload keypoints' }, { status: 500 });
  }
} 