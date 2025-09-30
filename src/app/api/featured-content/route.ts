import { NextRequest, NextResponse } from 'next/server';
// Initialize Prisma client
let prisma: any = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
} catch (error) {
  console.warn('Prisma not available:', error);
}

// GET - Fetch all featured content
export async function GET() {
  try {
    // Debug logging
    console.log('Featured Content API Debug:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      prisma: prisma ? 'INITIALIZED' : 'NOT INITIALIZED'
    });
    
    // Check if Prisma is available
    if (!prisma) {
      return NextResponse.json({ 
        error: 'Database not available',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
    const featuredContent = await prisma.featuredContent.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    
    return NextResponse.json(featuredContent);
  } catch (error) {
    console.error('Error fetching featured content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured content' },
      { status: 500 }
    );
  }
}

// POST - Create new featured content
export async function POST(request: NextRequest) {
  try {
    // Check if Prisma is available
    if (!prisma) {
      return NextResponse.json({ 
        error: 'Database not available',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
    const body = await request.json();
    const {
      title,
      description,
      heroImage,
      exerciseId,
      ctaText,
      ctaUrl,
      badgeText,
      order
    } = body;

    const featuredContent = await prisma.featuredContent.create({
      data: {
        title,
        description,
        heroImage,
        exerciseId,
        ctaText: ctaText || 'Try Now',
        ctaUrl,
        badgeText: badgeText || 'Featured Exercise',
        order: order || 0,
      },
    });

    return NextResponse.json(featuredContent);
  } catch (error) {
    console.error('Error creating featured content:', error);
    return NextResponse.json(
      { error: 'Failed to create featured content' },
      { status: 500 }
    );
  }
} 