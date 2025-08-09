import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mova-exercise-library';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Directly access Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Image file not found' }, { status: 404 });
    }
    
    // Get file metadata
    const [metadata] = await file.getMetadata();
    
    // Create a readable stream
    const fileStream = file.createReadStream();
    
    // Return the image stream with appropriate headers
    return new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        'Content-Type': metadata.contentType || 'image/jpeg',
        'Content-Length': String(metadata.size || ''),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json({ 
      error: 'Failed to proxy image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 