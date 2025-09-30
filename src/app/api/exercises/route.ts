import { NextRequest, NextResponse } from 'next/server';

// Initialize Prisma client
let prisma: any = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (error) {
  console.warn('Prisma not available:', error);
}

// CREATE a new exercise
export async function POST(req: NextRequest) {
  // Check if Prisma is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database not available',
      message: 'This endpoint requires database access'
    }, { status: 503 });
  }

  const data = await req.json();
  const exercise = await prisma.exercise.create({
    data: {
      ...data,
      // All fields are already strings from the frontend
      // No need to join or stringify again
    }
  });
  return NextResponse.json(exercise);
}

export async function GET() {
  try {
o u     // Debug logging
    console.log('Exercises API Debug:', {
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

    const exercises = await prisma.exercise.findMany({
      select: {
        id: true,
        title: true,
        referenceVideoUrl: true,
        referenceKeypointsUrl: true,
      }
    });

    console.log('🔍 All exercises in database:', exercises);
    return NextResponse.json({ exercises });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}
