import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { runAnalysisPipeline } from '@/lib/exerciseAnalysisPipeline';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exerciseId, exerciseType } = body;

    if (!exerciseId) {
      return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    if (!exerciseType) {
      return NextResponse.json({ error: 'Exercise type is required' }, { status: 400 });
    }

    // Fetch exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Fetch keypoints from storage
    let keypoints = [];
    try {
      if (exercise.referenceKeypointsUrl) {
        const keypointsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/storage/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl })
        });
        if (keypointsResponse.ok) {
          const keypointsData = await keypointsResponse.json();
          keypoints = keypointsData.keypoints || keypointsData;
        }
      }
    } catch (error) {
      console.error('Error fetching keypoints:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch keypoints for analysis',
        details: 'Keypoints file not found or invalid'
      }, { status: 400 });
    }

    if (keypoints.length === 0) {
      return NextResponse.json({ 
        error: 'No keypoints available for analysis',
        details: 'Exercise must have keypoints to generate analysis'
      }, { status: 400 });
    }

    // Parse joints of interest
    const jointsOfInterest = exercise.jointsOfInterest ? 
      exercise.jointsOfInterest.split(',').map(j => j.trim()) : 
      ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'];

    // Run the actual analysis pipeline
    console.log(`Generating analysis for ${exercise.title} with ${keypoints.length} keypoints`);
    const analysisResult = await runAnalysisPipeline(
      keypoints,
      exercise.title,
      jointsOfInterest
    );

    // Update exercise with the selected exercise type
    await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        exerciseType: exerciseType,
        exerciseSubtype: analysisResult.classification.exerciseSubtype,
        classificationConfidence: analysisResult.classification.confidence,
      }
    });

    // Create or update type-specific analysis
    if (exerciseType === 'rep-based' && analysisResult.repAnalysis) {
      await (prisma.repAnalysis as any).upsert({
        where: { exerciseId },
        update: {
          // focused fields for admin analysis
          goldStandardRep: null, // Will be populated by admin editing
          repBoundaries: null, // Will be populated by admin editing
          adminNotes: null, // Will be populated by admin editing
          jointAngleRules: null, // Will be populated by admin editing
          repCountingRules: null, // Will be populated by admin editing
          validatedByAdmin: false,
        },
        create: {
          exerciseId,
          // focused fields for admin analysis
          goldStandardRep: null, // Will be populated by admin editing
          repBoundaries: null, // Will be populated by admin editing
          adminNotes: null, // Will be populated by admin editing
          jointAngleRules: null, // Will be populated by admin editing
          repCountingRules: null, // Will be populated by admin editing
          validatedByAdmin: false,
        }
      });
    }

    // Create or update PatternAnalysis for pose-based and flow-based exercises
    if ((exerciseType === 'pose-based' || exerciseType === 'flow-based') && analysisResult.patternAnalysis) {
      await prisma.patternAnalysis.upsert({
        where: { exerciseId },
        update: {
          referencePatterns: JSON.stringify(analysisResult.patternAnalysis.referencePatterns),
          angleRanges: JSON.stringify(analysisResult.patternAnalysis.angleRanges),
          posePatterns: exerciseType === 'pose-based' && analysisResult.patternAnalysis.posePatterns ? JSON.stringify(analysisResult.patternAnalysis.posePatterns) : null,
          flowPatterns: exerciseType === 'flow-based' && analysisResult.patternAnalysis.flowPatterns ? JSON.stringify(analysisResult.patternAnalysis.flowPatterns) : null,
          patternQuality: analysisResult.patternAnalysis.patternQuality,
        },
        create: {
          exerciseId,
          referencePatterns: JSON.stringify(analysisResult.patternAnalysis.referencePatterns),
          angleRanges: JSON.stringify(analysisResult.patternAnalysis.angleRanges),
          posePatterns: exerciseType === 'pose-based' && analysisResult.patternAnalysis.posePatterns ? JSON.stringify(analysisResult.patternAnalysis.posePatterns) : null,
          flowPatterns: exerciseType === 'flow-based' && analysisResult.patternAnalysis.flowPatterns ? JSON.stringify(analysisResult.patternAnalysis.flowPatterns) : null,
          patternQuality: analysisResult.patternAnalysis.patternQuality,
        }
      });
    }

    // Create or update AnalysisQuality
    if (analysisResult.quality) {
      await prisma.analysisQuality.upsert({
        where: { exerciseId },
        update: {
          classificationQuality: analysisResult.quality.classificationQuality,
          repAnalysisQuality: analysisResult.quality.repAnalysisQuality,
          patternQuality: analysisResult.quality.patternQuality,
          overallQuality: analysisResult.quality.overallQuality,
          issues: JSON.stringify(analysisResult.quality.issues),
        },
        create: {
          exerciseId,
          classificationQuality: analysisResult.quality.classificationQuality,
          repAnalysisQuality: analysisResult.quality.repAnalysisQuality,
          patternQuality: analysisResult.quality.patternQuality,
          overallQuality: analysisResult.quality.overallQuality,
          issues: JSON.stringify(analysisResult.quality.issues),
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Analysis generated successfully',
      exerciseId,
      analysisResult
    });

  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis', details: (error as Error).message },
      { status: 500 }
    );
  }
}
