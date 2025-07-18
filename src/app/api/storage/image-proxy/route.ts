import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/gcs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Get signed URL for the image
    const signedUrl = await getSignedUrl(fileName);
    
    // Fetch the image from GCS
    const imageResponse = await fetch(signedUrl);
    
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Get image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
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