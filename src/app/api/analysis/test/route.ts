import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exerciseId } = body;

    if (!exerciseId) {
      return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    // Fetch exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Fetch analysis data separately
    const repAnalysis = await prisma.repAnalysis.findUnique({
      where: { exerciseId }
    });

    const patternAnalysis = await prisma.patternAnalysis.findUnique({
      where: { exerciseId }
    });

    const analysisQuality = await prisma.analysisQuality.findUnique({
      where: { exerciseId }
    });

    // Return the analysis data
    return NextResponse.json({
      exercise: {
        id: exercise.id,
        title: exercise.title,
        exerciseType: exercise.exerciseType,
        repAnalysis,
        patternAnalysis,
        analysisQuality
      }
    });

  } catch (error) {
    console.error('Error testing analysis:', error);
    return NextResponse.json(
      { error: 'Failed to test analysis' },
      { status: 500 }
    );
  }
} 