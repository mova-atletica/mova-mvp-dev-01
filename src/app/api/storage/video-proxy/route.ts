import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Support JSON in env (Vercel) or fallback to key file path if running locally
let credentials: any = null;
try {
  const raw = process.env.GOOGLE_CLOUD_KEY_FILE || '';
  credentials = raw ? JSON.parse(raw) : null;
} catch {
  credentials = null;
}

// Singleton Storage instance with connection pooling
let storageInstance: Storage | null = null;
let lastConnectionTime = 0;
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const getStorage = (): Storage => {
  const now = Date.now();
  
  // Create new instance if none exists or if connection is stale
  if (!storageInstance || (now - lastConnectionTime) > CONNECTION_TIMEOUT) {
    console.log('Creating new GCS Storage instance for video proxy');
    
    storageInstance = new Storage(
      credentials
        ? {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentials: {
              client_email: credentials.client_email,
              private_key: (credentials.private_key || '').replace(/\\n/g, '\n'),
            },
            retryOptions: {
              autoRetry: true,
              maxRetries: 3,
              retryDelayMultiplier: 2,
              totalTimeout: 30000, // 30 seconds
            },
            timeout: 30000,
          }
        : {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
            retryOptions: {
              autoRetry: true,
              maxRetries: 3,
              retryDelayMultiplier: 2,
              totalTimeout: 30000,
            },
            timeout: 30000,
          }
    );
    
    lastConnectionTime = now;
  }
  
  return storageInstance;
};

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mova-exercise-library';

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Use singleton storage instance
    const storage = getStorage();
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

    // Use singleton storage instance
    const storage = getStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    // Get file metadata
    const [metadata] = await file.getMetadata();
    const fileSize = parseInt(metadata.size || '0', 10);
    
    // Parse Range header for partial content requests
    const rangeHeader = request.headers.get('range');
    
    if (rangeHeader) {
      // Parse range header (e.g., "bytes=1024-2047" or "bytes=1024-")
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416, // Range Not Satisfiable
          headers: {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        });
      }
      
      // Create a readable stream for the requested range
      const fileStream = file.createReadStream({ start, end });
      
      // Return partial content response
      return new NextResponse(fileStream as any, {
        status: 206, // Partial Content
        headers: {
          'Content-Type': metadata.contentType || 'video/mp4',
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
        },
      });
    } else {
      // No range header - stream entire file
      const fileStream = file.createReadStream();
      
      return new NextResponse(fileStream as any, {
        status: 200,
        headers: {
          'Content-Type': metadata.contentType || 'video/mp4',
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Content-Disposition': 'inline',
        },
      });
    }

  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    },
  });
} 