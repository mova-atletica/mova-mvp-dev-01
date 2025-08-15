import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { runAnalysisPipeline } from '@/lib/exerciseAnalysisPipeline';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Find exercises that don't have analysis data
    const exercisesWithoutAnalysis = await prisma.exercise.findMany({
      where: {
        OR: [
          { repAnalysis: null },
          { patternAnalysis: null },
          { analysisQuality: null }
        ]
      },
      include: {
        repAnalysis: true,
        patternAnalysis: true,
        analysisQuality: true,
      }
    });

    if (exercisesWithoutAnalysis.length === 0) {
      return NextResponse.json({ 
        message: 'All exercises already have analysis data',
        processed: 0 
      });
    }

    let processed = 0;
    const results = [];

    for (const exercise of exercisesWithoutAnalysis) {
      try {
        // For now, we'll create basic analysis data since we don't have keypoints
        // In a real scenario, you'd need to fetch the keypoints from storage
        
        // Create basic rep analysis
        if (!exercise.repAnalysis) {
          await (prisma.repAnalysis as any).create({
            data: {
              exerciseId: exercise.id,
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

        // Create basic pattern analysis
        if (!exercise.patternAnalysis) {
          await prisma.patternAnalysis.create({
            data: {
              exerciseId: exercise.id,
              referencePatterns: JSON.stringify({}),
              angleRanges: JSON.stringify({}),
              patternQuality: 0.6,
            }
          });
        }

        // Create basic quality analysis
        if (!exercise.analysisQuality) {
          await prisma.analysisQuality.create({
            data: {
              exerciseId: exercise.id,
              classificationQuality: 0.7,
              repAnalysisQuality: 0.6,
              patternQuality: 0.6,
              overallQuality: 0.63,
              issues: JSON.stringify([
                { type: "basic_analysis", message: "Basic analysis generated - needs review" }
              ]),
            }
          });
        }

        // Update exercise with basic classification
        await prisma.exercise.update({
          where: { id: exercise.id },
          data: {
            exerciseType: "repetition",
            exerciseSubtype: "strength",
            classificationConfidence: 0.7,
          }
        });

        processed++;
        results.push({ 
          exerciseId: exercise.id, 
          title: exercise.title, 
          status: 'success' 
        });

      } catch (error) {
        console.error(`Error processing exercise ${exercise.id}:`, error);
        results.push({ 
          exerciseId: exercise.id, 
          title: exercise.title, 
          status: 'error',
          error: (error as Error).message 
        });
      }
    }

    return NextResponse.json({ 
      message: `Processed ${processed} exercises`,
      processed,
      results 
    });

  } catch (error) {
    console.error('Error populating analysis data:', error);
    return NextResponse.json(
      { error: 'Failed to populate analysis data' },
      { status: 500 }
    );
  }
}
