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

// PUT update curated section
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    const data = await req.json();
    const { id } = await params;
    
    // Handle both old format (array of IDs) and new format (array of objects with order)
    let exercisesData;
    if (Array.isArray(data.exercises)) {
      if (data.exercises.length > 0 && typeof data.exercises[0] === 'object') {
        // New format: [{id: "exerciseId", order: 0}, ...]
        exercisesData = JSON.stringify(data.exercises);
      } else {
        // Old format: ["exerciseId1", "exerciseId2", ...] - convert to new format
        exercisesData = JSON.stringify(data.exercises.map((id: string, index: number) => ({
          id,
          order: index
        })));
      }
    } else {
      exercisesData = '[]';
    }
    
    const section = await prisma.curatedSection.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || '',
        order: data.order || 0,
        exercises: exercisesData
      }
    });
    return NextResponse.json(section);
  } catch (error) {
    console.error('Error updating curated section:', error);
    return NextResponse.json({ error: 'Failed to update curated section' }, { status: 500 });
  }
}

// DELETE curated section
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    const { id } = await params;
    await prisma.curatedSection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting curated section:', error);
    return NextResponse.json({ error: 'Failed to delete curated section' }, { status: 500 });
  }
} 