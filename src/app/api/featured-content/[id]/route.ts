import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch specific featured content
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const featuredContent = await prisma.featuredContent.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
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
      isActive,
      order
    } = body;

    const featuredContent = await prisma.featuredContent.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    await prisma.featuredContent.delete({
      where: { id: params.id },
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