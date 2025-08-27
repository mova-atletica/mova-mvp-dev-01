import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (!exerciseId) {
      return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    console.log('🔧 Testing analysis data for exercise:', exerciseId);

    // Fetch exercise with analysis data
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

    // Test data structure
    const testData = {
      exercise: {
        id: exercise.id,
        title: exercise.title,
        exerciseType: exercise.exerciseType,
        repAnalysis: exercise.repAnalysis ? {
          id: exercise.repAnalysis.id,
          goldStandardRep: exercise.repAnalysis.goldStandardRep,
          repBoundaries: exercise.repAnalysis.repBoundaries,
          jointAngleRules: exercise.repAnalysis.jointAngleRules,
          adminNotes: exercise.repAnalysis.adminNotes,
          validatedByAdmin: exercise.repAnalysis.validatedByAdmin,
        } : null,
        poseAnalysis: exercise.poseAnalysis ? {
          id: exercise.poseAnalysis.id,
          targetPoses: exercise.poseAnalysis.targetPoses,
          angleRanges: exercise.poseAnalysis.angleRanges,
          primaryJoints: exercise.poseAnalysis.primaryJoints,
          toleranceMultipliers: exercise.poseAnalysis.toleranceMultipliers,
          feedbackMessages: exercise.poseAnalysis.feedbackMessages,
          adminNotes: exercise.poseAnalysis.adminNotes,
          validatedByAdmin: exercise.poseAnalysis.validatedByAdmin,
        } : null,
      }
    };

    console.log('✅ Test data retrieved successfully');
    return NextResponse.json(testData);

  } catch (error) {
    console.error('❌ Error testing analysis data:', error);
    return NextResponse.json({ error: 'Failed to test analysis data' }, { status: 500 });
  }
} 