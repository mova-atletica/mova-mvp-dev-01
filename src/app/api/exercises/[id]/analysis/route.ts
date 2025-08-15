import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AnalysisPipelineResult } from '@/lib/exerciseAnalysisPipeline';
import { AdminAnalysisData } from '@/types/analysis';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch exercise with all analysis data including new fields
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        repAnalysis: true,
        patternAnalysis: true,
        analysisQuality: true,
        exerciseRules: true,
      } as any
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Parse JSON strings back to objects for the frontend
    const exerciseWithRelations = exercise as any;
    
    // Helper function to safely parse JSON
    const safeJsonParse = (jsonString: string | null) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
      }
    };
    
    const parsedExercise = {
      ...exercise,
      repAnalysis: exerciseWithRelations.repAnalysis ? {
        ...exerciseWithRelations.repAnalysis,
        // focused fields for admin analysis
        goldStandardRep: safeJsonParse(exerciseWithRelations.repAnalysis.goldStandardRep),
        repBoundaries: safeJsonParse(exerciseWithRelations.repAnalysis.repBoundaries),
        adminNotes: exerciseWithRelations.repAnalysis.adminNotes,
        jointAngleRules: safeJsonParse(exerciseWithRelations.repAnalysis.jointAngleRules),
        repCountingRules: safeJsonParse(exerciseWithRelations.repAnalysis.repCountingRules),
        validatedByAdmin: exerciseWithRelations.repAnalysis.validatedByAdmin,
      } : null,
      patternAnalysis: exerciseWithRelations.patternAnalysis ? {
        ...exerciseWithRelations.patternAnalysis,
        referencePatterns: safeJsonParse(exerciseWithRelations.patternAnalysis.referencePatterns),
        angleRanges: safeJsonParse(exerciseWithRelations.patternAnalysis.angleRanges),
        posePatterns: safeJsonParse(exerciseWithRelations.patternAnalysis.posePatterns),
        flowPatterns: safeJsonParse(exerciseWithRelations.patternAnalysis.flowPatterns),
        primaryJoints: safeJsonParse(exerciseWithRelations.patternAnalysis.primaryJoints),
        toleranceMultipliers: safeJsonParse(exerciseWithRelations.patternAnalysis.toleranceMultipliers),
      } : null,
      analysisQuality: exerciseWithRelations.analysisQuality ? {
        ...exerciseWithRelations.analysisQuality,
        issues: safeJsonParse(exerciseWithRelations.analysisQuality.issues),
      } : null,
      exerciseRules: exerciseWithRelations.exerciseRules ? {
        ...exerciseWithRelations.exerciseRules,
        rules: safeJsonParse(exerciseWithRelations.exerciseRules.rules),
        thresholds: safeJsonParse(exerciseWithRelations.exerciseRules.thresholds),
      } : null,
    };

    return NextResponse.json({ exercise: parsedExercise });

  } catch (error) {
    console.error('Error fetching analysis data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminData: AdminAnalysisData = await request.json();

    console.log('PUT /api/exercises/[id]/analysis - Received data:', {
      id,
      adminData: JSON.stringify(adminData, null, 2)
    });

    // Verify the exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Update exercise fields (exerciseType, jointsOfInterest)
    const exerciseUpdateData: any = {};
    
    if (adminData.exerciseType) {
      exerciseUpdateData.exerciseType = adminData.exerciseType;
    }
    
    if (adminData.jointsOfInterest !== undefined) {
      // Convert array to comma-separated string for database storage
      exerciseUpdateData.jointsOfInterest = Array.isArray(adminData.jointsOfInterest) 
        ? adminData.jointsOfInterest.join(',') 
        : adminData.jointsOfInterest;
    }
    
    if (Object.keys(exerciseUpdateData).length > 0) {
      await prisma.exercise.update({
        where: { id },
        data: exerciseUpdateData
      });
      console.log('Updated exercise fields:', exerciseUpdateData);
    }

    // Update RepAnalysis with enhanced fields
    if (adminData.repAnalysis) {
      console.log('Updating RepAnalysis with data:', adminData.repAnalysis);
      
      try {
        await (prisma.repAnalysis as any).upsert({
          where: { exerciseId: id },
          update: {
            // Only fields that exist in the current database schema
            goldStandardRep: adminData.repAnalysis.goldStandardRep ? JSON.stringify(adminData.repAnalysis.goldStandardRep) : null,
            repBoundaries: adminData.repAnalysis.repBoundaries ? JSON.stringify(adminData.repAnalysis.repBoundaries) : null,
            adminNotes: adminData.repAnalysis.adminNotes,
            jointAngleRules: adminData.repAnalysis.jointAngleRules ? JSON.stringify(adminData.repAnalysis.jointAngleRules) : null,
            repCountingRules: adminData.repAnalysis.repCountingRules ? JSON.stringify(adminData.repAnalysis.repCountingRules) : null,
            validatedByAdmin: adminData.repAnalysis.validatedByAdmin,
          },
          create: {
            exerciseId: id,
            // Only fields that exist in the current database schema
            goldStandardRep: adminData.repAnalysis.goldStandardRep ? JSON.stringify(adminData.repAnalysis.goldStandardRep) : null,
            repBoundaries: adminData.repAnalysis.repBoundaries ? JSON.stringify(adminData.repAnalysis.repBoundaries) : null,
            adminNotes: adminData.repAnalysis.adminNotes,
            jointAngleRules: adminData.repAnalysis.jointAngleRules ? JSON.stringify(adminData.repAnalysis.jointAngleRules) : null,
            repCountingRules: adminData.repAnalysis.repCountingRules ? JSON.stringify(adminData.repAnalysis.repCountingRules) : null,
            validatedByAdmin: adminData.repAnalysis.validatedByAdmin,
          }
        });
        console.log('RepAnalysis updated successfully');
      } catch (repAnalysisError) {
        console.error('Error updating RepAnalysis:', repAnalysisError);
        throw repAnalysisError;
      }
    }

    // Update PatternAnalysis with enhanced fields
    if (adminData.patternAnalysis) {
      console.log('Updating PatternAnalysis with data:', adminData.patternAnalysis);
      
      try {
        await (prisma.patternAnalysis as any).upsert({
          where: { exerciseId: id },
          update: {
            // Existing fields
            referencePatterns: adminData.patternAnalysis.referencePatterns ? JSON.stringify(adminData.patternAnalysis.referencePatterns) : undefined,
            angleRanges: adminData.patternAnalysis.angleRanges ? JSON.stringify(adminData.patternAnalysis.angleRanges) : undefined,
            posePatterns: adminData.patternAnalysis.posePatterns ? JSON.stringify(adminData.patternAnalysis.posePatterns) : undefined,
            flowPatterns: adminData.patternAnalysis.flowPatterns ? JSON.stringify(adminData.patternAnalysis.flowPatterns) : undefined,
            patternQuality: adminData.patternAnalysis.patternQuality,
            validatedByAdmin: adminData.patternAnalysis.validatedByAdmin,
            
            // New enhanced fields
            primaryJoints: adminData.patternAnalysis.primaryJoints ? JSON.stringify(adminData.patternAnalysis.primaryJoints) : undefined,
            toleranceMultipliers: adminData.patternAnalysis.toleranceMultipliers ? JSON.stringify(adminData.patternAnalysis.toleranceMultipliers) : undefined,
            adminNotes: adminData.patternAnalysis.adminNotes,
          },
          create: {
            exerciseId: id,
            // Existing fields
            referencePatterns: adminData.patternAnalysis.referencePatterns ? JSON.stringify(adminData.patternAnalysis.referencePatterns) : '',
            angleRanges: adminData.patternAnalysis.angleRanges ? JSON.stringify(adminData.patternAnalysis.angleRanges) : '',
            posePatterns: adminData.patternAnalysis.posePatterns ? JSON.stringify(adminData.patternAnalysis.posePatterns) : '',
            flowPatterns: adminData.patternAnalysis.flowPatterns ? JSON.stringify(adminData.patternAnalysis.flowPatterns) : '',
            patternQuality: adminData.patternAnalysis.patternQuality,
            validatedByAdmin: adminData.patternAnalysis.validatedByAdmin,
            
            // New enhanced fields
            primaryJoints: adminData.patternAnalysis.primaryJoints ? JSON.stringify(adminData.patternAnalysis.primaryJoints) : '',
            toleranceMultipliers: adminData.patternAnalysis.toleranceMultipliers ? JSON.stringify(adminData.patternAnalysis.toleranceMultipliers) : '',
            adminNotes: adminData.patternAnalysis.adminNotes,
          }
        });
        console.log('PatternAnalysis updated successfully');
      } catch (patternAnalysisError) {
        console.error('Error updating PatternAnalysis:', patternAnalysisError);
        throw patternAnalysisError;
      }
    }

    // Update AnalysisQuality
    if (adminData.analysisQuality) {
      console.log('Updating AnalysisQuality with data:', adminData.analysisQuality);
      
      try {
        await prisma.analysisQuality.upsert({
          where: { exerciseId: id },
          update: {
            classificationQuality: adminData.analysisQuality.classificationQuality || 0,
            repAnalysisQuality: adminData.analysisQuality.repAnalysisQuality || 0,
            patternQuality: adminData.analysisQuality.patternQuality || 0,
            overallQuality: adminData.analysisQuality.overallQuality || 0,
            issues: adminData.analysisQuality.issues ? JSON.stringify(adminData.analysisQuality.issues) : undefined,
            reviewedByAdmin: adminData.analysisQuality.reviewedByAdmin,
            adminNotes: adminData.analysisQuality.adminNotes,
          },
          create: {
            exerciseId: id,
            classificationQuality: adminData.analysisQuality.classificationQuality || 0,
            repAnalysisQuality: adminData.analysisQuality.repAnalysisQuality || 0,
            patternQuality: adminData.analysisQuality.patternQuality || 0,
            overallQuality: adminData.analysisQuality.overallQuality || 0,
            issues: adminData.analysisQuality.issues ? JSON.stringify(adminData.analysisQuality.issues) : '',
            reviewedByAdmin: adminData.analysisQuality.reviewedByAdmin,
            adminNotes: adminData.analysisQuality.adminNotes,
          }
        });
        console.log('AnalysisQuality updated successfully');
      } catch (analysisQualityError) {
        console.error('Error updating AnalysisQuality:', analysisQualityError);
        throw analysisQualityError;
      }
    }

    // Create or update ExerciseRules
    if (adminData.exerciseRules) {
      console.log('Updating ExerciseRules with data:', adminData.exerciseRules);
      
      try {
        await (prisma as any).exerciseRules.upsert({
          where: { exerciseId: id },
          update: {
            rules: adminData.exerciseRules.rules ? JSON.stringify(adminData.exerciseRules.rules) : undefined,
            thresholds: adminData.exerciseRules.thresholds ? JSON.stringify(adminData.exerciseRules.thresholds) : undefined,
            validatedByAdmin: adminData.exerciseRules.validatedByAdmin,
          },
          create: {
            exerciseId: id,
            rules: adminData.exerciseRules.rules ? JSON.stringify(adminData.exerciseRules.rules) : '',
            thresholds: adminData.exerciseRules.thresholds ? JSON.stringify(adminData.exerciseRules.thresholds) : '',
            validatedByAdmin: adminData.exerciseRules.validatedByAdmin,
          }
        });
        console.log('ExerciseRules updated successfully');
      } catch (exerciseRulesError) {
        console.error('Error updating ExerciseRules:', exerciseRulesError);
        throw exerciseRulesError;
      }
    }

    console.log('All updates completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Admin analysis data updated successfully' 
    });

  } catch (error) {
    console.error('Error updating admin analysis data:', error);
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: 'Failed to update admin analysis data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysisData: AnalysisPipelineResult = await request.json();

    // Verify the exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Update exercise with classification data
    await prisma.exercise.update({
      where: { id },
      data: {
        exerciseType: analysisData.classification.exerciseType,
        exerciseSubtype: analysisData.classification.exerciseSubtype,
        classificationConfidence: analysisData.classification.confidence,
      }
    });

    // Create or update RepAnalysis
    if (analysisData.repAnalysis) {
      const repAnalysisData = analysisData.repAnalysis as any;
      await (prisma.repAnalysis as any).upsert({
        where: { exerciseId: id },
        update: {
          // focused fields for admin analysis
          goldStandardRep: repAnalysisData.goldStandardRep ? JSON.stringify(repAnalysisData.goldStandardRep) : null,
          repBoundaries: repAnalysisData.repBoundaries ? JSON.stringify(repAnalysisData.repBoundaries) : null,
          adminNotes: repAnalysisData.adminNotes || null,
          jointAngleRules: repAnalysisData.jointAngleRules ? JSON.stringify(repAnalysisData.jointAngleRules) : null,
          repCountingRules: repAnalysisData.repCountingRules ? JSON.stringify(repAnalysisData.repCountingRules) : null,
          validatedByAdmin: repAnalysisData.validatedByAdmin || false,
        },
        create: {
          exerciseId: id,
          // focused fields for admin analysis
          goldStandardRep: repAnalysisData.goldStandardRep ? JSON.stringify(repAnalysisData.goldStandardRep) : null,
          repBoundaries: repAnalysisData.repBoundaries ? JSON.stringify(repAnalysisData.repBoundaries) : null,
          adminNotes: repAnalysisData.adminNotes || null,
          jointAngleRules: repAnalysisData.jointAngleRules ? JSON.stringify(repAnalysisData.jointAngleRules) : null,
          repCountingRules: repAnalysisData.repCountingRules ? JSON.stringify(repAnalysisData.repCountingRules) : null,
          validatedByAdmin: repAnalysisData.validatedByAdmin || false,
        }
      });
    }

    // Create or update PatternAnalysis
    if (analysisData.patternAnalysis) {
      await prisma.patternAnalysis.upsert({
        where: { exerciseId: id },
        update: {
          referencePatterns: JSON.stringify(analysisData.patternAnalysis.referencePatterns),
          angleRanges: JSON.stringify(analysisData.patternAnalysis.angleRanges),
          posePatterns: analysisData.patternAnalysis.posePatterns ? JSON.stringify(analysisData.patternAnalysis.posePatterns) : null,
          flowPatterns: analysisData.patternAnalysis.flowPatterns ? JSON.stringify(analysisData.patternAnalysis.flowPatterns) : null,
          patternQuality: analysisData.patternAnalysis.patternQuality,
        },
        create: {
          exerciseId: id,
          referencePatterns: JSON.stringify(analysisData.patternAnalysis.referencePatterns),
          angleRanges: JSON.stringify(analysisData.patternAnalysis.angleRanges),
          posePatterns: analysisData.patternAnalysis.posePatterns ? JSON.stringify(analysisData.patternAnalysis.posePatterns) : null,
          flowPatterns: analysisData.patternAnalysis.flowPatterns ? JSON.stringify(analysisData.patternAnalysis.flowPatterns) : null,
          patternQuality: analysisData.patternAnalysis.patternQuality,
        }
      });
    }

    // Create or update AnalysisQuality
    if (analysisData.quality) {
      await prisma.analysisQuality.upsert({
        where: { exerciseId: id },
        update: {
          classificationQuality: analysisData.quality.classificationQuality,
          repAnalysisQuality: analysisData.quality.repAnalysisQuality,
          patternQuality: analysisData.quality.patternQuality,
          overallQuality: analysisData.quality.overallQuality,
          issues: JSON.stringify(analysisData.quality.issues),
        },
        create: {
          exerciseId: id,
          classificationQuality: analysisData.quality.classificationQuality,
          repAnalysisQuality: analysisData.quality.repAnalysisQuality,
          patternQuality: analysisData.quality.patternQuality,
          overallQuality: analysisData.quality.overallQuality,
          issues: JSON.stringify(analysisData.quality.issues),
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Analysis data saved successfully' 
    });

  } catch (error) {
    console.error('Error saving analysis data:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis data' },
      { status: 500 }
    );
  }
}
