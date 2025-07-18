import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Get signed URL for the file
    const signedUrlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/storage/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });

    if (!signedUrlResponse.ok) {
      return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
    }

    const { signedUrl } = await signedUrlResponse.json();

    // Fetch the file content server-side
    const fileResponse = await fetch(signedUrl);
    
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 404 });
    }

    const fileContent = await fileResponse.json();

    // Return the file content
    return NextResponse.json(fileContent);

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 