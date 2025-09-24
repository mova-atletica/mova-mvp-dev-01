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

export async function POST(request: NextRequest) {
  try {
    // Skip during build time
    if (isBuildTime || !prisma) {
      return NextResponse.json({ 
        error: 'API not available during build',
        message: 'This endpoint requires database access'
      }, { status: 503 });
    }

    
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
          targetPoses: JSON.stringify([]),
          angleRanges: JSON.stringify({}),
          primaryJoints: null,
          toleranceMultipliers: null,
          feedbackMessages: null,
          adminNotes: 'Generated automatically - needs admin review',
          validatedByAdmin: false,
        },
        create: {
          exerciseId,
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

    console.log('✅ Analysis generated successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Analysis generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating analysis:', error);
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 });
  }
}
