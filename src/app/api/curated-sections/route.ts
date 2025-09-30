import { NextRequest, NextResponse } from 'next/server';
// Initialize Prisma client
let prisma: any = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (error) {
  console.warn('Prisma not available:', error);
}

// GET all curated sections
export async function GET() {
  try {
    // Debug logging
    console.log('Curated Sections API Debug:', {
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

    
    const sections = await prisma.curatedSection.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching curated sections:', error);
    return NextResponse.json({ error: 'Failed to fetch curated sections' }, { status: 500 });
  }
}

// POST create new curated section
export async function POST(req: NextRequest) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
    const data = await req.json();
    
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
    
    const section = await prisma.curatedSection.create({
      data: {
        title: data.title,
        description: data.description || '',
        order: data.order || 0,
        exercises: exercisesData
      }
    });
    return NextResponse.json(section);
  } catch (error) {
    console.error('Error creating curated section:', error);
    return NextResponse.json({ error: 'Failed to create curated section' }, { status: 500 });
  }
} 