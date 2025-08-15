// Real-time Analysis Hook for Live Exercise Feedback
import { useState, useEffect, useRef, useCallback } from 'react';
import { getAngleWithConfidence, getTrunkAngleWithConfidence } from '../lib/analysisUtils';
import { ExerciseAudioFeedback } from '../lib/audioFeedback';

// Enhanced configuration interface
export interface RealTimeAnalysisConfig {
  isActive: boolean;
  audioEnabled: boolean;
  exerciseType: 'auto' | 'repetition' | 'pose' | 'flow';
  sensitivity: 'low' | 'medium' | 'high';
  feedbackLevel: 'minimal' | 'detailed' | 'full';
  dataCollection: boolean; // For recording mode
  jointsOfInterest?: string[]; // Specific joints to analyze
  qualityThreshold?: number; // Minimum quality for analysis
}

// Enhanced result interface
export interface RealTimeAnalysisResult {
  score: number;
  confidence: number;
  feedback: string;
  severity: 'good' | 'warning' | 'poor';
  repCount?: number;
  poseHoldDuration?: number;
  currentPhase?: string;
  timestamp: number;
  shouldCollectData: boolean; // Whether this frame should be collected for analysis
  metrics: {
    angleDifference: number;
    patternSimilarity: number;
    tempoMatch: number;
    stabilityScore: number;
    jointScores: { [joint: string]: number };
    repProgress?: number; // Progress through expected reps
    patternQuality?: number; // Quality of pattern matching
    complexity?: string; // Exercise complexity level
  };
  rawData?: { // For data collection during recording
    pose: any;
    angles: { [joint: string]: number | null };
    frameData: any;
  };
}

export interface ExerciseAnalysisData {
  exerciseType: string;
  repAnalysis?: {
    averageRepDuration: number;
    expectedRepCount: number;
    repDurationRange: { min: number; max: number };
    phases: Array<{ name: string; duration: number }>;
    tempoPattern: { eccentricConcentricRatio: number };
  };
  patternAnalysis?: {
    referencePatterns: { [joint: string]: number[] };
    angleRanges: { [joint: string]: { min: number; max: number } };
    posePatterns?: any;
    flowPatterns?: any;
  };
  quality?: {
    overallQuality: number;
  };
}

// Default configuration
export const DEFAULT_CONFIG: RealTimeAnalysisConfig = {
  isActive: false,
  audioEnabled: true,
  exerciseType: 'auto',
  sensitivity: 'medium',
  feedbackLevel: 'detailed',
  dataCollection: false,
  qualityThreshold: 0.7
};

// Default result when analysis is not available
function getDefaultResult(): RealTimeAnalysisResult {
  return {
    score: 0,
    confidence: 0,
    feedback: 'Analysis not available',
    severity: 'good',
    timestamp: Date.now(),
    shouldCollectData: false,
    metrics: {
      angleDifference: 0,
      patternSimilarity: 0,
      tempoMatch: 0,
      stabilityScore: 0,
      jointScores: {}
    }
  };
}

// Sensitivity multipliers for different analysis levels
const SENSITIVITY_MULTIPLIERS = {
  low: 0.5,
  medium: 1.0,
  high: 1.5
};

// Main hook function with enhanced configuration
export function useRealTimeAnalysis(
  currentPose: any,
  exerciseData: ExerciseAnalysisData | null,
  config: RealTimeAnalysisConfig = DEFAULT_CONFIG
): RealTimeAnalysisResult {
  const [result, setResult] = useState<RealTimeAnalysisResult>(getDefaultResult());
  const audioFeedbackRef = useRef<ExerciseAudioFeedback | null>(null);
  const lastAnalysisRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Determine exercise type from config or exercise data
  const getExerciseType = useCallback((): string => {
    if (config.exerciseType !== 'auto') {
      return config.exerciseType;
    }
    return exerciseData?.exerciseType || 'repetition';
  }, [config.exerciseType, exerciseData?.exerciseType]);
  
  // Initialize audio feedback
  useEffect(() => {
    if (config.isActive && config.audioEnabled && getExerciseType() && !audioFeedbackRef.current) {
      try {
        audioFeedbackRef.current = new ExerciseAudioFeedback(getExerciseType());
      } catch (error) {
        console.warn('Failed to initialize audio feedback:', error);
      }
    }
  }, [config.isActive, config.audioEnabled, getExerciseType()]);
  
  // Main analysis effect
  useEffect(() => {
    if (!config.isActive) {
      setResult(getDefaultResult());
      return;
    }

    // Throttle analysis to prevent excessive processing
    const now = Date.now();
    const minInterval = config.sensitivity === 'high' ? 16 : config.sensitivity === 'medium' ? 33 : 66; // 60fps, 30fps, 15fps
    if (now - lastAnalysisRef.current < minInterval) {
      return;
    }
    lastAnalysisRef.current = now;
    frameCountRef.current++;

    try {
      if (!currentPose || !exerciseData) {
        setResult(getDefaultResult());
        return;
      }
      
      // Check quality threshold
      const qualityThreshold = config.qualityThreshold || 0.7;
      if (exerciseData.quality && exerciseData.quality.overallQuality < qualityThreshold) {
        setResult({
          ...getDefaultResult(),
          feedback: 'Low quality pose detected',
          severity: 'warning'
        });
        return;
      }
      
      // Determine if we should collect this frame's data
      const shouldCollectData = config.dataCollection && frameCountRef.current % 3 === 0; // Collect every 3rd frame
      
      let analysisResult: RealTimeAnalysisResult;
      const exerciseType = getExerciseType();
      
      // Exercise-type-specific analysis
      switch (exerciseType) {
        case 'repetition':
          analysisResult = analyzeRepetitionExercise(
            currentPose, 
            exerciseData.repAnalysis, 
            exerciseData.patternAnalysis,
            audioFeedbackRef.current,
            config
          );
          break;
        case 'pose':
          analysisResult = analyzePoseExercise(
            currentPose, 
            exerciseData.patternAnalysis,
            audioFeedbackRef.current,
            config
          );
          break;
        case 'flow':
          analysisResult = analyzeFlowExercise(
            currentPose, 
            exerciseData.patternAnalysis,
            config
          );
          break;
        default:
          analysisResult = getDefaultResult();
      }
      
      // Add timestamp and data collection flag
      analysisResult.timestamp = now;
      analysisResult.shouldCollectData = shouldCollectData;
      
      // Add raw data for collection if needed
      if (shouldCollectData) {
        analysisResult.rawData = {
          pose: currentPose,
          angles: extractCurrentAngles(currentPose),
          frameData: {
            frameNumber: frameCountRef.current,
            timestamp: now
          }
        };
      }
      
      setResult(analysisResult);
    } catch (error) {
      console.error('Error in real-time analysis:', error);
      setResult({
        ...getDefaultResult(),
        feedback: 'Analysis error occurred',
        severity: 'warning'
      });
    }
  }, [config.isActive, currentPose, exerciseData, config, getExerciseType]);
  
  // Reset audio feedback when exercise changes or analysis is deactivated
  useEffect(() => {
    if (audioFeedbackRef.current) {
      audioFeedbackRef.current.reset();
    }
  }, [getExerciseType(), config.isActive]);
  
  return result;
}

// Enhanced repetition exercise analysis
function analyzeRepetitionExercise(
  currentPose: any,
  repAnalysis: any,
  patternAnalysis: any,
  audioFeedback: ExerciseAudioFeedback | null,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult {
  if (!currentPose || !repAnalysis || !patternAnalysis) {
    return getDefaultResult();
  }

  try {
    // Extract current angles
    const currentAngles = extractCurrentAngles(currentPose);
    
    // Use stored pattern analysis data if available
    let patternComparison;
    if (patternAnalysis.referencePatterns && Object.keys(patternAnalysis.referencePatterns).length > 0) {
      // Use stored reference patterns
      patternComparison = compareWithReferencePatterns(
        currentAngles, 
        patternAnalysis.referencePatterns, 
        config
      );
    } else {
      // Fallback to basic pattern comparison
      patternComparison = compareWithReferencePatterns(
        currentAngles, 
        {}, 
        config
      );
    }
    
    // Use stored rep analysis data for better detection
    let repCompletion;
    if (repAnalysis.averageRepDuration && repAnalysis.expectedRepCount) {
      // Use stored rep analysis data
      repCompletion = detectRepCompletionWithStoredData(
        currentAngles, 
        repAnalysis, 
        config
      );
    } else {
      // Fallback to basic rep detection
      repCompletion = detectRepCompletion(currentAngles, repAnalysis, config);
    }
    
    // Provide rep-specific feedback based on stored data
    let feedback = getFeedbackMessage(patternComparison, config.feedbackLevel);
    if (repAnalysis.expectedRepCount && repCompletion.repCount) {
      const repProgress = repCompletion.repCount / repAnalysis.expectedRepCount;
      if (repProgress >= 0.8) {
        feedback = `Great! Almost done. ${repAnalysis.expectedRepCount - repCompletion.repCount} reps to go.`;
      } else if (repProgress >= 0.5) {
        feedback = `Halfway there! ${repCompletion.repCount}/${repAnalysis.expectedRepCount} reps completed.`;
      }
    }
    
    // Handle rep completion with audio feedback
    if (repCompletion.completed && audioFeedback) {
      try {
        audioFeedback.onRepCompletion();
      } catch (error) {
        console.warn('Audio feedback error:', error);
      }
    }
    
    // Calculate overall score with sensitivity adjustment
    const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
    const adjustedScore = Math.min(100, patternComparison.score * sensitivityMultiplier);
    
    return {
      score: Math.round(adjustedScore),
      confidence: patternComparison.confidence,
      feedback: feedback,
      severity: patternComparison.severity,
      repCount: repCompletion.repCount || (audioFeedback ? audioFeedback.getRepCount() : 0),
      currentPhase: repCompletion.phase,
      timestamp: Date.now(),
      shouldCollectData: false,
      metrics: {
        ...patternComparison.metrics,
        repProgress: repAnalysis.expectedRepCount ? (repCompletion.repCount || 0) / repAnalysis.expectedRepCount : 0,
        tempoMatch: repAnalysis.averageRepDuration ? calculateTempoMatch(repCompletion.duration, repAnalysis.averageRepDuration) : 0
      }
    };
  } catch (error) {
    console.error('Error in repetition analysis:', error);
    return getDefaultResult();
  }
}

// Enhanced pose exercise analysis
function analyzePoseExercise(
  currentPose: any,
  patternAnalysis: any,
  audioFeedback: ExerciseAudioFeedback | null,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult {
  if (!currentPose || !patternAnalysis) {
    return getDefaultResult();
  }

  try {
    // Extract current angles
    const currentAngles = extractCurrentAngles(currentPose);
    
    // Use stored pattern analysis data if available
    let poseAccuracy;
    if (patternAnalysis.referencePatterns && Object.keys(patternAnalysis.referencePatterns).length > 0) {
      // Use stored reference patterns for pose accuracy
      poseAccuracy = checkPoseAccuracyWithStoredData(currentAngles, patternAnalysis, config);
    } else {
      // Fallback to basic pose accuracy check
      poseAccuracy = checkPoseAccuracy(currentAngles, patternAnalysis.posePatterns, config);
    }
    
    // Provide pose-specific feedback based on stored data
    let feedback = getFeedbackMessage(poseAccuracy, config.feedbackLevel);
    if (patternAnalysis.primaryJoints && patternAnalysis.primaryJoints.length > 0) {
      const primaryJoint = patternAnalysis.primaryJoints[0];
      if (poseAccuracy.severity === 'poor') {
        feedback = `Focus on ${primaryJoint} position. ${feedback}`;
      }
    }
    
    // Handle pose achievement
    if (poseAccuracy.achieved && audioFeedback && !audioFeedback.getPoseHoldDuration()) {
      try {
        audioFeedback.onPoseAchievement();
      } catch (error) {
        console.warn('Audio feedback error:', error);
      }
    }
    
    // Update pose hold duration
    const holdDuration = audioFeedback ? audioFeedback.getPoseHoldDuration() : 0;
    if (audioFeedback) {
      try {
        audioFeedback.onPoseHoldUpdate(holdDuration);
      } catch (error) {
        console.warn('Audio feedback error:', error);
      }
    }
    
    // Calculate overall score with sensitivity adjustment
    const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
    const adjustedScore = Math.min(100, poseAccuracy.score * sensitivityMultiplier);
    
    return {
      score: Math.round(adjustedScore),
      confidence: poseAccuracy.confidence,
      feedback: feedback,
      severity: poseAccuracy.severity,
      poseHoldDuration: holdDuration,
      timestamp: Date.now(),
      shouldCollectData: false,
      metrics: {
        ...poseAccuracy.metrics,
        patternQuality: patternAnalysis.patternQuality || 0
      }
    };
  } catch (error) {
    console.error('Error in pose analysis:', error);
    return getDefaultResult();
  }
}

// Enhanced flow exercise analysis
function analyzeFlowExercise(
  currentPose: any,
  patternAnalysis: any,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult {
  if (!currentPose || !patternAnalysis) {
    return getDefaultResult();
  }

  try {
    // Extract current angles
    const currentAngles = extractCurrentAngles(currentPose);
    
    // Use stored pattern analysis data if available
    let flowAnalysis;
    if (patternAnalysis.referencePatterns && Object.keys(patternAnalysis.referencePatterns).length > 0) {
      // Use stored reference patterns for flow analysis
      flowAnalysis = analyzeFlowSequenceWithStoredData(currentAngles, patternAnalysis, config);
    } else {
      // Fallback to basic flow analysis
      flowAnalysis = analyzeFlowSequence(currentAngles, patternAnalysis.flowPatterns, config);
    }
    
    // Provide flow-specific feedback based on stored data
    let feedback = getFeedbackMessage(flowAnalysis, config.feedbackLevel);
    if (patternAnalysis.complexity) {
      if (flowAnalysis.severity === 'poor') {
        feedback = `Focus on smooth transitions. ${feedback}`;
      } else if (flowAnalysis.severity === 'good') {
        feedback = `Great flow! Keep the rhythm. ${feedback}`;
      }
    }
    
    // Calculate overall score with sensitivity adjustment
    const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
    const adjustedScore = Math.min(100, flowAnalysis.score * sensitivityMultiplier);
    
    return {
      score: Math.round(adjustedScore),
      confidence: flowAnalysis.confidence,
      feedback: feedback,
      severity: flowAnalysis.severity,
      timestamp: Date.now(),
      shouldCollectData: false,
      metrics: {
        ...flowAnalysis.metrics,
        patternQuality: patternAnalysis.patternQuality || 0,
        complexity: patternAnalysis.complexity || 'medium'
      }
    };
  } catch (error) {
    console.error('Error in flow analysis:', error);
    return getDefaultResult();
  }
}

// Helper functions

function extractCurrentAngles(pose: any): { [joint: string]: number | null } {
  try {
    if (!pose || !pose.keypoints) {
      return {
        leftKnee: null,
        rightKnee: null,
        leftHip: null,
        rightHip: null,
        leftElbow: null,
        rightElbow: null,
        leftShoulder: null,
        rightShoulder: null,
        trunk: null
      };
    }
    
    const leftKnee = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[13], pose.keypoints[15]);
    const rightKnee = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[14], pose.keypoints[16]);
    const leftHip = getAngleWithConfidence(pose.keypoints[23], pose.keypoints[11], pose.keypoints[13]);
    const rightHip = getAngleWithConfidence(pose.keypoints[24], pose.keypoints[12], pose.keypoints[14]);
    const leftElbow = getAngleWithConfidence(pose.keypoints[5], pose.keypoints[7], pose.keypoints[9]);
    const rightElbow = getAngleWithConfidence(pose.keypoints[6], pose.keypoints[8], pose.keypoints[10]);
    const leftShoulder = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[5], pose.keypoints[7]);
    const rightShoulder = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[6], pose.keypoints[8]);
    const trunk = getTrunkAngleWithConfidence(pose.keypoints[5], pose.keypoints[23]);
    
    return {
      leftKnee: leftKnee.angle,
      rightKnee: rightKnee.angle,
      leftHip: leftHip.angle,
      rightHip: rightHip.angle,
      leftElbow: leftElbow.angle,
      rightElbow: rightElbow.angle,
      leftShoulder: leftShoulder.angle,
      rightShoulder: rightShoulder.angle,
      trunk: trunk.angle
    };
  } catch (error) {
    console.error('Error extracting angles:', error);
    return {
      leftKnee: null,
      rightKnee: null,
      leftHip: null,
      rightHip: null,
      leftElbow: null,
      rightElbow: null,
      leftShoulder: null,
      rightShoulder: null,
      trunk: null
    };
  }
}

function compareWithReferencePatterns(
  currentAngles: { [joint: string]: number | null },
  referencePatterns: { [joint: string]: number[] },
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult {
  let totalScore = 0;
  let totalConfidence = 0;
  let worstSeverity: 'good' | 'warning' | 'poor' = 'good';
  let feedbackMessages: string[] = [];
  const jointScores: { [joint: string]: number } = {};
  
  const metrics = {
    angleDifference: 0,
    patternSimilarity: 0,
    tempoMatch: 0,
    stabilityScore: 0,
    jointScores: {}
  };
  
  // Adjust thresholds based on sensitivity
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
  const poorThreshold = 30 / sensitivityMultiplier;
  const warningThreshold = 15 / sensitivityMultiplier;
  
  Object.keys(referencePatterns).forEach(joint => {
    const currentAngle = currentAngles[joint];
    const refPattern = referencePatterns[joint];
    
    if (currentAngle === null || refPattern.length === 0) return;
    
    // Use the middle of the reference pattern as target
    const targetAngle = refPattern[Math.floor(refPattern.length / 2)];
    const angleDiff = Math.abs(currentAngle - targetAngle);
    
    // Calculate score based on angle difference
    const angleScore = Math.max(0, 100 - (angleDiff * 2));
    jointScores[joint] = angleScore;
    
    // Determine severity with adjusted thresholds
    if (angleDiff > poorThreshold) {
      feedbackMessages.push(`Adjust ${joint.replace(/([A-Z])/g, ' $1').trim()} position`);
      worstSeverity = 'poor';
    } else if (angleDiff > warningThreshold) {
      feedbackMessages.push(`Fine-tune ${joint.replace(/([A-Z])/g, ' $1').trim()}`);
      if (worstSeverity === 'good') worstSeverity = 'warning';
    }
    
    totalScore += angleScore;
    totalConfidence += 1;
    metrics.angleDifference += angleDiff;
  });
  
  const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  const avgConfidence = totalConfidence / Object.keys(referencePatterns).length;
  metrics.angleDifference = metrics.angleDifference / totalConfidence;
  metrics.jointScores = jointScores;
  
  return {
    score: Math.round(avgScore),
    confidence: avgConfidence,
    feedback: feedbackMessages.length > 0 ? feedbackMessages[0] : 'Keep going!',
    severity: worstSeverity,
    timestamp: Date.now(),
    shouldCollectData: false,
    metrics
  };
}

function detectRepCompletion(
  currentAngles: { [joint: string]: number | null },
  repAnalysis: any,
  config: RealTimeAnalysisConfig
): { completed: boolean; phase: string; repCount: number; duration: number } {
  // Enhanced rep detection with sensitivity
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
  
  // Simplified rep detection - would need more sophisticated logic
  const completed = false; // Placeholder
  const phase = 'eccentric'; // Placeholder
  const repCount = 0; // Placeholder
  const duration = 2.0; // Placeholder
  
  return { completed, phase, repCount, duration };
}

function checkPoseAccuracy(
  currentAngles: { [joint: string]: number | null },
  posePatterns: any,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult & { achieved: boolean } {
  if (!posePatterns) {
    return { ...getDefaultResult(), achieved: false };
  }
  
  let totalScore = 0;
  let totalConfidence = 0;
  let worstSeverity: 'good' | 'warning' | 'poor' = 'good';
  let feedbackMessages: string[] = [];
  let achieved = true;
  const jointScores: { [joint: string]: number } = {};
  
  const metrics = {
    angleDifference: 0,
    patternSimilarity: 0,
    tempoMatch: 0,
    stabilityScore: 0,
    jointScores: {}
  };
  
  // Adjust tolerance based on sensitivity
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
  
  Object.keys(posePatterns).forEach(joint => {
    const currentAngle = currentAngles[joint];
    const targetPattern = posePatterns[joint];
    
    if (currentAngle === null) return;
    
    const adjustedTolerance = targetPattern.tolerance / sensitivityMultiplier;
    const angleDiff = Math.abs(currentAngle - targetPattern.targetAngle);
    const angleScore = Math.max(0, 100 - (angleDiff * 2));
    jointScores[joint] = angleScore;
    
    // Check if pose is achieved with adjusted tolerance
    if (angleDiff > adjustedTolerance) {
      achieved = false;
      feedbackMessages.push(`Adjust ${joint.replace(/([A-Z])/g, ' $1').trim()} position`);
      worstSeverity = 'poor';
    }
    
    totalScore += angleScore;
    totalConfidence += 1;
    metrics.angleDifference += angleDiff;
  });
  
  const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  const avgConfidence = totalConfidence / Object.keys(posePatterns).length;
  metrics.jointScores = jointScores;
  
  return {
    score: Math.round(avgScore),
    confidence: avgConfidence,
    feedback: achieved ? 'Pose achieved!' : feedbackMessages[0] || 'Adjust position',
    severity: achieved ? 'good' : worstSeverity,
    timestamp: Date.now(),
    shouldCollectData: false,
    metrics,
    achieved
  };
}

// Enhanced flow sequence analysis using stored pattern analysis data
function analyzeFlowSequenceWithStoredData(
  currentAngles: { [joint: string]: number | null },
  patternAnalysis: any,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult {
  if (!patternAnalysis.referencePatterns) {
    return getDefaultResult();
  }
  
  let totalScore = 0;
  let totalConfidence = 0;
  const jointScores: { [joint: string]: number } = {};
  
  const metrics = {
    angleDifference: 0,
    patternSimilarity: 0,
    tempoMatch: 0,
    stabilityScore: 0,
    jointScores: {}
  };
  
  // Adjust tolerance based on sensitivity
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
  
  // Use stored reference patterns for flow analysis
  Object.keys(patternAnalysis.referencePatterns).forEach(joint => {
    const currentAngle = currentAngles[joint];
    const referencePattern = patternAnalysis.referencePatterns[joint];
    const angleRange = patternAnalysis.angleRanges?.[joint];
    
    if (currentAngle === null) return;
    
    // Use stored angle range if available, otherwise use default tolerance
    const tolerance = angleRange ? (angleRange.max - angleRange.min) / 6 : 15;
    const adjustedTolerance = tolerance / sensitivityMultiplier;
    
    // Compare with reference pattern for flow
    const angleDiff = Math.abs(currentAngle - referencePattern);
    const angleScore = Math.max(0, 100 - (angleDiff * 1.5)); // More lenient for flow
    jointScores[joint] = angleScore;
    
    totalScore += angleScore;
    totalConfidence += 1;
    metrics.angleDifference += angleDiff;
  });
  
  const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  const avgConfidence = totalConfidence / Object.keys(patternAnalysis.referencePatterns).length;
  metrics.jointScores = jointScores;
  
  return {
    score: Math.round(avgScore),
    confidence: avgConfidence,
    feedback: 'Flow sequence in progress',
    severity: avgScore > 70 ? 'good' : avgScore > 40 ? 'warning' : 'poor',
    timestamp: Date.now(),
    shouldCollectData: false,
    metrics
  };
}

function analyzeFlowSequence(
  currentAngles: { [joint: string]: number | null },
  flowPatterns: any,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult {
  if (!flowPatterns) {
    return getDefaultResult();
  }
  
  // Enhanced flow analysis with sensitivity
  let totalScore = 0;
  let totalConfidence = 0;
  const jointScores: { [joint: string]: number } = {};
  
  const metrics = {
    angleDifference: 0,
    patternSimilarity: 0,
    tempoMatch: 0,
    stabilityScore: 0,
    jointScores: {}
  };
  
  Object.keys(flowPatterns).forEach(joint => {
    const currentAngle = currentAngles[joint];
    const flowPattern = flowPatterns[joint];
    
    if (currentAngle === null) return;
    
    // Enhanced comparison with flow pattern
    const patternScore = 80; // Simplified - would need more sophisticated logic
    jointScores[joint] = patternScore;
    totalScore += patternScore;
    totalConfidence += 1;
  });
  
  const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  metrics.jointScores = jointScores;
  
  return {
    score: Math.round(avgScore),
    confidence: 0.8,
    feedback: 'Flow sequence in progress',
    severity: 'good',
    timestamp: Date.now(),
    shouldCollectData: false,
    metrics
  };
}

// Helper function to get appropriate feedback message based on level
function getFeedbackMessage(
  analysis: RealTimeAnalysisResult, 
  feedbackLevel: 'minimal' | 'detailed' | 'full'
): string {
  switch (feedbackLevel) {
    case 'minimal':
      return analysis.severity === 'good' ? 'Good!' : 'Adjust form';
    case 'detailed':
      return analysis.feedback;
    case 'full':
      return `${analysis.feedback} (Score: ${analysis.score}, Confidence: ${Math.round(analysis.confidence * 100)}%)`;
    default:
      return analysis.feedback;
  }
}

// Enhanced rep completion detection using stored analysis data
function detectRepCompletionWithStoredData(
  currentAngles: { [joint: string]: number | null },
  repAnalysis: any,
  config: RealTimeAnalysisConfig
): { completed: boolean; repCount: number; phase: string; duration: number } {
  // This is a simplified implementation - in a real system, you'd track rep state over time
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
  
  // Use stored average rep duration to estimate rep completion
  const estimatedDuration = repAnalysis.averageRepDuration || 2.0;
  const adjustedDuration = estimatedDuration / sensitivityMultiplier;
  
  // Simplified rep detection - in practice, you'd need more sophisticated state tracking
  const repCount = Math.floor(Date.now() / (adjustedDuration * 1000));
  
  return {
    completed: false, // Would need state tracking to determine actual completion
    repCount: Math.min(repCount, repAnalysis.expectedRepCount || 10),
    phase: 'active',
    duration: adjustedDuration
  };
}

// Calculate tempo match between current and expected rep duration
function calculateTempoMatch(currentDuration: number, expectedDuration: number): number {
  if (!expectedDuration || expectedDuration === 0) return 0;
  
  const durationDiff = Math.abs(currentDuration - expectedDuration);
  const tempoScore = Math.max(0, 100 - (durationDiff / expectedDuration) * 100);
  return Math.round(tempoScore);
}

// Enhanced pose accuracy check using stored pattern analysis data
function checkPoseAccuracyWithStoredData(
  currentAngles: { [joint: string]: number | null },
  patternAnalysis: any,
  config: RealTimeAnalysisConfig
): RealTimeAnalysisResult & { achieved: boolean } {
  if (!patternAnalysis.referencePatterns) {
    return { ...getDefaultResult(), achieved: false };
  }
  
  let totalScore = 0;
  let totalConfidence = 0;
  let worstSeverity: 'good' | 'warning' | 'poor' = 'good';
  let feedbackMessages: string[] = [];
  let achieved = true;
  const jointScores: { [joint: string]: number } = {};
  
  const metrics = {
    angleDifference: 0,
    patternSimilarity: 0,
    tempoMatch: 0,
    stabilityScore: 0,
    jointScores: {}
  };
  
  // Adjust tolerance based on sensitivity
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[config.sensitivity];
  
  // Use stored reference patterns and angle ranges
  Object.keys(patternAnalysis.referencePatterns).forEach(joint => {
    const currentAngle = currentAngles[joint];
    const referencePattern = patternAnalysis.referencePatterns[joint];
    const angleRange = patternAnalysis.angleRanges?.[joint];
    
    if (currentAngle === null) return;
    
    // Use stored angle range if available, otherwise use default tolerance
    const tolerance = angleRange ? (angleRange.max - angleRange.min) / 4 : 10;
    const adjustedTolerance = tolerance / sensitivityMultiplier;
    
    // Compare with reference pattern
    const angleDiff = Math.abs(currentAngle - referencePattern);
    const angleScore = Math.max(0, 100 - (angleDiff * 2));
    jointScores[joint] = angleScore;
    
    // Check if pose is achieved with adjusted tolerance
    if (angleDiff > adjustedTolerance) {
      achieved = false;
      const jointName = joint.replace(/([A-Z])/g, ' $1').trim();
      feedbackMessages.push(`Adjust ${jointName} position`);
      worstSeverity = 'poor';
    }
    
    totalScore += angleScore;
    totalConfidence += 1;
    metrics.angleDifference += angleDiff;
  });
  
  const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  const avgConfidence = totalConfidence / Object.keys(patternAnalysis.referencePatterns).length;
  metrics.jointScores = jointScores;
  
  return {
    score: Math.round(avgScore),
    confidence: avgConfidence,
    feedback: achieved ? 'Pose achieved!' : feedbackMessages[0] || 'Adjust position',
    severity: achieved ? 'good' : worstSeverity,
    timestamp: Date.now(),
    shouldCollectData: false,
    metrics,
    achieved
  };
} 