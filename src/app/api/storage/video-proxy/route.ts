import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mova-exercise-library';

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Directly access Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    // Get file metadata
    const [metadata] = await file.getMetadata();
    
    // Create a readable stream
    const fileStream = file.createReadStream();

    // Return the video stream with appropriate headers
    return new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        'Content-Type': metadata.contentType || 'video/mp4',
        'Content-Length': String(metadata.size || ''),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': 'inline',
      },
    });

  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Fix: Check for both 'file' and 'fileName' parameters
    const fileName = searchParams.get('fileName') || searchParams.get('file');

    if (!fileName) {
      return NextResponse.json({ error: 'fileName or file parameter is required' }, { status: 400 });
    }

    // Directly access Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    // Get file metadata
    const [metadata] = await file.getMetadata();
    
    // Create a readable stream
    const fileStream = file.createReadStream();

    // Return the video stream with appropriate headers
    return new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        'Content-Type': metadata.contentType || 'video/mp4',
        'Content-Length': String(metadata.size || ''),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': 'inline',
      },
    });

  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    );
  }
} 