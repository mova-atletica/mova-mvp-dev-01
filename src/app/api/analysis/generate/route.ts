import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function POST(request: NextRequest) {
  const prisma = new PrismaClient();
  try {
    const { exerciseId, exerciseType } = await request.json();
    
    console.log('🔧 Generating analysis for exercise:', exerciseId, 'type:', exerciseType);

    // Fetch exercise data
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        repAnalysis: true,
        poseAnalysis: true,
      }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // For now, create basic analysis data based on exercise type
    // TODO: Update pipeline to work with new schema
    
    if (exerciseType === 'repetition') {
      // Create basic RepAnalysis for repetition exercises
      await prisma.repAnalysis.upsert({
        where: { exerciseId },
        update: {
          goldStandardRep: null,
          repBoundaries: null,
          jointAngleRules: null,
          adminNotes: 'Generated automatically - needs admin review',
          validatedByAdmin: false,
        },
        create: {
          exerciseId,
          goldStandardRep: null,
          repBoundaries: null,
          jointAngleRules: null,
          adminNotes: 'Generated automatically - needs admin review',
          validatedByAdmin: false,
        }
      });
    }

    if (exerciseType === 'pose') {
      // Create basic PoseAnalysis for pose exercises
      await prisma.poseAnalysis.upsert({
        where: { exerciseId },
        update: {
          targetPoses: '[]',
          angleRanges: '{}',
          primaryJoints: null,
          toleranceMultipliers: null,
          feedbackMessages: null,
          adminNotes: 'Generated automatically - needs admin review',
          validatedByAdmin: false,
        },
        create: {
          exerciseId,
          targetPoses: '[]',
          angleRanges: '{}',
          primaryJoints: null,
          toleranceMultipliers: null,
          feedbackMessages: null,
          adminNotes: 'Generated automatically - needs admin review',
          validatedByAdmin: false,
        }
      });
    }

    console.log('✅ Analysis data generated successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Analysis data generated successfully',
      exerciseType 
    });

  } catch (error) {
    console.error('❌ Error generating analysis:', error);
    return NextResponse.json({ 
      error: 'Failed to generate analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}