import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default joint-specific threshold mappings
const defaultJointThresholds = {
  // Knee joints
  leftKnee: { startThreshold: 120, completionThreshold: 90, returnThreshold: 120, hysteresis: 5 },
  rightKnee: { startThreshold: 120, completionThreshold: 90, returnThreshold: 120, hysteresis: 5 },
  
  // Hip joints  
  leftHip: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  rightHip: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  
  // Elbow joints
  leftElbow: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  rightElbow: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  
  // Shoulder joints
  leftShoulder: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  rightShoulder: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  
  // Ankle joints
  leftAnkle: { startThreshold: 90, completionThreshold: 45, returnThreshold: 90, hysteresis: 5 },
  rightAnkle: { startThreshold: 90, completionThreshold: 45, returnThreshold: 90, hysteresis: 5 },
  
  // Wrist joints
  leftWrist: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 },
  rightWrist: { startThreshold: 180, completionThreshold: 90, returnThreshold: 180, hysteresis: 5 }
};

// Fallback thresholds for unrecognized joints
const fallbackThresholds = { startThreshold: 120, completionThreshold: 90, returnThreshold: 120, hysteresis: 5 };

export async function POST(request: NextRequest) {
  try {

    const { exerciseId, jointsOfInterest } = await request.json();
    
    console.log('🔧 Generating rules for exercise:', exerciseId);
    console.log('🔧 Joints of interest:', jointsOfInterest);

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

    // Use provided jointsOfInterest or fall back to exercise's jointsOfInterest
    let targetJoints = jointsOfInterest;
    if (!targetJoints || targetJoints.length === 0) {
      // Parse exercise's jointsOfInterest if not provided
      targetJoints = exercise.jointsOfInterest ? exercise.jointsOfInterest.split(',').map((j: string) => j.trim()).filter((j: string) => j) : [];
      console.log('🔧 Using exercise jointsOfInterest:', targetJoints);
    }

    if (targetJoints.length === 0) {
      return NextResponse.json({ error: 'No joints of interest specified' }, { status: 400 });
    }

    // Store in RepAnalysis.jointAngleRules (not ExerciseRules)
    if (exercise.repAnalysis) {
      // Generate joint angle rules for each joint of interest
      const repCompletion: Record<string, { startThreshold: number; completionThreshold: number; returnThreshold: number; hysteresis: number }> = {};
      
      targetJoints.forEach((joint: string) => {
        // Use default thresholds for known joints, fallback for unknown joints
        repCompletion[joint] = defaultJointThresholds[joint as keyof typeof defaultJointThresholds] || fallbackThresholds;
        console.log(`🔧 Generated rules for ${joint}:`, repCompletion[joint]);
      });

      const basicRules = {
        phaseThresholds: {
          eccentric: {},
          concentric: {}
        },
        repCompletion: repCompletion
      };

      await prisma.repAnalysis.update({
        where: { exerciseId },
        data: {
          jointAngleRules: JSON.stringify(basicRules),
          validatedByAdmin: false
        }
      });

      console.log('✅ Joint angle rules generated and stored in RepAnalysis');
      console.log('✅ Generated rules for joints:', Object.keys(repCompletion));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Rules generated successfully',
      generatedJoints: targetJoints
    });

  } catch (error) {
    console.error('❌ Error generating rules:', error);
    return NextResponse.json({ error: 'Failed to generate rules' }, { status: 500 });
  }
}
