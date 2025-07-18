import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    const signedUrl = await getSignedUrl(fileName);
    
    return NextResponse.json({ 
      success: true, 
      signedUrl 
    });
    
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate signed URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 