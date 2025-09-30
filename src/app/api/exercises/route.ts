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

// CREATE a new exercise
export async function POST(req: NextRequest) {
  // Skip during build time
  if (isBuildTime || !prisma) {
    return NextResponse.json({ 
      error: 'API not available during build',
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
    // Debug logging
    console.log('Exercises API Debug:', {
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
