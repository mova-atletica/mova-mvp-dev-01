// Enhanced Live Analysis Utilities for Real-time Feedback
import { getAngleWithConfidence, getTrunkAngleWithConfidence } from './analysisUtils';

// Simple DTW implementation for live comparison
export function simpleDTW(seq1: number[], seq2: number[]): { distance: number; path: number[][] } {
  const n = seq1.length;
  const m = seq2.length;
  
  // Create distance matrix
  const dtw: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;
  
  // Fill the matrix
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seq1[i - 1] - seq2[j - 1]);
      dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
    }
  }
  
  // Backtrack to find path
  const path: number[][] = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    path.unshift([i - 1, j - 1]);
    const min = Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
    if (dtw[i - 1][j - 1] === min) {
      i--; j--;
    } else if (dtw[i - 1][j] === min) {
      i--;
    } else {
      j--;
    }
  }
  
  return { distance: dtw[n][m], path };
}

// Cosine similarity for pattern matching
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length || vec1.length === 0) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Normalize angle sequence for body type differences
export function normalizeAngles(angles: number[]): number[] {
  if (angles.length === 0) return [];
  
  const mean = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
  const variance = angles.reduce((sum, angle) => sum + Math.pow(angle - mean, 2), 0) / angles.length;
  const std = Math.sqrt(variance);
  
  if (std === 0) return angles.map(() => 0);
  
  return angles.map(angle => (angle - mean) / std);
}

// Enhanced live comparison with multiple metrics
export interface LiveComparisonResult {
  score: number;
  confidence: number;
  feedback: string;
  severity: 'good' | 'warning' | 'poor';
  metrics: {
    angleDifference: number;
    patternSimilarity: number;
    tempoMatch: number;
    stabilityScore: number;
  };
}

export function calculateLiveComparison(
  currentAngles: { [joint: string]: number | null },
  referenceAngles: { [joint: string]: number[] },
  jointsOfInterest: string[],
  frameIndex: number
): LiveComparisonResult {
  let totalScore = 0;
  let totalConfidence = 0;
  let worstSeverity: 'good' | 'warning' | 'poor' = 'good';
  let feedbackMessages: string[] = [];
  
  const metrics = {
    angleDifference: 0,
    patternSimilarity: 0,
    tempoMatch: 0,
    stabilityScore: 0
  };
  
  jointsOfInterest.forEach(joint => {
    const currentAngle = currentAngles[joint];
    const refAngleArray = referenceAngles[joint] || [];
    
    if (currentAngle === null || refAngleArray.length === 0) return;
    
    // Get reference angle for current frame (with bounds checking)
    const refIndex = Math.min(frameIndex, refAngleArray.length - 1);
    const refAngle = refAngleArray[refIndex];
    
    if (refAngle === null || refAngle === undefined) return;
    
    // 1. Direct angle comparison (current method)
    const angleDiff = Math.abs(currentAngle - refAngle);
    const angleScore = Math.max(0, 100 - (angleDiff * 2));
    
    // 2. Pattern similarity (using recent frames)
    const recentFrames = 10;
    const userRecent = getRecentAngles(joint, currentAngles, recentFrames);
    const refRecent = refAngleArray.slice(Math.max(0, refIndex - recentFrames), refIndex + 1);
    
    if (userRecent.length > 3 && refRecent.length > 3) {
      const normalizedUser = normalizeAngles(userRecent);
      const normalizedRef = normalizeAngles(refRecent);
      const patternSimilarity = cosineSimilarity(normalizedUser, normalizedRef);
      metrics.patternSimilarity = patternSimilarity;
    }
    
    // 3. Tempo analysis (simplified)
    const tempoScore = calculateTempoScore(userRecent, refRecent);
    metrics.tempoMatch = tempoScore;
    
    // 4. Stability score (based on angle variance)
    const stabilityScore = calculateStabilityScore(userRecent);
    metrics.stabilityScore = stabilityScore;
    
    // Combine scores with weights
    const combinedScore = (
      angleScore * 0.4 +
      (metrics.patternSimilarity * 100) * 0.3 +
      tempoScore * 0.2 +
      stabilityScore * 0.1
    );
    
    totalScore += combinedScore;
    totalConfidence += 1;
    
    // Generate feedback
    if (angleDiff > 30) {
      feedbackMessages.push(`Adjust ${joint.replace(/([A-Z])/g, ' $1').trim()} position`);
      worstSeverity = 'poor';
    } else if (angleDiff > 15) {
      feedbackMessages.push(`Fine-tune ${joint.replace(/([A-Z])/g, ' $1').trim()}`);
      if (worstSeverity === 'good') worstSeverity = 'warning';
    }
    
    if (metrics.patternSimilarity < 0.7) {
      feedbackMessages.push(`Movement pattern differs from reference`);
      if (worstSeverity === 'good') worstSeverity = 'warning';
    }
    
    if (stabilityScore < 70) {
      feedbackMessages.push(`Maintain stability`);
      if (worstSeverity === 'good') worstSeverity = 'warning';
    }
    
    metrics.angleDifference += angleDiff;
  });
  
  const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  const avgConfidence = totalConfidence / jointsOfInterest.length;
  metrics.angleDifference = metrics.angleDifference / totalConfidence;
  
  return {
    score: Math.round(avgScore),
    confidence: avgConfidence,
    feedback: feedbackMessages.length > 0 ? feedbackMessages[0] : 'Keep going!',
    severity: worstSeverity,
    metrics
  };
}

// Helper functions
function getRecentAngles(joint: string, currentAngles: { [joint: string]: number | null }, frames: number): number[] {
  // This would need to be implemented with a rolling window of recent angles
  // For now, return a simple array
  return [currentAngles[joint] || 0];
}

function calculateTempoScore(userAngles: number[], refAngles: number[]): number {
  if (userAngles.length < 2 || refAngles.length < 2) return 100;
  
  // Calculate average rate of change
  const userTempo = calculateAverageRateOfChange(userAngles);
  const refTempo = calculateAverageRateOfChange(refAngles);
  
  if (refTempo === 0) return 100;
  
  const tempoDiff = Math.abs(userTempo - refTempo);
  return Math.max(0, 100 - (tempoDiff * 10));
}

function calculateAverageRateOfChange(angles: number[]): number {
  if (angles.length < 2) return 0;
  
  let totalChange = 0;
  for (let i = 1; i < angles.length; i++) {
    totalChange += Math.abs(angles[i] - angles[i - 1]);
  }
  
  return totalChange / (angles.length - 1);
}

function calculateStabilityScore(angles: number[]): number {
  if (angles.length < 3) return 100;
  
  // Calculate variance
  const mean = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
  const variance = angles.reduce((sum, angle) => sum + Math.pow(angle - mean, 2), 0) / angles.length;
  
  // Lower variance = higher stability
  return Math.max(0, 100 - (variance * 2));
}

// Enhanced angle calculation with better confidence
export function calculateAnglesWithConfidence(keypoints: any[]): {
  [joint: string]: { angle: number | null; confidence: number };
} {
  const angles: { [joint: string]: { angle: number | null; confidence: number } } = {};
  
  // Extract keypoints
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

  // Calculate angles with confidence
  angles.leftKnee = leftHip && leftKnee && leftAnkle ? 
    getAngleWithConfidence(leftHip, leftKnee, leftAnkle) : { angle: null, confidence: 0 };
  
  angles.rightKnee = rightHip && rightKnee && rightAnkle ? 
    getAngleWithConfidence(rightHip, rightKnee, rightAnkle) : { angle: null, confidence: 0 };
  
  angles.leftHip = leftShoulder && leftHip && leftKnee ? 
    getAngleWithConfidence(leftShoulder, leftHip, leftKnee) : { angle: null, confidence: 0 };
  
  angles.rightHip = rightShoulder && rightHip && rightKnee ? 
    getAngleWithConfidence(rightShoulder, rightHip, rightKnee) : { angle: null, confidence: 0 };
  
  angles.leftElbow = leftShoulder && leftElbow && leftWrist ? 
    getAngleWithConfidence(leftShoulder, leftElbow, leftWrist) : { angle: null, confidence: 0 };
  
  angles.rightElbow = rightShoulder && rightElbow && rightWrist ? 
    getAngleWithConfidence(rightShoulder, rightElbow, rightWrist) : { angle: null, confidence: 0 };
  
  angles.leftShoulder = leftHip && leftShoulder && leftElbow ? 
    getAngleWithConfidence(leftHip, leftShoulder, leftElbow) : { angle: null, confidence: 0 };
  
  angles.rightShoulder = rightHip && rightShoulder && rightElbow ? 
    getAngleWithConfidence(rightHip, rightShoulder, rightElbow) : { angle: null, confidence: 0 };
  
  angles.trunk = leftShoulder && leftHip ? 
    getTrunkAngleWithConfidence(leftShoulder, leftHip) : { angle: null, confidence: 0 };

  return angles;
} 