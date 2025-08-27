import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CREATE a new exercise
export async function POST(req: NextRequest) {
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
