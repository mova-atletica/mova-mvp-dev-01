import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip database-dependent API routes during build time
  const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;
  
  if (isBuildTime && request.nextUrl.pathname.startsWith('/api/')) {
    // Allow storage API routes (they don't need database)
    if (request.nextUrl.pathname.startsWith('/api/storage/')) {
      return NextResponse.next();
    }
    
    // Block database-dependent routes during build
    const blockedRoutes = [
      '/api/exercises',
      '/api/analysis',
      '/api/featured-content',
      '/api/curated-sections'
    ];
    
    const isBlocked = blockedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );
    
    if (isBlocked) {
      return NextResponse.json(
        { 
          error: 'API not available during build',
          message: 'This endpoint requires database access'
        },
        { status: 503 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
