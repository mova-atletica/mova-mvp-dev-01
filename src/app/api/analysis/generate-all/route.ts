import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Generating analysis for all exercises');

    // Fetch all exercises
    const exercises = await prisma.exercise.findMany({
      include: {
        repAnalysis: true,
        poseAnalysis: true,
      }
    });

    console.log(`Found ${exercises.length} exercises to process`);

    for (const exercise of exercises) {
      try {
        console.log(`Processing exercise: ${exercise.title} (${exercise.id})`);

        // Determine exercise type
        const exerciseType = exercise.exerciseType || 'repetition';

        // Create basic analysis based on exercise type
        if (exerciseType === 'repetition') {
          // Create basic RepAnalysis for repetition exercises
          await prisma.repAnalysis.upsert({
            where: { exerciseId: exercise.id },
            update: {
              goldStandardRep: null,
              repBoundaries: null,
              jointAngleRules: null,
              adminNotes: 'Generated automatically - needs admin review',
              validatedByAdmin: false,
            },
            create: {
              exerciseId: exercise.id,
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
            where: { exerciseId: exercise.id },
            update: {
              targetPoses: JSON.stringify([]),
              angleRanges: JSON.stringify({}),
              primaryJoints: null,
              toleranceMultipliers: null,
              feedbackMessages: null,
              adminNotes: 'Generated automatically - needs admin review',
              validatedByAdmin: false,
            },
            create: {
              exerciseId: exercise.id,
              targetPoses: JSON.stringify([]),
              angleRanges: JSON.stringify({}),
              primaryJoints: null,
              toleranceMultipliers: null,
              feedbackMessages: null,
              adminNotes: 'Generated automatically - needs admin review',
              validatedByAdmin: false,
            }
          });
        }

        console.log(`✅ Processed exercise: ${exercise.title}`);
      } catch (error) {
        console.error(`❌ Error processing exercise ${exercise.title}:`, error);
        // Continue with next exercise
      }
    }

    console.log('✅ Analysis generation completed for all exercises');
    return NextResponse.json({ 
      success: true, 
      message: `Analysis generated for ${exercises.length} exercises`
    });

  } catch (error) {
    console.error('❌ Error generating analysis for all exercises:', error);
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 });
  }
}
