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

// GET - Fetch specific featured content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
    const { id } = await params;
    const featuredContent = await prisma.featuredContent.findUnique({
      where: { id },
    });

    if (!featuredContent) {
      return NextResponse.json(
        { error: 'Featured content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(featuredContent);
  } catch (error) {
    console.error('Error fetching featured content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured content' },
      { status: 500 }
    );
  }
}

// PUT - Update featured content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      heroImage,
      exerciseId,
      ctaText,
      ctaUrl,
      badgeText,
      isActive,
      order
    } = body;

    const featuredContent = await prisma.featuredContent.update({
      where: { id },
      data: {
        title,
        description,
        heroImage,
        exerciseId,
        ctaText,
        ctaUrl,
        badgeText,
        isActive,
        order,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(featuredContent);
  } catch (error) {
    console.error('Error updating featured content:', error);
    return NextResponse.json(
      { error: 'Failed to update featured content' },
      { status: 500 }
    );
  }
}

// DELETE - Delete featured content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
    const { id } = await params;
    await prisma.featuredContent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting featured content:', error);
    return NextResponse.json(
      { error: 'Failed to delete featured content' },
      { status: 500 }
    );
  }
} 