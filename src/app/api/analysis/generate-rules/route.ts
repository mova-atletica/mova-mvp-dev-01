import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAngleWithConfidence } from '@/lib/analysisUtils';

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

    // Fetch exercise with all analysis data
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        repAnalysis: true,
        patternAnalysis: true,
        analysisQuality: true,
      }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Generate enhanced joint angle rules
    const jointAngleRules = await generateEnhancedJointAngleRules(exercise, exerciseType);

    // Store in RepAnalysis.jointAngleRules (not ExerciseRules)
    const repAnalysisUpdate = await (prisma as any).repAnalysis.upsert({
      where: { exerciseId },
      update: {
        jointAngleRules: JSON.stringify(jointAngleRules),
      },
      create: {
        exerciseId,
        jointAngleRules: JSON.stringify(jointAngleRules),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Enhanced joint angle rules generated successfully',
      jointAngleRules: jointAngleRules
    });

  } catch (error) {
    console.error('Error generating enhanced joint angle rules:', error);
    return NextResponse.json(
      { error: 'Failed to generate enhanced joint angle rules' },
      { status: 500 }
    );
  }
}

// Enhanced joint angle extraction using getAngleWithConfidence
function extractJointAngle(pose: any, joint: string): number | null {
  if (!pose?.keypoints) return null;
  
  const kp = pose.keypoints;
  
  // Use EXACT same calculations as VideoPlayer.getCurrentAngles()
  switch (joint) {
    case 'leftKnee':
      if (kp[11] && kp[13] && kp[15]) {
        return getAngleWithConfidence(kp[11], kp[13], kp[15]).angle;
      }
      break;
      
    case 'rightKnee':
      if (kp[12] && kp[14] && kp[16]) {
        return getAngleWithConfidence(kp[12], kp[14], kp[16]).angle;
      }
      break;
      
    case 'leftHip':
      if (kp[5] && kp[11] && kp[13]) {
        return getAngleWithConfidence(kp[5], kp[11], kp[13]).angle;
      }
      break;
      
    case 'rightHip':
      if (kp[6] && kp[12] && kp[14]) {
        return getAngleWithConfidence(kp[6], kp[12], kp[14]).angle;
      }
      break;
      
    case 'leftElbow':
      if (kp[5] && kp[7] && kp[9]) {
        return getAngleWithConfidence(kp[5], kp[7], kp[9]).angle;
      }
      break;
      
    case 'rightElbow':
      if (kp[6] && kp[8] && kp[10]) {
        return getAngleWithConfidence(kp[6], kp[8], kp[10]).angle;
      }
      break;
      
    case 'leftShoulder':
      if (kp[11] && kp[5] && kp[7]) {
        return getAngleWithConfidence(kp[11], kp[5], kp[7]).angle;
      }
      break;
      
    case 'rightShoulder':
      if (kp[12] && kp[6] && kp[8]) {
        return getAngleWithConfidence(kp[12], kp[6], kp[8]).angle;
      }
      break;
  }
  
  return null;
}

// Generate enhanced joint angle rules with real angle calculations
async function generateEnhancedJointAngleRules(exercise: any, exerciseType: string) {
  const repAnalysis = exercise.repAnalysis;
  const jointsOfInterest = exercise.jointsOfInterest ? 
    exercise.jointsOfInterest.split(',').map((j: string) => j.trim()) : 
    ['leftKnee', 'rightKnee'];

  // Generate smart completion logic first
  const repCompletionLogic = generateRepCompletionLogic(exercise, jointsOfInterest);

  // Base structure for enhanced joint angle rules
  const jointAngleRules = {
    repCompletionLogic,
    repCompletion: {} as { [joint: string]: any }
  };

  // Try to load keypoint data for real angle calculations
  let keypointData: any[] = [];
  try {
    if (exercise.referenceKeypointsUrl) {
      console.log('🔗 Loading keypoint data for file:', exercise.referenceKeypointsUrl);
      
      // Use the proxy API to get the file content - same pattern as rest of codebase
      const keypointsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/storage/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: exercise.referenceKeypointsUrl })
      });
      
      if (keypointsResponse.ok) {
        keypointData = await keypointsResponse.json();
        console.log(`✅ Loaded ${keypointData.length} keypoint frames`);
      } else {
        console.warn(`⚠️ Failed to load keypoint data: ${keypointsResponse.status} ${keypointsResponse.statusText}`);
      }
    }
  } catch (error) {
    console.warn('Could not load keypoint data for angle calculations:', error);
  }

  // Generate per-joint thresholds if we have goldStandardRep and keypoint data
  if (repAnalysis?.goldStandardRep && keypointData.length > 0) {
    const goldStandardRep = JSON.parse(repAnalysis.goldStandardRep);
    
    // Calculate frame indices
    const startFrame = Math.floor(goldStandardRep.startTime * 30);
    const bottomFrame = Math.floor(goldStandardRep.bottomTime * 30);
    const endFrame = Math.floor(goldStandardRep.endTime * 30);
    
    // Ensure frames are within bounds
    const clampedStartFrame = Math.max(0, Math.min(startFrame, keypointData.length - 1));
    const clampedBottomFrame = Math.max(0, Math.min(bottomFrame, keypointData.length - 1));
    const clampedEndFrame = Math.max(0, Math.min(endFrame, keypointData.length - 1));
    
    // Generate thresholds for each joint
    jointsOfInterest.forEach((joint: string) => {
      const startAngle = extractJointAngle(keypointData[clampedStartFrame], joint);
      const bottomAngle = extractJointAngle(keypointData[clampedBottomFrame], joint);
      const endAngle = extractJointAngle(keypointData[clampedEndFrame], joint);
      
      if (startAngle !== null && bottomAngle !== null && endAngle !== null) {
        // Calculate the actual angle range from all keypoint data for this joint
        const allAngles = keypointData.map(frame => extractJointAngle(frame, joint)).filter(angle => angle !== null);
        const minAngle = Math.min(...allAngles);
        const maxAngle = Math.max(...allAngles);
        const angleRange = maxAngle - minAngle;
        
        // Simply use the actual measured angles - no adjustments needed
        const startThreshold = Math.round(startAngle);
        const completionThreshold = Math.round(bottomAngle);
        const returnThreshold = Math.round(endAngle); // Just use the actual end angle!
        
        jointAngleRules.repCompletion[joint] = {
          startThreshold: startThreshold,
          completionThreshold: completionThreshold,
          returnThreshold: Math.round(returnThreshold),
          hysteresis: 5
        };
        
        console.log(`✅ Generated real thresholds for ${joint}:`, jointAngleRules.repCompletion[joint]);
        console.log(`   Real angle range: ${minAngle.toFixed(1)}° → ${maxAngle.toFixed(1)}° (${angleRange.toFixed(1)}°)`);
      } else {
        console.warn(`⚠️ Could not generate thresholds for ${joint} - missing angle data`);
        // Fallback to default thresholds
        jointAngleRules.repCompletion[joint] = {
          startThreshold: 170,
          completionThreshold: 90,
          returnThreshold: 160,
          hysteresis: 5
        };
      }
    });
    
    // Update confidence based on successful generation
    jointAngleRules.repCompletionLogic.confidence = 0.9;
    
  } else {
    // Fallback to default thresholds if no keypoint data
    console.log('Using fallback thresholds - no keypoint data available');
    jointsOfInterest.forEach((joint: string) => {
      jointAngleRules.repCompletion[joint] = {
        startThreshold: 170,
        completionThreshold: 90,
        returnThreshold: 160,
        hysteresis: 5
      };
    });

    jointAngleRules.repCompletionLogic.confidence = 0.6;
    jointAngleRules.repCompletionLogic.reviewRequired = true;
  }

  return jointAngleRules;
}

// Generate smart rep completion logic
function generateRepCompletionLogic(exercise: any, jointsOfInterest: string[]) {
  const title = exercise.title.toLowerCase();
  
  // High-confidence patterns
  if (isAlternatingExercise(title)) {
    return {
      type: 'joint_groups' as const,
      jointGroups: generateSideBasedGroups(jointsOfInterest),
      groupLogic: 'OR' as const,
      generatedAutomatically: true,
      confidence: 0.95,
      reviewRequired: false
    };
  }
  
  if (isBilateralExercise(title, jointsOfInterest)) {
    return {
      type: 'joint_groups' as const,
      jointGroups: [{
        name: 'all_joints',
        joints: jointsOfInterest,
        logic: 'AND' as const
      }],
      groupLogic: 'AND' as const,
      generatedAutomatically: true,
      confidence: 0.90,
      reviewRequired: false
    };
  }
  
  // Conservative fallback
  return {
    type: 'all_joints' as const,
    jointGroups: [{
      name: 'all_joints',
      joints: jointsOfInterest,
      logic: 'AND' as const
    }],
    groupLogic: 'AND' as const,
    generatedAutomatically: true,
    confidence: 0.6,
    reviewRequired: true
  };
}

// Helper functions for exercise type detection
function isAlternatingExercise(title: string): boolean {
  const alternatingKeywords = [
    'alternating', 'alternate', 'lunge', 'lunges', 'mountain climber', 
    'climber', 'step up', 'step-up', 'single leg', 'single arm', 'unilateral'
  ];
  return alternatingKeywords.some(keyword => title.includes(keyword));
}

function isBilateralExercise(title: string, joints: string[]): boolean {
  const bilateralKeywords = [
    'squat', 'squats', 'deadlift', 'deadlifts', 'pushup', 'push-up', 
    'push up', 'pullup', 'pull-up', 'pull up', 'plank', 'bridge'
  ];
  
  const hasLeftRight = joints.some(j => j.startsWith('left')) && 
                      joints.some(j => j.startsWith('right'));
  
  return bilateralKeywords.some(keyword => title.includes(keyword)) && hasLeftRight;
}

function generateSideBasedGroups(joints: string[]) {
  const leftJoints = joints.filter(j => j.startsWith('left'));
  const rightJoints = joints.filter(j => j.startsWith('right'));
  
  const groups = [];
  
  if (leftJoints.length > 0) {
    groups.push({
      name: 'left_side',
      joints: leftJoints,
      logic: 'AND' as const
    });
  }
  
  if (rightJoints.length > 0) {
    groups.push({
      name: 'right_side',
      joints: rightJoints,
      logic: 'AND' as const
    });
  }
  
  return groups;
}
