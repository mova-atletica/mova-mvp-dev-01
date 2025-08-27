import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Populating analysis data for exercises');

    // Find exercises that need analysis data
    const exercises = await prisma.exercise.findMany({
      where: {
        referenceKeypointsUrl: {
          not: ""
        }
      },
      include: {
        repAnalysis: true,
        poseAnalysis: true,
      }
    });

    console.log(`Found ${exercises.length} exercises to populate`);

    let processed = 0;
    let failed = 0;

    for (const exercise of exercises) {
      try {
        console.log(`Processing exercise: ${exercise.title}`);

        // Determine exercise type
        const exerciseType = exercise.exerciseType || 'repetition';

        // Create basic analysis based on exercise type
        if (exerciseType === 'repetition' && !exercise.repAnalysis) {
          await prisma.repAnalysis.create({
            data: {
              exerciseId: exercise.id,
              goldStandardRep: null,
              repBoundaries: null,
              jointAngleRules: null,
              adminNotes: 'Populated automatically - needs admin review',
              validatedByAdmin: false,
            }
          });
          console.log(`✅ Created RepAnalysis for: ${exercise.title}`);
        }

        if (exerciseType === 'pose' && !exercise.poseAnalysis) {
          await prisma.poseAnalysis.create({
            data: {
              exerciseId: exercise.id,
              targetPoses: JSON.stringify([]),
              angleRanges: JSON.stringify({}),
              primaryJoints: null,
              toleranceMultipliers: null,
              feedbackMessages: null,
              adminNotes: 'Populated automatically - needs admin review',
              validatedByAdmin: false,
            }
          });
          console.log(`✅ Created PoseAnalysis for: ${exercise.title}`);
        }

        processed++;
      } catch (error) {
        console.error(`❌ Error processing exercise ${exercise.title}:`, error);
        failed++;
      }
    }

    console.log('✅ Population completed');
    return NextResponse.json({ 
      success: true,
      message: `Populated ${processed} exercises successfully, ${failed} failed`,
      processed,
      failed,
      total: exercises.length
    });

  } catch (error) {
    console.error('❌ Error populating analysis data:', error);
    return NextResponse.json({ error: 'Failed to populate analysis data' }, { status: 500 });
  }
}
