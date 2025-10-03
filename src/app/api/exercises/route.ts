import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// CREATE a new exercise
export async function POST(req: NextRequest) {
  const prisma = new PrismaClient();
  try {
    const data = await req.json();
    const exercise = await prisma.exercise.create({
      data: {
        ...data,
        // All fields are already strings from the frontend
        // No need to join or stringify again
      }
    });
    return NextResponse.json(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  const prisma = new PrismaClient();
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
  } finally {
    await prisma.$disconnect();
  }
}
