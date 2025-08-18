import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { runAnalysisPipeline } from '@/lib/exerciseAnalysisPipeline';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Find all exercises that have keypoints
    const exercises = await prisma.exercise.findMany({
      where: {
        referenceKeypointsUrl: {
          not: ""
        }
      },
      include: {
        repAnalysis: true,
        patternAnalysis: true,
        analysisQuality: true,
      }
    });

    if (exercises.length === 0) {
      return NextResponse.json({ 
        message: 'No exercises with keypoints found',
        processed: 0 
      });
    }

    let processed = 0;
    let failed = 0;
    const results = [];

    for (const exercise of exercises) {
      try {
        console.log(`Processing exercise: ${exercise.title}`);
        
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
          console.error(`Error fetching keypoints for ${exercise.title}:`, error);
          results.push({ 
            exerciseId: exercise.id, 
            title: exercise.title, 
            status: 'error',
            error: 'Failed to fetch keypoints'
          });
          failed++;
          continue;
        }

        if (keypoints.length === 0) {
          results.push({ 
            exerciseId: exercise.id, 
            title: exercise.title, 
            status: 'error',
            error: 'No keypoints available'
          });
          failed++;
          continue;
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

        // Update exercise with classification data
        await prisma.exercise.update({
          where: { id: exercise.id },
          data: {
            exerciseType: analysisResult.classification.exerciseType,
            exerciseSubtype: analysisResult.classification.exerciseSubtype,
            classificationConfidence: analysisResult.classification.confidence,
          }
        });

        // Create or update RepAnalysis
        if (analysisResult.repAnalysis) {
          await (prisma.repAnalysis as any).upsert({
            where: { exerciseId: exercise.id },
                    update: {
          // focused fields for admin analysis
          goldStandardRep: null, // Will be populated by admin editing
          repBoundaries: null, // Will be populated by admin editing
          adminNotes: null, // Will be populated by admin editing
          jointAngleRules: null, // Will be populated by admin editing
          validatedByAdmin: false,
        },
                    create: {
          exerciseId: exercise.id,
          // focused fields for admin analysis
          goldStandardRep: null, // Will be populated by admin editing
          repBoundaries: null, // Will be populated by admin editing
          adminNotes: null, // Will be populated by admin editing
          jointAngleRules: null, // Will be populated by admin editing
          validatedByAdmin: false,
        }
          });
        }

        // Create or update PatternAnalysis
        if (analysisResult.patternAnalysis) {
          await prisma.patternAnalysis.upsert({
            where: { exerciseId: exercise.id },
            update: {
              referencePatterns: JSON.stringify(analysisResult.patternAnalysis.referencePatterns),
              angleRanges: JSON.stringify(analysisResult.patternAnalysis.angleRanges),
              posePatterns: analysisResult.patternAnalysis.posePatterns ? JSON.stringify(analysisResult.patternAnalysis.posePatterns) : null,
              flowPatterns: analysisResult.patternAnalysis.flowPatterns ? JSON.stringify(analysisResult.patternAnalysis.flowPatterns) : null,
              patternQuality: analysisResult.patternAnalysis.patternQuality,
            },
            create: {
              exerciseId: exercise.id,
              referencePatterns: JSON.stringify(analysisResult.patternAnalysis.referencePatterns),
              angleRanges: JSON.stringify(analysisResult.patternAnalysis.angleRanges),
              posePatterns: analysisResult.patternAnalysis.posePatterns ? JSON.stringify(analysisResult.patternAnalysis.posePatterns) : null,
              flowPatterns: analysisResult.patternAnalysis.flowPatterns ? JSON.stringify(analysisResult.patternAnalysis.flowPatterns) : null,
              patternQuality: analysisResult.patternAnalysis.patternQuality,
            }
          });
        }

        // Create or update AnalysisQuality
        if (analysisResult.quality) {
          await prisma.analysisQuality.upsert({
            where: { exerciseId: exercise.id },
            update: {
              classificationQuality: analysisResult.quality.classificationQuality,
              repAnalysisQuality: analysisResult.quality.repAnalysisQuality,
              patternQuality: analysisResult.quality.patternQuality,
              overallQuality: analysisResult.quality.overallQuality,
              issues: JSON.stringify(analysisResult.quality.issues),
            },
            create: {
              exerciseId: exercise.id,
              classificationQuality: analysisResult.quality.classificationQuality,
              repAnalysisQuality: analysisResult.quality.repAnalysisQuality,
              patternQuality: analysisResult.quality.patternQuality,
              overallQuality: analysisResult.quality.overallQuality,
              issues: JSON.stringify(analysisResult.quality.issues),
            }
          });
        }

        processed++;
        results.push({ 
          exerciseId: exercise.id, 
          title: exercise.title, 
          status: 'success',
          keypointsCount: keypoints.length,
          analysisType: analysisResult.classification.exerciseType
        });

        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing exercise ${exercise.id}:`, error);
        results.push({ 
          exerciseId: exercise.id, 
          title: exercise.title, 
          status: 'error',
          error: (error as Error).message 
        });
        failed++;
      }
    }

    return NextResponse.json({ 
      message: `Processed ${processed} exercises successfully, ${failed} failed`,
      processed,
      failed,
      total: exercises.length,
      results 
    });

  } catch (error) {
    console.error('Error generating analysis for all exercises:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis for all exercises', details: (error as Error).message },
      { status: 500 }
    );
  }
}
