import { ExerciseType } from '../types';

export interface RepState {
  s1_completed: boolean;
  s2_completed: boolean;
  s3_completed: boolean;
  lastAngle: number | null;
  repStartTime: number | null;
}

export interface RepBoundary {
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
  phase?: string;
  quality: number;
  repIndex: number;
}

export interface RepPhase {
  name: string;
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
}

export interface AngleThresholds {
  startThreshold: number;
  completionThreshold: number;
  returnThreshold: number;
  hysteresis: number;
}

export interface RepCountingResult {
  repCount: number;
  repBoundaries: RepBoundary[];
  repPhases: RepPhase[];
  currentState: RepState;
}

/**
 * Get angle thresholds for a specific joint from rep analysis rules
 * This matches the exact logic from VideoPlayer.tsx processRepFeedback
 */
export const getAngleThresholds = (
  repAnalysis: any,
  joint: string
): AngleThresholds => {
  // Parse joint angle rules if they're stored as a JSON string
  const jointAngleRules = repAnalysis?.jointAngleRules 
    ? (typeof repAnalysis.jointAngleRules === 'string' 
        ? JSON.parse(repAnalysis.jointAngleRules) 
        : repAnalysis.jointAngleRules)
    : null;

  if (jointAngleRules?.repCompletion?.[joint]) {
    // Use enhanced joint angle rules for this joint
    const jointRule = jointAngleRules.repCompletion[joint];
    const thresholds = {
      startThreshold: jointRule.startThreshold || 120,
      completionThreshold: jointRule.completionThreshold || 100,
      returnThreshold: jointRule.returnThreshold || 120,
      hysteresis: jointRule.hysteresis || 5
    };
    console.log('📋 Using enhanced joint angle rules for', joint, ':', thresholds);
    return thresholds;
  } else {
    // Fallback thresholds for testing
    const fallbackThresholds = {
      startThreshold: 190,
      completionThreshold: 0,
      returnThreshold: 189,
      hysteresis: 2
    };
    console.log('📋 Using fallback thresholds for', joint, ':', fallbackThresholds);
    return fallbackThresholds;
  }
};

/**
 * Get the best tracking joint from available angles and exercise data
 * This matches the exact logic from VideoPlayer.tsx processRepFeedback
 */
export const getTrackingJoint = (
  currentAngles: Record<string, number>,
  exercise: any
): { joint: string; angle: number } | null => {
  // Get joints of interest from exercise data, with fallback to common joints
  const jointsOfInterest = (exercise?.jointsOfInterest && Array.isArray(exercise.jointsOfInterest)) 
    ? exercise.jointsOfInterest 
    : ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'];

  // Find available joints of interest that we have angle data for
  const availableJointsOfInterest = jointsOfInterest.filter((joint: string) => 
    currentAngles[joint] !== undefined
  );

  if (availableJointsOfInterest.length === 0) {
    // Fallback: use any available angle data
    const allAvailableJoints = Object.keys(currentAngles);
    if (allAvailableJoints.length === 0) {
      return null;
    }
    availableJointsOfInterest.push(allAvailableJoints[0]);
  }

  // Parse joint angle rules if they're stored as a JSON string
  const jointAngleRules = exercise?.repAnalysis?.jointAngleRules 
    ? (typeof exercise.repAnalysis.jointAngleRules === 'string' 
        ? JSON.parse(exercise.repAnalysis.jointAngleRules) 
        : exercise.repAnalysis.jointAngleRules)
    : null;

  // First, try to find a joint of interest that has generated rules
  if (jointAngleRules?.repCompletion) {
    for (const joint of availableJointsOfInterest) {
      if (jointAngleRules.repCompletion[joint] && currentAngles[joint] !== undefined) {
        console.log('🎯 Selected joint with generated rules:', joint, 'angle:', currentAngles[joint]);
        return {
          joint,
          angle: currentAngles[joint]
        };
      }
    }
  }

  // If no joint with rules found, use the first available joint of interest
  const selectedJoint = availableJointsOfInterest[0];
  console.log('🎯 Selected first available joint of interest:', selectedJoint, 'angle:', currentAngles[selectedJoint]);
  return {
    joint: selectedJoint,
    angle: currentAngles[selectedJoint]
  };
};

/**
 * Process a single frame for rep counting using the same logic as live feedback
 * This matches the exact logic from VideoPlayer.tsx processRepFeedback
 */
export const processFrameForRepCounting = (
  currentAngles: Record<string, number>,
  exercise: any,
  currentRepState: RepState,
  frameIndex: number,
  frameTime: number
): RepCountingResult => {
  const trackingJoint = getTrackingJoint(currentAngles, exercise);
  
  if (!trackingJoint) {
    return {
      repCount: 0,
      repBoundaries: [],
      repPhases: [],
      currentState: currentRepState
    };
  }

  const { joint, angle } = trackingJoint;
  const angleThresholds = getAngleThresholds(exercise?.repAnalysis, joint);

  // Determine exercise pattern based on threshold relationships
  const isDownwardExercise = angleThresholds.completionThreshold < angleThresholds.startThreshold;

  // Python-style state logic with persistent flags
  let s1_completed = currentRepState.s1_completed;
  let s2_completed = currentRepState.s2_completed;
  let s3_completed = currentRepState.s3_completed;
  let repCount = 0;
  let repBoundaries: RepBoundary[] = [];
  let repPhases: RepPhase[] = [];

  if (isDownwardExercise) {
    // DOWNWARD EXERCISE LOGIC (like squat: High → Low → High)
    
    // S1: Start position (high angle)
    if (angle >= (angleThresholds.startThreshold - (angleThresholds.hysteresis * 1))) {
      s1_completed = true;
      s2_completed = false; // Clear S2 and S3 when returning to start
      s3_completed = false;
    }
    
    // S2: Mid position (medium angle) - only if S1 was completed
    else if (angle <= (angleThresholds.completionThreshold + (angleThresholds.hysteresis * 1)) && s1_completed) {
      s2_completed = true;
    }
    
    // S3: Return position (high angle) - only if S1 AND S2 were completed
    else if (angle >= (angleThresholds.returnThreshold + (angleThresholds.hysteresis * 1)) && s1_completed && s2_completed) {
      s3_completed = true;
    }
    
    // Check for complete rep OUTSIDE the state conditions (Python style)
    if (s1_completed && s2_completed && s3_completed) {
      repCount = 1;
      
      // Create rep boundary
      const repStartTime = currentRepState.repStartTime || frameTime;
      
      repBoundaries.push({
        startFrame: frameIndex - 30, // Approximate start frame
        endFrame: frameIndex,
        startTime: repStartTime,
        endTime: frameTime,
        quality: 85, // Default quality
        repIndex: 1
      });
      
      // Reset all flags after successful completion
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;
    }
    
    // Error handling: Return to S1 without completing S3 (incomplete rep)
    if (angle >= angleThresholds.startThreshold && s1_completed && s2_completed && !s3_completed) {
      // Reset all states
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;
    }
    
  } else {
    // UPWARD EXERCISE LOGIC (like leg lift: Low → High → Low)
    
    // S1: Start position (low angle)
    if (angle <= (angleThresholds.startThreshold - (angleThresholds.hysteresis * 1))) {
      s1_completed = true;
      s2_completed = false; // Clear S2 and S3 when returning to start
      s3_completed = false;
    }
    
    // S2: Peak position (high angle) - only if S1 was completed
    else if (angle >= (angleThresholds.completionThreshold + (angleThresholds.hysteresis * 1)) && s1_completed) {
      s2_completed = true;
    }
    
    // S3: Return position (low angle) - only if S1 AND S2 were completed
    else if (angle <= (angleThresholds.returnThreshold + (angleThresholds.hysteresis * 1)) && s1_completed && s2_completed) {
      s3_completed = true;
    }
    
    // Check for complete rep OUTSIDE the state conditions (Python style)
    if (s1_completed && s2_completed && s3_completed) {
      repCount = 1;
      
      // Create rep boundary
      const repStartTime = currentRepState.repStartTime || frameTime;
      
      repBoundaries.push({
        startFrame: frameIndex - 30, // Approximate start frame
        endFrame: frameIndex,
        startTime: repStartTime,
        endTime: frameTime,
        quality: 85, // Default quality
        repIndex: 1
      });
      
      // Reset all flags after successful completion
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;
    }
    
    // Error handling: Return to S1 without completing S3
    if (angle <= angleThresholds.startThreshold && s1_completed && s2_completed && !s3_completed) {
      // Reset all states
      s1_completed = false;
      s2_completed = false;
      s3_completed = false;
    }
  }

  const newState: RepState = {
    s1_completed,
    s2_completed,
    s3_completed,
    lastAngle: angle,
    repStartTime: s1_completed && !currentRepState.s1_completed ? frameTime : currentRepState.repStartTime
  };

  return {
    repCount,
    repBoundaries,
    repPhases,
    currentState: newState
  };
};

/**
 * Analyze a sequence of frames to detect all repetitions
 * This matches the exact logic from VideoPlayer.tsx processRepFeedback
 */
export const analyzeRepetitions = (
  frameData: Array<{ frameIndex: number; time: number; angles: Record<string, number> }>,
  exercise: any
): { repCount: number; repBoundaries: RepBoundary[]; repPhases: RepPhase[] } => {
  console.log('🔍 analyzeRepetitions called with:', {
    frameDataLength: frameData.length,
    exerciseType: exercise.exerciseType,
    jointsOfInterest: exercise.jointsOfInterest,
    hasRepAnalysis: !!exercise.repAnalysis,
    jointAngleRules: exercise.repAnalysis?.jointAngleRules
  });
  
  let totalRepCount = 0;
  const allRepBoundaries: RepBoundary[] = [];
  const allRepPhases: RepPhase[] = [];
  
  // Track rep states per joint (like VideoPlayer.tsx)
  const repStates: { [joint: string]: RepState } = {};

  for (let i = 0; i < frameData.length; i++) {
    const frame = frameData[i];
    
    // Get tracking joint for this frame
    const trackingJoint = getTrackingJoint(frame.angles, exercise);
    if (!trackingJoint) continue;
    
    const { joint } = trackingJoint;
    
    // Get or create rep state for this joint (Python-style persistent flags)
    let currentRepState = repStates[joint];
    if (!currentRepState) {
      currentRepState = {
        s1_completed: false,
        s2_completed: false,
        s3_completed: false,
        lastAngle: null,
        repStartTime: null
      };
      repStates[joint] = currentRepState;
    }
    
    const result = processFrameForRepCounting(
      frame.angles,
      exercise,
      currentRepState,
      frame.frameIndex,
      frame.time
    );

    if (result.repCount > 0) {
      totalRepCount += result.repCount;
      console.log(`✅ Rep ${totalRepCount} detected at frame ${i} for joint ${joint}`);
      allRepBoundaries.push(...result.repBoundaries.map((boundary, index) => ({
        ...boundary,
        repIndex: totalRepCount
      })));
    }

    // Update the rep state for this joint
    repStates[joint] = result.currentState;
  }

  console.log('🎯 analyzeRepetitions result:', {
    totalRepCount,
    repBoundariesCount: allRepBoundaries.length,
    repPhasesCount: allRepPhases.length,
    repStates: Object.keys(repStates)
  });

  return {
    repCount: totalRepCount,
    repBoundaries: allRepBoundaries,
    repPhases: allRepPhases
  };
};



/**
 * Compare user reps to gold standard rep
 */
export const compareUserRepsToGoldStandard = (
  userRepBoundaries: RepBoundary[],
  goldStandardRep: any
): { comparison: any; quality: number } => {
  if (!goldStandardRep || userRepBoundaries.length === 0) {
    return { comparison: null, quality: 0 };
  }

  try {
    const goldStandard = typeof goldStandardRep === 'string'
      ? JSON.parse(goldStandardRep)
      : goldStandardRep;

    const goldStandardDuration = goldStandard.endTime - goldStandard.startTime;
    const userDurations = userRepBoundaries.map(rep => rep.endTime - rep.startTime);
    
    // Calculate average user duration
    const avgUserDuration = userDurations.reduce((sum, duration) => sum + duration, 0) / userDurations.length;
    
    // Calculate consistency (inverse of standard deviation)
    const durationVariance = userDurations.reduce((sum, duration) => {
      const diff = duration - avgUserDuration;
      return sum + (diff * diff);
    }, 0) / userDurations.length;
    const durationStdDev = Math.sqrt(durationVariance);
    const consistency = Math.max(0, 100 - (durationStdDev / avgUserDuration * 100));

    // Calculate timing accuracy
    const timingAccuracy = Math.max(0, 100 - Math.abs(avgUserDuration - goldStandardDuration) / goldStandardDuration * 100);

    // Overall quality score
    const quality = (consistency + timingAccuracy) / 2;

    return {
      comparison: {
        goldStandardDuration,
        avgUserDuration,
        consistency,
        timingAccuracy,
        repCount: userRepBoundaries.length,
        expectedRepCount: 1 // For now, assume 1 rep in gold standard
      },
      quality
    };
  } catch (error) {
    console.warn('Failed to compare user reps to gold standard:', error);
    return { comparison: null, quality: 0 };
  }
};
