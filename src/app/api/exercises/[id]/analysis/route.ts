import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Helper function to safely parse JSON
function safeJsonParse(jsonString: string | null): any {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = new PrismaClient();
  try {
    const { id } = await params;
    
    console.log('🔍 Fetching analysis data for exercise:', id);

    const exerciseWithRelations = await prisma.exercise.findUnique({
      where: { id },
      include: {
        repAnalysis: true,
        poseAnalysis: true,
      }
    });

    if (!exerciseWithRelations) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Parse string fields to arrays for consistency with main exercises API
    const parsedExercise = {
      ...exerciseWithRelations,
      // Convert string fields to arrays for consistency with main exercises API
      tags: exerciseWithRelations.tags ? exerciseWithRelations.tags.split(',') : [],
      equipment: exerciseWithRelations.equipment ? exerciseWithRelations.equipment.split(',') : [],
      muscleGroups: exerciseWithRelations.muscleGroups ? exerciseWithRelations.muscleGroups.split(',') : [],
      jointsOfInterest: exerciseWithRelations.jointsOfInterest ? exerciseWithRelations.jointsOfInterest.split(',') : [],
      instructions: exerciseWithRelations.instructions ? JSON.parse(exerciseWithRelations.instructions) : [],
      relatedExercises: exerciseWithRelations.relatedExercises ? exerciseWithRelations.relatedExercises.split(',') : [],
      repAnalysis: exerciseWithRelations.repAnalysis ? {
        id: exerciseWithRelations.repAnalysis.id,
        exerciseId: exerciseWithRelations.repAnalysis.exerciseId,
        goldStandardRep: safeJsonParse(exerciseWithRelations.repAnalysis.goldStandardRep),
        repBoundaries: safeJsonParse(exerciseWithRelations.repAnalysis.repBoundaries),
        jointAngleRules: safeJsonParse(exerciseWithRelations.repAnalysis.jointAngleRules),
        adminNotes: exerciseWithRelations.repAnalysis.adminNotes,
        validatedByAdmin: exerciseWithRelations.repAnalysis.validatedByAdmin,
        createdAt: exerciseWithRelations.repAnalysis.createdAt,
        updatedAt: exerciseWithRelations.repAnalysis.updatedAt,
      } : null,
      poseAnalysis: exerciseWithRelations.poseAnalysis ? {
        id: exerciseWithRelations.poseAnalysis.id,
        exerciseId: exerciseWithRelations.poseAnalysis.exerciseId,
        targetPoses: safeJsonParse(exerciseWithRelations.poseAnalysis.targetPoses),
        angleRanges: safeJsonParse(exerciseWithRelations.poseAnalysis.angleRanges),
        primaryJoints: safeJsonParse(exerciseWithRelations.poseAnalysis.primaryJoints),
        toleranceMultipliers: safeJsonParse(exerciseWithRelations.poseAnalysis.toleranceMultipliers),
        feedbackMessages: safeJsonParse(exerciseWithRelations.poseAnalysis.feedbackMessages),
        adminNotes: exerciseWithRelations.poseAnalysis.adminNotes,
        validatedByAdmin: exerciseWithRelations.poseAnalysis.validatedByAdmin,
        createdAt: exerciseWithRelations.poseAnalysis.createdAt,
        updatedAt: exerciseWithRelations.poseAnalysis.updatedAt,
      } : null,
    };

    console.log('✅ Analysis data fetched successfully');
    console.log('Rep Analysis available:', !!parsedExercise.repAnalysis);
    console.log('Pose Analysis available:', !!parsedExercise.poseAnalysis);

    return NextResponse.json({ exercise: parsedExercise });
  } catch (error) {
    console.error('❌ Error fetching analysis data:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = new PrismaClient();
  try {
    const { id } = await params;
    const adminData = await request.json();
    
    console.log('🔧 Updating analysis data for exercise:', id);
    console.log('Admin data received:', Object.keys(adminData));

    // Update RepAnalysis with enhanced fields
    if (adminData.repAnalysis) {
      console.log('Updating RepAnalysis with data:', adminData.repAnalysis);
      
      try {
        await prisma.repAnalysis.upsert({
          where: { exerciseId: id },
          update: {
            goldStandardRep: adminData.repAnalysis.goldStandardRep ? JSON.stringify(adminData.repAnalysis.goldStandardRep) : undefined,
            repBoundaries: adminData.repAnalysis.repBoundaries ? JSON.stringify(adminData.repAnalysis.repBoundaries) : undefined,
            jointAngleRules: adminData.repAnalysis.jointAngleRules ? JSON.stringify(adminData.repAnalysis.jointAngleRules) : undefined,
            adminNotes: adminData.repAnalysis.adminNotes,
            validatedByAdmin: adminData.repAnalysis.validatedByAdmin,
          },
          create: {
            exerciseId: id,
            goldStandardRep: adminData.repAnalysis.goldStandardRep ? JSON.stringify(adminData.repAnalysis.goldStandardRep) : null,
            repBoundaries: adminData.repAnalysis.repBoundaries ? JSON.stringify(adminData.repAnalysis.repBoundaries) : null,
            jointAngleRules: adminData.repAnalysis.jointAngleRules ? JSON.stringify(adminData.repAnalysis.jointAngleRules) : null,
            adminNotes: adminData.repAnalysis.adminNotes || '',
            validatedByAdmin: adminData.repAnalysis.validatedByAdmin || false,
          }
        });
        console.log('RepAnalysis updated successfully');
      } catch (repAnalysisError) {
        console.error('Error updating RepAnalysis:', repAnalysisError);
        throw repAnalysisError;
      }
    }

    // Update PoseAnalysis with enhanced fields
    if (adminData.poseAnalysis) {
      console.log('Updating PoseAnalysis with data:', adminData.poseAnalysis);
      
      try {
        await prisma.poseAnalysis.upsert({
          where: { exerciseId: id },
          update: {
            targetPoses: adminData.poseAnalysis.targetPoses ? JSON.stringify(adminData.poseAnalysis.targetPoses) : undefined,
            angleRanges: adminData.poseAnalysis.angleRanges ? JSON.stringify(adminData.poseAnalysis.angleRanges) : undefined,
            primaryJoints: adminData.poseAnalysis.primaryJoints ? JSON.stringify(adminData.poseAnalysis.primaryJoints) : undefined,
            toleranceMultipliers: adminData.poseAnalysis.toleranceMultipliers ? JSON.stringify(adminData.poseAnalysis.toleranceMultipliers) : undefined,
            feedbackMessages: adminData.poseAnalysis.feedbackMessages ? JSON.stringify(adminData.poseAnalysis.feedbackMessages) : undefined,
            adminNotes: adminData.poseAnalysis.adminNotes,
            validatedByAdmin: adminData.poseAnalysis.validatedByAdmin,
          },
          create: {
            exerciseId: id,
            targetPoses: adminData.poseAnalysis.targetPoses ? JSON.stringify(adminData.poseAnalysis.targetPoses) : '[]',
            angleRanges: adminData.poseAnalysis.angleRanges ? JSON.stringify(adminData.poseAnalysis.angleRanges) : '{}',
            primaryJoints: adminData.poseAnalysis.primaryJoints ? JSON.stringify(adminData.poseAnalysis.primaryJoints) : null,
            toleranceMultipliers: adminData.poseAnalysis.toleranceMultipliers ? JSON.stringify(adminData.poseAnalysis.toleranceMultipliers) : null,
            feedbackMessages: adminData.poseAnalysis.feedbackMessages ? JSON.stringify(adminData.poseAnalysis.feedbackMessages) : null,
            adminNotes: adminData.poseAnalysis.adminNotes || '',
            validatedByAdmin: adminData.poseAnalysis.validatedByAdmin || false,
          }
        });
        console.log('PoseAnalysis updated successfully');
      } catch (poseAnalysisError) {
        console.error('Error updating PoseAnalysis:', poseAnalysisError);
        throw poseAnalysisError;
      }
    }

    console.log('✅ Analysis data updated successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating analysis data:', error);
    return NextResponse.json({ error: 'Failed to update analysis data' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = new PrismaClient();
  try {
    const { id } = await params;
    const analysisData = await request.json();
    
    console.log('🔧 Creating analysis data for exercise:', id);

    // Create or update RepAnalysis
    if (analysisData.repAnalysis) {
      await prisma.repAnalysis.upsert({
        where: { exerciseId: id },
        update: {
          goldStandardRep: JSON.stringify(analysisData.repAnalysis.goldStandardRep),
          repBoundaries: JSON.stringify(analysisData.repAnalysis.repBoundaries),
          jointAngleRules: JSON.stringify(analysisData.repAnalysis.jointAngleRules),
          adminNotes: analysisData.repAnalysis.adminNotes,
          validatedByAdmin: analysisData.repAnalysis.validatedByAdmin,
        },
        create: {
          exerciseId: id,
          goldStandardRep: JSON.stringify(analysisData.repAnalysis.goldStandardRep),
          repBoundaries: JSON.stringify(analysisData.repAnalysis.repBoundaries),
          jointAngleRules: JSON.stringify(analysisData.repAnalysis.jointAngleRules),
          adminNotes: analysisData.repAnalysis.adminNotes || '',
          validatedByAdmin: analysisData.repAnalysis.validatedByAdmin || false,
        }
      });
    }

    // Create or update PoseAnalysis
    if (analysisData.poseAnalysis) {
      await prisma.poseAnalysis.upsert({
        where: { exerciseId: id },
        update: {
          targetPoses: JSON.stringify(analysisData.poseAnalysis.targetPoses),
          angleRanges: JSON.stringify(analysisData.poseAnalysis.angleRanges),
          primaryJoints: analysisData.poseAnalysis.primaryJoints ? JSON.stringify(analysisData.poseAnalysis.primaryJoints) : null,
          toleranceMultipliers: analysisData.poseAnalysis.toleranceMultipliers ? JSON.stringify(analysisData.poseAnalysis.toleranceMultipliers) : null,
          feedbackMessages: analysisData.poseAnalysis.feedbackMessages ? JSON.stringify(analysisData.poseAnalysis.feedbackMessages) : null,
          adminNotes: analysisData.poseAnalysis.adminNotes,
          validatedByAdmin: analysisData.poseAnalysis.validatedByAdmin,
        },
        create: {
          exerciseId: id,
          targetPoses: JSON.stringify(analysisData.poseAnalysis.targetPoses),
          angleRanges: JSON.stringify(analysisData.poseAnalysis.angleRanges),
          primaryJoints: analysisData.poseAnalysis.primaryJoints ? JSON.stringify(analysisData.poseAnalysis.primaryJoints) : null,
          toleranceMultipliers: analysisData.poseAnalysis.toleranceMultipliers ? JSON.stringify(analysisData.poseAnalysis.toleranceMultipliers) : null,
          feedbackMessages: analysisData.poseAnalysis.feedbackMessages ? JSON.stringify(analysisData.poseAnalysis.feedbackMessages) : null,
          adminNotes: analysisData.poseAnalysis.adminNotes || '',
          validatedByAdmin: analysisData.poseAnalysis.validatedByAdmin || false,
        }
      });
    }

    console.log('✅ Analysis data created successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error creating analysis data:', error);
    return NextResponse.json({ error: 'Failed to create analysis data' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}