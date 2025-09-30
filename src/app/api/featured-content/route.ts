import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all featured content
export async function GET() {
  try {

    
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