import { NextRequest, NextResponse } from 'next/server';
// Skip database operations during build time (Vercel deployment)
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;

let prisma: any = null;
if (!isBuildTime) {
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (error) {
    console.warn('Prisma not available during build');
  }
}

// GET - Fetch all featured content
export async function GET() {
  try {
    // Debug logging
    console.log('Featured Content API Debug:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      isBuildTime,
      prisma: prisma ? 'INITIALIZED' : 'NOT INITIALIZED'
    });
    
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
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
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
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