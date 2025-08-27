// Core Pose Analysis Utilities for Real-time Feedback
import { TargetPose, EnhancedPoseAnalysis, PoseFeedbackMessages } from '@/types/analysis';
import { getAngleWithConfidence } from './analysisUtils';

// Core pose analysis result interface
export interface PoseAnalysisResult {
  currentPose: string | null;
  poseConfidence: number;
  holdDuration: number;
  isInTargetPose: boolean;
  angleDeviations: { [joint: string]: number };
  feedback: string;
  severity: 'good' | 'warning' | 'poor';
  nextPose?: string;
  transitionProgress?: number;
}

// Pose comparison result for matching current angles to target poses
export interface PoseComparisonResult {
  bestMatch: TargetPose | null;
  confidence: number;
  deviations: { [joint: string]: number };
  overallScore: number;
  isInRange: boolean;
}

// Pose transition event for tracking pose changes
export interface TransitionEvent {
  fromPose: string | null;
  toPose: string;
  timestamp: number;
  transitionDuration: number;
  confidence: number;
}

// Pose hold tracking result
export interface PoseHoldResult {
  holdDuration: number;
  isHolding: boolean;
  progress: number; // 0-100%
  timeRemaining: number;
  isComplete: boolean;
}

/**
 * Analyze the current pose based on current joint angles and target poses
 */
export function analyzeCurrentPose(
  currentAngles: { [joint: string]: number | null },
  targetPoses: TargetPose[],
  angleRanges: { [joint: string]: { min: number; max: number } },
  toleranceMultipliers: { [joint: string]: number } = {},
  jointsOfInterest: string[] = []
): PoseAnalysisResult {
  // Validate inputs
  if (!targetPoses || !Array.isArray(targetPoses) || targetPoses.length === 0) {
    console.warn('⚠️ analyzeCurrentPose: targetPoses is not a valid array:', targetPoses);
    return {
      currentPose: null,
      poseConfidence: 0,
      holdDuration: 0,
      isInTargetPose: false,
      angleDeviations: {},
      feedback: 'No target poses defined',
      severity: 'poor'
    };
  }

  // Find the best matching pose
  const poseComparison = detectCurrentPose(currentAngles, targetPoses, angleRanges, toleranceMultipliers, jointsOfInterest);
  
  if (!poseComparison.bestMatch) {
    return {
      currentPose: null,
      poseConfidence: 0,
      holdDuration: 0,
      isInTargetPose: false,
      angleDeviations: poseComparison.deviations,
      feedback: 'No matching pose detected',
      severity: 'poor'
    };
  }

  // Determine if currently in the target pose
  const isInTargetPose = poseComparison.isInRange;
  
  // Calculate hold duration (this would need to be tracked over time)
  const holdDuration = 0; // TODO: Implement hold duration tracking
  
  // Generate feedback based on deviations and pose match
  const feedback = generatePoseFeedback(poseComparison, holdDuration, poseComparison.bestMatch);
  
  // Determine severity based on confidence and deviations
  const severity = determinePoseSeverity(poseComparison.confidence, poseComparison.overallScore);
  
  // Find next pose in sequence - add validation here
  let nextPose: string | undefined;
  try {
    const nextPoseObj = findNextPose(poseComparison.bestMatch, targetPoses);
    nextPose = nextPoseObj?.name;
  } catch (error) {
    console.warn('⚠️ Error finding next pose:', error);
    nextPose = undefined;
  }
  
  return {
    currentPose: poseComparison.bestMatch.name,
    poseConfidence: poseComparison.confidence,
    holdDuration,
    isInTargetPose,
    angleDeviations: poseComparison.deviations,
    feedback,
    severity,
    nextPose,
    transitionProgress: 0 // TODO: Implement transition progress
  };
}

/**
 * Detect which target pose best matches the current joint angles
 */
export function detectCurrentPose(
  currentAngles: { [joint: string]: number | null },
  targetPoses: TargetPose[],
  angleRanges: { [joint: string]: { min: number; max: number } } = {},
  toleranceMultipliers: { [joint: string]: number } = {},
  jointsOfInterest: string[] = []
): PoseComparisonResult {
  // Validate inputs
  if (!targetPoses || !Array.isArray(targetPoses) || targetPoses.length === 0) {
    console.warn('⚠️ detectCurrentPose: targetPoses is not a valid array:', targetPoses);
    return {
      bestMatch: null,
      confidence: 0,
      deviations: {},
      overallScore: 0,
      isInRange: false
    };
  }

  let bestMatch: TargetPose | null = null;
  let bestScore = -1;
  let bestConfidence = 0;
  let bestDeviations: { [joint: string]: number } = {};
  let bestIsInRange = false;

  // If no joints specified, use all available joints
  const jointsToCheck = jointsOfInterest.length > 0 
    ? jointsOfInterest 
    : Object.keys(currentAngles).filter(key => currentAngles[key] !== null);

  console.log('🎯 Joints to check:', jointsToCheck);

  for (const targetPose of targetPoses) {
    // Validate each target pose
    if (!targetPose || typeof targetPose !== 'object' || !targetPose.name || !targetPose.targetAngles) {
      console.warn('⚠️ detectCurrentPose: Invalid target pose:', targetPose);
      continue;
    }
    
    const comparison = calculatePoseComparison(
      currentAngles,
      targetPose,
      angleRanges,
      toleranceMultipliers,
      jointsToCheck
    );

    if (comparison.overallScore > bestScore) {
      bestScore = comparison.overallScore;
      bestMatch = targetPose;
      bestConfidence = comparison.confidence;
      bestDeviations = comparison.deviations;
      bestIsInRange = comparison.isInRange;
    }
  }

  return {
    bestMatch,
    confidence: bestConfidence,
    deviations: bestDeviations,
    overallScore: bestScore,
    isInRange: bestIsInRange
  };
}

/**
 * Calculate how well current angles match a specific target pose
 */
export function calculatePoseComparison(
  currentAngles: { [joint: string]: number | null },
  targetPose: TargetPose,
  angleRanges: { [joint: string]: { min: number; max: number } } = {},
  toleranceMultipliers: { [joint: string]: number } = {},
  jointsOfInterest: string[] = []
): PoseComparisonResult {
  // Validate inputs
  if (!targetPose || typeof targetPose !== 'object' || !targetPose.name || !targetPose.targetAngles) {
    console.warn('⚠️ calculatePoseComparison: Invalid target pose:', targetPose);
    return {
      bestMatch: targetPose,
      confidence: 0,
      deviations: {},
      overallScore: 0,
      isInRange: false
    };
  }

  console.log('🎯 Comparing pose:', targetPose.name);
  console.log('🎯 Target angles:', targetPose.targetAngles);
  console.log('🎯 Current angles:', currentAngles);

  const deviations: { [joint: string]: number } = {};
  let totalScore = 0;
  let totalConfidence = 0;
  let jointCount = 0;
  let inRangeCount = 0;

  // If no joints specified, use all available joints
  const jointsToCheck = jointsOfInterest.length > 0 
    ? jointsOfInterest 
    : Object.keys(currentAngles).filter(key => currentAngles[key] !== null);

  console.log('🎯 Joints to check:', jointsToCheck);
  
  // IMPORTANT: Only check joints that are actually defined in the target pose
  const targetJoints = Object.keys(targetPose.targetAngles);
  const finalJointsToCheck = jointsToCheck.filter(joint => targetJoints.includes(joint));
  
  console.log('🎯 Target pose joints:', targetJoints);
  console.log('🎯 Final joints to check (intersection):', finalJointsToCheck);

  for (const joint of finalJointsToCheck) {
    const currentAngle = currentAngles[joint];
    const targetAngle = targetPose.targetAngles[joint];
    
    if (currentAngle === null || targetAngle === undefined) {
      console.log(`⚠️ Skipping joint ${joint}: current=${currentAngle}, target=${targetAngle}`);
      continue;
    }

    // Calculate angle deviation
    const deviation = Math.abs(currentAngle - targetAngle);
    deviations[joint] = deviation;

    // Get tolerance for this joint (use pose tolerance as default, or angle range tolerance)
    const baseTolerance = targetPose.tolerance;
    const rangeTolerance = angleRanges[joint] ? 
      (angleRanges[joint].max - angleRanges[joint].min) / 2 : baseTolerance;
    const toleranceMultiplier = toleranceMultipliers[joint] || 1.0;
    const effectiveTolerance = Math.max(baseTolerance, rangeTolerance) * toleranceMultiplier;

    console.log(`🎯 Joint ${joint}: current=${currentAngle.toFixed(1)}°, target=${targetAngle}°, deviation=${deviation.toFixed(1)}°, tolerance=${effectiveTolerance.toFixed(1)}°`);

    // Calculate score for this joint (0-100)
    let jointScore = 0;
    if (deviation <= effectiveTolerance) {
      jointScore = 100;
      inRangeCount++;
      console.log(`✅ Joint ${joint}: IN RANGE (score: 100)`);
    } else if (deviation <= effectiveTolerance * 2) {
      jointScore = Math.max(0, 100 - ((deviation - effectiveTolerance) / effectiveTolerance) * 50);
      console.log(`⚠️ Joint ${joint}: PARTIALLY IN RANGE (score: ${jointScore.toFixed(1)})`);
    } else {
      console.log(`❌ Joint ${joint}: OUT OF RANGE (score: 0)`);
    }

    totalScore += jointScore;
    totalConfidence += 1;
    jointCount++;
  }

  const overallScore = jointCount > 0 ? totalScore / jointCount : 0;
  const confidence = jointCount > 0 ? totalConfidence / jointCount : 0;
  const isInRange = inRangeCount === jointCount && jointCount > 0;

  console.log(`🎯 Final result: score=${overallScore.toFixed(1)}, confidence=${confidence.toFixed(1)}, inRange=${isInRange}, jointsInRange=${inRangeCount}/${jointCount}`);

  return {
    bestMatch: targetPose,
    confidence,
    deviations,
    overallScore,
    isInRange
  };
}

/**
 * Calculate pose hold duration based on pose history
 */
export function calculatePoseHoldDuration(
  poseHistory: PoseAnalysisResult[],
  targetPose: TargetPose
): number {
  if (poseHistory.length === 0) return 0;

  let holdDuration = 0;
  let consecutiveFrames = 0;
  const frameRate = 30; // Assuming 30fps, could be made configurable

  // Count consecutive frames where the pose is actually being held correctly
  for (let i = poseHistory.length - 1; i >= 0; i--) {
    const poseResult = poseHistory[i];
    // Check if this frame shows the target pose AND the user is actually in the pose
    if (poseResult.currentPose === targetPose.name && poseResult.isInTargetPose === true) {
      consecutiveFrames++;
    } else {
      break;
    }
  }

  holdDuration = consecutiveFrames / frameRate;
  console.log(`⏱️ Hold duration calculation: ${consecutiveFrames} frames = ${holdDuration.toFixed(2)}s`);
  return holdDuration;
}

/**
 * Track pose hold duration and progress
 */
export function trackPoseHoldDuration(
  currentPose: string,
  poseHistory: PoseAnalysisResult[],
  targetPose: TargetPose
): PoseHoldResult {
  const holdDuration = calculatePoseHoldDuration(poseHistory, targetPose);
  const isHolding = currentPose === targetPose.name;
  const progress = Math.min(100, (holdDuration / targetPose.holdDuration) * 100);
  const timeRemaining = Math.max(0, targetPose.holdDuration - holdDuration);
  const isComplete = holdDuration >= targetPose.holdDuration;

  return {
    holdDuration,
    isHolding,
    progress,
    timeRemaining,
    isComplete
  };
}

/**
 * Detect pose transitions from pose history
 */
export function detectPoseTransitions(
  poseHistory: PoseAnalysisResult[],
  targetPoses: TargetPose[]
): TransitionEvent[] {
  const transitions: TransitionEvent[] = [];
  
  if (poseHistory.length < 2) return transitions;

  for (let i = 1; i < poseHistory.length; i++) {
    const previousPose = poseHistory[i - 1].currentPose;
    const currentPose = poseHistory[i].currentPose;
    
    if (previousPose !== currentPose && currentPose !== null) {
      const transition: TransitionEvent = {
        fromPose: previousPose,
        toPose: currentPose,
        timestamp: Date.now(), // TODO: Use actual frame timestamp
        transitionDuration: 0, // TODO: Calculate actual transition duration
        confidence: poseHistory[i].poseConfidence
      };
      transitions.push(transition);
    }
  }

  return transitions;
}

/**
 * Generate feedback message based on pose analysis result
 */
function generatePoseFeedback(
  poseComparison: PoseComparisonResult,
  holdDuration: number,
  targetPose: TargetPose
): string {
  if (!poseComparison.bestMatch) {
    return 'No pose detected';
  }

  // Check if pose is being held correctly
  if (poseComparison.isInRange) {
    if (holdDuration >= targetPose.holdDuration) {
      return 'Perfect! Pose completed successfully';
    } else {
      const remaining = targetPose.holdDuration - holdDuration;
      return `Great form! Hold for ${remaining.toFixed(1)} more seconds`;
    }
  }

  // Generate correction feedback based on deviations
  const worstJoint = Object.entries(poseComparison.deviations)
    .sort(([, a], [, b]) => b - a)[0];

  if (worstJoint) {
    const [jointName, deviation] = worstJoint;
    const displayName = jointName.replace(/([A-Z])/g, ' $1').trim();
    
    if (deviation > 30) {
      return `Adjust your ${displayName} position significantly`;
    } else if (deviation > 15) {
      return `Fine-tune your ${displayName} position`;
    } else {
      return `Slightly adjust your ${displayName} position`;
    }
  }

  return 'Adjust your form to match the target pose';
}

/**
 * Determine pose severity based on confidence and score
 */
function determinePoseSeverity(confidence: number, score: number): 'good' | 'warning' | 'poor' {
  if (confidence >= 0.8 && score >= 80) return 'good';
  if (confidence >= 0.6 && score >= 60) return 'warning';
  return 'poor';
}

/**
 * Find the next pose in the sequence
 */
function findNextPose(currentPose: TargetPose, targetPoses: TargetPose[]): TargetPose | null {
  // Validate inputs
  if (!currentPose || !targetPoses || !Array.isArray(targetPoses)) {
    console.warn('⚠️ findNextPose: Invalid inputs:', { currentPose, targetPoses });
    return null;
  }
  
  try {
    const currentIndex = targetPoses.findIndex(pose => pose.name === currentPose.name);
    if (currentIndex === -1 || currentIndex === targetPoses.length - 1) {
      return null;
    }
    return targetPoses[currentIndex + 1];
  } catch (error) {
    console.warn('⚠️ findNextPose: Error finding next pose:', error);
    return null;
  }
}

/**
 * Calculate angles from keypoints using the existing analysis utils
 * This function bridges the gap between keypoint data and pose analysis
 */
export function calculateAnglesForPoseAnalysis(keypoints: any[]): { [joint: string]: number | null } {
  const angles: { [joint: string]: number | null } = {};
  
  // Extract keypoints (using MediaPipe Pose keypoint indices)
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];
  const leftKnee = keypoints[13];
  const rightKnee = keypoints[14];
  const leftAnkle = keypoints[15];
  const rightAnkle = keypoints[16];
  const leftShoulder = keypoints[5];
  const rightShoulder = keypoints[6];
  const leftElbow = keypoints[7];
  const rightElbow = keypoints[8];
  const leftWrist = keypoints[9];
  const rightWrist = keypoints[10];

  // Calculate angles using existing analysis utils
  if (leftHip && leftKnee && leftAnkle) {
    const result = getAngleWithConfidence(leftHip, leftKnee, leftAnkle);
    angles.leftKnee = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (rightHip && rightKnee && rightAnkle) {
    const result = getAngleWithConfidence(rightHip, rightKnee, rightAnkle);
    angles.rightKnee = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (leftShoulder && leftHip && leftKnee) {
    const result = getAngleWithConfidence(leftShoulder, leftHip, leftKnee);
    angles.leftHip = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (rightShoulder && rightHip && rightKnee) {
    const result = getAngleWithConfidence(rightShoulder, rightHip, rightKnee);
    angles.rightHip = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (leftShoulder && leftElbow && leftWrist) {
    const result = getAngleWithConfidence(leftShoulder, leftElbow, leftWrist);
    angles.leftElbow = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (rightShoulder && rightElbow && rightWrist) {
    const result = getAngleWithConfidence(rightShoulder, rightElbow, rightWrist);
    angles.rightElbow = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (leftHip && leftShoulder && leftElbow) {
    const result = getAngleWithConfidence(leftHip, leftShoulder, leftElbow);
    angles.leftShoulder = result.confidence > 0.5 ? result.angle : null;
  }
  
  if (rightHip && rightShoulder && rightElbow) {
    const result = getAngleWithConfidence(rightHip, rightShoulder, rightElbow);
    angles.rightShoulder = result.confidence > 0.5 ? result.angle : null;
  }

  return angles;
}
