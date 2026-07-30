// Advanced Biomechanical Analysis Utilities
import * as poseDetection from "@tensorflow-models/pose-detection";

/**
 * Minimum mean keypoint score for an angle to be treated as measured.
 * MoveNet always emits all 17 keypoints, so occluded joints (common on the far
 * side of a profile clip) arrive as low-score guesses rather than gaps. Matches
 * the `conf_min` each sport preset tunes to.
 */
export const POSE_CONF_MIN = 0.25;

// Enhanced angle calculation with confidence weighting
export function getAngleWithConfidence(
  a: { x: number; y: number; score?: number },
  b: { x: number; y: number; score?: number },
  c: { x: number; y: number; score?: number }
): { angle: number; confidence: number } {
  if (!a || !b || !c) {
    return { angle: 0, confidence: 0 };
  }

  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;

  // Calculate confidence based on keypoint scores
  const scores = [a.score || 0, b.score || 0, c.score || 0];
  const confidence = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return { angle, confidence };
}

// Enhanced trunk angle calculation
export function getTrunkAngleWithConfidence(
  shoulder: { x: number; y: number; score?: number },
  hip: { x: number; y: number; score?: number }
): { angle: number; confidence: number } {
  if (!shoulder || !hip) {
    return { angle: 0, confidence: 0 };
  }

  const vertical = { x: shoulder.x, y: shoulder.y - 100 };
  const angleResult = getAngleWithConfidence(vertical, shoulder, hip);
  
  return {
    angle: angleResult.angle,
    confidence: ((shoulder.score || 0) + (hip.score || 0)) / 2
  };
}

// Repetition detection and counting
export interface Repetition {
  startFrame: number;
  endFrame: number;
  peakFrame: number;
  type: 'eccentric' | 'concentric' | 'isometric';
  duration: number;
  rangeOfMotion: number;
  confidence: number;
}

export function detectRepetitions(
  angles: (number | null)[],
  jointName: string,
  frameRate: number = 30
): Repetition[] {
  const repetitions: Repetition[] = [];
  const validAngles = angles.filter(angle => angle !== null) as number[];
  
  if (validAngles.length < 10) return repetitions;

  // Find peaks and valleys in the angle data
  const peaks: number[] = [];
  const valleys: number[] = [];
  
  for (let i = 1; i < validAngles.length - 1; i++) {
    if (validAngles[i] > validAngles[i - 1] && validAngles[i] > validAngles[i + 1]) {
      peaks.push(i);
    }
    if (validAngles[i] < validAngles[i - 1] && validAngles[i] < validAngles[i + 1]) {
      valleys.push(i);
    }
  }

  // Determine if this is a flexion or extension exercise based on angle patterns
  const isFlexionExercise = jointName.toLowerCase().includes('knee') || 
                           jointName.toLowerCase().includes('elbow') ||
                           jointName.toLowerCase().includes('hip');

  // Create repetitions from peaks and valleys
  const extrema = [...peaks, ...valleys].sort((a, b) => a - b);
  
  for (let i = 0; i < extrema.length - 1; i++) {
    const startFrame = extrema[i];
    const endFrame = extrema[i + 1];
    const duration = (endFrame - startFrame) / frameRate;
    
    // Filter out very short movements (likely noise)
    if (duration < 0.5 || duration > 5.0) continue;
    
    const startAngle = validAngles[startFrame];
    const endAngle = validAngles[endFrame];
    const rangeOfMotion = Math.abs(endAngle - startAngle);
    
    // Filter out movements with insufficient range of motion
    if (rangeOfMotion < 20) continue;
    
    // Find the peak frame (maximum angle in the range)
    let peakFrame = startFrame;
    let peakAngle = startAngle;
    for (let j = startFrame; j <= endFrame; j++) {
      if (validAngles[j] > peakAngle) {
        peakAngle = validAngles[j];
        peakFrame = j;
      }
    }
    
    // Determine movement type
    let type: 'eccentric' | 'concentric' | 'isometric';
    if (isFlexionExercise) {
      type = startAngle < endAngle ? 'concentric' : 'eccentric';
    } else {
      type = startAngle > endAngle ? 'concentric' : 'eccentric';
    }
    
    // Calculate confidence based on angle consistency
    const angleVariance = calculateVariance(validAngles.slice(startFrame, endFrame + 1));
    const confidence = Math.max(0, 1 - angleVariance / 100);
    
    repetitions.push({
      startFrame,
      endFrame,
      peakFrame,
      type,
      duration,
      rangeOfMotion,
      confidence
    });
  }
  
  return repetitions;
}

// Tempo analysis
export interface TempoAnalysis {
  eccentricDuration: number;
  concentricDuration: number;
  isometricDuration: number;
  totalDuration: number;
  eccentricConcentricRatio: number;
  averageVelocity: number;
  peakVelocity: number;
}

export function analyzeTempo(repetitions: Repetition[]): TempoAnalysis {
  if (repetitions.length === 0) {
    return {
      eccentricDuration: 0,
      concentricDuration: 0,
      isometricDuration: 0,
      totalDuration: 0,
      eccentricConcentricRatio: 0,
      averageVelocity: 0,
      peakVelocity: 0
    };
  }

  const eccentricDurations = repetitions
    .filter(rep => rep.type === 'eccentric')
    .map(rep => rep.duration);
  
  const concentricDurations = repetitions
    .filter(rep => rep.type === 'concentric')
    .map(rep => rep.duration);
  
  const isometricDurations = repetitions
    .filter(rep => rep.type === 'isometric')
    .map(rep => rep.duration);

  const avgEccentric = eccentricDurations.length > 0 
    ? eccentricDurations.reduce((sum, d) => sum + d, 0) / eccentricDurations.length 
    : 0;
  
  const avgConcentric = concentricDurations.length > 0 
    ? concentricDurations.reduce((sum, d) => sum + d, 0) / concentricDurations.length 
    : 0;
  
  const avgIsometric = isometricDurations.length > 0 
    ? isometricDurations.reduce((sum, d) => sum + d, 0) / isometricDurations.length 
    : 0;

  const totalDuration = repetitions.reduce((sum, rep) => sum + rep.duration, 0);
  const eccentricConcentricRatio = avgConcentric > 0 ? avgEccentric / avgConcentric : 0;
  
  // Calculate velocities
  const velocities = repetitions.map(rep => rep.rangeOfMotion / rep.duration);
  const averageVelocity = velocities.length > 0 
    ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length 
    : 0;
  const peakVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;

  return {
    eccentricDuration: avgEccentric,
    concentricDuration: avgConcentric,
    isometricDuration: avgIsometric,
    totalDuration,
    eccentricConcentricRatio,
    averageVelocity,
    peakVelocity
  };
}

// Enhanced comparison with phase-aware analysis
export interface EnhancedComparisonResult {
  overall: {
    score: number;
    grade: string;
    confidence: number;
  };
  joints: {
    [jointName: string]: {
      score: number;
      avgDifference: number;
      phaseScores: {
        eccentric: number;
        concentric: number;
        isometric: number;
      };
      repCount: number;
      tempoScore: number;
      consistencyScore: number;
    };
  };
  tempo: {
    eccentricConcentricRatio: number;
    velocityScore: number;
    consistencyScore: number;
  };
  repetitions: {
    user: Repetition[];
    reference: Repetition[];
    synchronizationScore: number;
  };
}

export function calculateEnhancedComparison(
  userAngles: any,
  referenceAngles: any,
  jointsOfInterest: string[],
  frameRate: number = 30
): EnhancedComparisonResult {
  const result: EnhancedComparisonResult = {
    overall: { score: 0, grade: 'N/A', confidence: 0 },
    joints: {},
    tempo: { eccentricConcentricRatio: 0, velocityScore: 0, consistencyScore: 0 },
    repetitions: { user: [], reference: [], synchronizationScore: 0 }
  };

  let totalScore = 0;
  let totalConfidence = 0;
  let jointCount = 0;

  jointsOfInterest.forEach(joint => {
    const userAngleArray = userAngles[`${joint}Angles`] || [];
    const refAngleArray = referenceAngles[`${joint}Angles`] || [];
    
    if (userAngleArray.length === 0 || refAngleArray.length === 0) {
      result.joints[joint] = {
        score: 0,
        avgDifference: 0,
        phaseScores: { eccentric: 0, concentric: 0, isometric: 0 },
        repCount: 0,
        tempoScore: 0,
        consistencyScore: 0
      };
      return;
    }

    // Detect repetitions for both user and reference
    const userReps = detectRepetitions(userAngleArray, joint, frameRate);
    const refReps = detectRepetitions(refAngleArray, joint, frameRate);
    
    // Calculate tempo analysis
    const userTempo = analyzeTempo(userReps);
    const refTempo = analyzeTempo(refReps);
    
    // Phase-aware comparison
    const phaseScores = calculatePhaseScores(userReps, refReps, userAngleArray, refAngleArray);
    
    // Tempo comparison
    const tempoScore = calculateTempoScore(userTempo, refTempo);
    
    // Consistency score (how consistent are the repetitions)
    const consistencyScore = calculateConsistencyScore(userReps);
    
    // Traditional angle comparison
    const angleComparison = calculateAngleComparison(userAngleArray, refAngleArray);
    
    // Weighted score combining all factors
    const weightedScore = (
      angleComparison.score * 0.4 +
      phaseScores.overall * 0.3 +
      tempoScore * 0.2 +
      consistencyScore * 0.1
    );

    result.joints[joint] = {
      score: Math.round(weightedScore),
      avgDifference: angleComparison.avgDifference,
      phaseScores,
      repCount: userReps.length,
      tempoScore: Math.round(tempoScore),
      consistencyScore: Math.round(consistencyScore)
    };

    totalScore += weightedScore;
    totalConfidence += angleComparison.confidence;
    jointCount++;
  });

  // Calculate overall scores
  if (jointCount > 0) {
    result.overall.score = Math.round(totalScore / jointCount);
    result.overall.confidence = totalConfidence / jointCount;
    result.overall.grade = getGrade(result.overall.score);
  }

  // Calculate tempo analysis across all joints
  const allUserReps = jointsOfInterest.flatMap(joint => 
    detectRepetitions(userAngles[`${joint}Angles`] || [], joint, frameRate)
  );
  const allRefReps = jointsOfInterest.flatMap(joint => 
    detectRepetitions(referenceAngles[`${joint}Angles`] || [], joint, frameRate)
  );
  
  const overallUserTempo = analyzeTempo(allUserReps);
  const overallRefTempo = analyzeTempo(allRefReps);
  
  result.tempo = {
    eccentricConcentricRatio: overallUserTempo.eccentricConcentricRatio,
    velocityScore: calculateVelocityScore(overallUserTempo, overallRefTempo),
    consistencyScore: calculateOverallConsistency(allUserReps)
  };

  result.repetitions = {
    user: allUserReps,
    reference: allRefReps,
    synchronizationScore: calculateSynchronizationScore(allUserReps, allRefReps)
  };

  return result;
}

// Helper functions
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

function calculatePhaseScores(
  userReps: Repetition[],
  refReps: Repetition[],
  userAngles: number[],
  refAngles: number[]
): { eccentric: number; concentric: number; isometric: number; overall: number } {
  // This is a simplified implementation - you can enhance this
  const userEccentric = userReps.filter(rep => rep.type === 'eccentric');
  const userConcentric = userReps.filter(rep => rep.type === 'concentric');
  const refEccentric = refReps.filter(rep => rep.type === 'eccentric');
  const refConcentric = refReps.filter(rep => rep.type === 'concentric');

  const eccentricScore = userEccentric.length > 0 && refEccentric.length > 0 ? 85 : 0;
  const concentricScore = userConcentric.length > 0 && refConcentric.length > 0 ? 85 : 0;
  const isometricScore = 0; // Implement if needed

  return {
    eccentric: eccentricScore,
    concentric: concentricScore,
    isometric: isometricScore,
    overall: (eccentricScore + concentricScore + isometricScore) / 3
  };
}

function calculateTempoScore(userTempo: TempoAnalysis, refTempo: TempoAnalysis): number {
  if (refTempo.totalDuration === 0) return 0;
  
  const durationDiff = Math.abs(userTempo.totalDuration - refTempo.totalDuration);
  const ratioDiff = Math.abs(userTempo.eccentricConcentricRatio - refTempo.eccentricConcentricRatio);
  
  const durationScore = Math.max(0, 100 - (durationDiff * 10));
  const ratioScore = Math.max(0, 100 - (ratioDiff * 50));
  
  return (durationScore + ratioScore) / 2;
}

function calculateConsistencyScore(repetitions: Repetition[]): number {
  if (repetitions.length < 2) return 0;
  
  const durations = repetitions.map(rep => rep.duration);
  const ranges = repetitions.map(rep => rep.rangeOfMotion);
  
  const durationVariance = calculateVariance(durations);
  const rangeVariance = calculateVariance(ranges);
  
  const durationConsistency = Math.max(0, 100 - (durationVariance * 10));
  const rangeConsistency = Math.max(0, 100 - (rangeVariance * 0.1));
  
  return (durationConsistency + rangeConsistency) / 2;
}

function calculateAngleComparison(userAngles: number[], refAngles: number[]): { score: number; avgDifference: number; confidence: number } {
  const minLength = Math.min(userAngles.length, refAngles.length);
  if (minLength === 0) return { score: 0, avgDifference: 0, confidence: 0 };

  let totalDifference = 0;
  let validComparisons = 0;

  for (let i = 0; i < minLength; i++) {
    const userAngle = userAngles[i];
    const refAngle = refAngles[i];
    
    if (userAngle !== null && refAngle !== null) {
      totalDifference += Math.abs(userAngle - refAngle);
      validComparisons++;
    }
  }

  const avgDifference = validComparisons > 0 ? totalDifference / validComparisons : 0;
  const score = validComparisons > 0 ? Math.max(0, Math.min(100, 100 - (avgDifference * 1.5))) : 0;
  const confidence = validComparisons / minLength;

  return { score, avgDifference, confidence };
}

function calculateVelocityScore(userTempo: TempoAnalysis, refTempo: TempoAnalysis): number {
  if (refTempo.averageVelocity === 0) return 0;
  
  const velocityDiff = Math.abs(userTempo.averageVelocity - refTempo.averageVelocity);
  return Math.max(0, 100 - (velocityDiff * 10));
}

function calculateOverallConsistency(repetitions: Repetition[]): number {
  if (repetitions.length === 0) return 0;
  
  const confidences = repetitions.map(rep => rep.confidence);
  return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length * 100;
}

function calculateSynchronizationScore(userReps: Repetition[], refReps: Repetition[]): number {
  if (userReps.length === 0 || refReps.length === 0) return 0;
  
  const repCountDiff = Math.abs(userReps.length - refReps.length);
  const maxReps = Math.max(userReps.length, refReps.length);
  
  return Math.max(0, 100 - (repCountDiff / maxReps) * 100);
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Balance and stability analysis
export interface BalanceMetrics {
  centerOfMass: { x: number; y: number };
  swayArea: number;
  swayVelocity: number;
  stabilityScore: number;
}

export function calculateBalanceMetrics(poses: any[]): BalanceMetrics {
  if (poses.length === 0) {
    return {
      centerOfMass: { x: 0, y: 0 },
      swayArea: 0,
      swayVelocity: 0,
      stabilityScore: 0
    };
  }

  // Calculate center of mass for each frame
  const comPositions = poses.map(pose => {
    if (!pose || !pose.keypoints) return null;
    
    const leftHip = pose.keypoints[11];
    const rightHip = pose.keypoints[12];
    const leftShoulder = pose.keypoints[5];
    const rightShoulder = pose.keypoints[6];
    
    if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) return null;
    
    const midHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    // Approximate center of mass (simplified)
    return {
      x: (midHip.x + midShoulder.x) / 2,
      y: (midHip.y + midShoulder.y) / 2
    };
  }).filter(Boolean);

  if (comPositions.length === 0) {
    return {
      centerOfMass: { x: 0, y: 0 },
      swayArea: 0,
      swayVelocity: 0,
      stabilityScore: 0
    };
  }

  // Calculate sway area (convex hull area)
  const swayArea = calculateSwayArea(comPositions as { x: number; y: number }[]);
  
  // Calculate sway velocity
  const swayVelocity = calculateSwayVelocity(comPositions as { x: number; y: number }[]);
  
  // Calculate stability score (lower sway = higher stability)
  const stabilityScore = Math.max(0, 100 - (swayArea * 0.1) - (swayVelocity * 0.5));

  return {
    centerOfMass: comPositions[Math.floor(comPositions.length / 2)] as { x: number; y: number },
    swayArea,
    swayVelocity,
    stabilityScore: Math.round(stabilityScore)
  };
}

function calculateSwayArea(positions: { x: number; y: number }[]): number {
  if (positions.length < 3) return 0;
  
  // Simplified area calculation using bounding box
  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return (maxX - minX) * (maxY - minY);
}

function calculateSwayVelocity(positions: { x: number; y: number }[]): number {
  if (positions.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x;
    const dy = positions[i].y - positions[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }
  
  return totalDistance / (positions.length - 1);
}

// Pose Analysis Functions (Phase 1.2 additions)
export interface PoseComparisonResult {
  pose: any | null;
  confidence: number;
  deviations: { [joint: string]: number };
  overallScore: number;
  isInRange: boolean;
}

/**
 * Calculate pose comparison between current angles and target poses
 * This function extends analysisUtils.ts to support pose-based exercises
 */
export function calculatePoseComparison(
  currentAngles: { [joint: string]: number | null },
  targetPoses: any[],
  angleRanges: { [joint: string]: { min: number; max: number } } = {},
  toleranceMultipliers: { [joint: string]: number } = {},
  jointsOfInterest: string[] = []
): PoseComparisonResult {
  if (targetPoses.length === 0) {
    return {
      pose: null,
      confidence: 0,
      deviations: {},
      overallScore: 0,
      isInRange: false
    };
  }

  let bestMatch: any = null;
  let bestScore = -1;
  let bestConfidence = 0;
  let bestDeviations: { [joint: string]: number } = {};
  let bestIsInRange = false;

  // If no joints specified, use all available joints
  const jointsToCheck = jointsOfInterest.length > 0 
    ? jointsOfInterest 
    : Object.keys(currentAngles).filter(key => currentAngles[key] !== null);

  for (const targetPose of targetPoses) {
    const deviations: { [joint: string]: number } = {};
    let totalScore = 0;
    let totalConfidence = 0;
    let jointCount = 0;
    let inRangeCount = 0;

    for (const joint of jointsToCheck) {
      const currentAngle = currentAngles[joint];
      const targetAngle = targetPose.targetAngles?.[joint];
      
      if (currentAngle === null || targetAngle === undefined) continue;

      // Calculate angle deviation
      const deviation = Math.abs(currentAngle - targetAngle);
      deviations[joint] = deviation;

      // Get tolerance for this joint
      const baseTolerance = targetPose.tolerance || 15; // Default 15 degrees
      const rangeTolerance = angleRanges[joint] ? 
        (angleRanges[joint].max - angleRanges[joint].min) / 2 : baseTolerance;
      const toleranceMultiplier = toleranceMultipliers[joint] || 1.0;
      const effectiveTolerance = Math.max(baseTolerance, rangeTolerance) * toleranceMultiplier;

      // Calculate score for this joint (0-100)
      let jointScore = 0;
      if (deviation <= effectiveTolerance) {
        jointScore = 100;
        inRangeCount++;
      } else if (deviation <= effectiveTolerance * 2) {
        jointScore = Math.max(0, 100 - ((deviation - effectiveTolerance) / effectiveTolerance) * 50);
      }

      totalScore += jointScore;
      totalConfidence += 1;
      jointCount++;
    }

    const overallScore = jointCount > 0 ? totalScore / jointCount : 0;
    const confidence = jointCount > 0 ? totalConfidence / jointCount : 0;
    const isInRange = inRangeCount === jointCount && jointCount > 0;

    if (overallScore > bestScore) {
      bestScore = overallScore;
      bestMatch = targetPose;
      bestConfidence = confidence;
      bestDeviations = deviations;
      bestIsInRange = isInRange;
    }
  }

  return {
    pose: bestMatch,
    confidence: bestConfidence,
    deviations: bestDeviations,
    overallScore: bestScore,
    isInRange: bestIsInRange
  };
}

/**
 * Detect current pose from target poses using angle comparison
 * This function provides a simplified interface for pose detection
 */
export function detectCurrentPose(
  currentAngles: { [joint: string]: number | null },
  targetPoses: any[]
): { pose: any | null; confidence: number; deviations: any } {
  const result = calculatePoseComparison(currentAngles, targetPoses);
  
  return {
    pose: result.pose,
    confidence: result.confidence,
    deviations: result.deviations
  };
} 