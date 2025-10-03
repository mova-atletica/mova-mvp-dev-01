import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// GET - Fetch specific featured content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = new PrismaClient();
  try {
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
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update featured content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = new PrismaClient();
  try {
    const { id } = await params;
    const updateData = await request.json();

    const updatedContent = await prisma.featuredContent.update({
      where: { id },
      data: {
        title: updateData.title,
        description: updateData.description,
        heroImage: updateData.heroImage,
        exerciseId: updateData.exerciseId,
        ctaText: updateData.ctaText,
        ctaUrl: updateData.ctaUrl,
        badgeText: updateData.badgeText,
        order: updateData.order,
        isActive: updateData.isActive,
      },
    });

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('Error updating featured content:', error);
    return NextResponse.json(
      { error: 'Failed to update featured content' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete featured content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = new PrismaClient();
  try {
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
  } finally {
    await prisma.$disconnect();
  }
}