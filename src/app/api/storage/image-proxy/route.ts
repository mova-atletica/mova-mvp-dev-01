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
    console.log('Creating new GCS Storage instance for image proxy');
    
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Use singleton storage instance
    const storage = getStorage();
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