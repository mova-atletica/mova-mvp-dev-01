// Exercise Analysis Pipeline for Real-time Analysis Foundation
import { getAngleWithConfidence, getTrunkAngleWithConfidence } from './analysisUtils';

// Types for analysis pipeline
export interface AnalysisPipelineResult {
  classification: {
    exerciseType: string;
    exerciseSubtype?: string;
    confidence: number;
  };
  repAnalysis: {
    averageRepDuration: number;
    expectedRepCount: number;
    repDurationRange: { min: number; max: number };
    phases: Array<{ name: string; duration: number }>;
    tempoPattern: { eccentricConcentricRatio: number };
    confidence: number;
  };
  patternAnalysis: {
    referencePatterns: { [joint: string]: number[] };
    angleRanges: { [joint: string]: { min: number; max: number } };
    posePatterns?: any;
    flowPatterns?: any;
    patternQuality: number;
  };
  quality: {
    classificationQuality: number;
    repAnalysisQuality: number;
    patternQuality: number;
    overallQuality: number;
    issues: Array<{ type: string; message: string }>;
  };
}

// Exercise classification based on movement patterns
async function classifyExercise(keypoints: any[], exerciseTitle: string): Promise<AnalysisPipelineResult['classification']> {
  // Simple classification based on exercise title and movement patterns
  const title = exerciseTitle.toLowerCase();
  
  // Check for pose exercises
  if (title.includes('plank') || title.includes('bridge') || title.includes('hold') || title.includes('static')) {
    return {
      exerciseType: 'pose',
      exerciseSubtype: 'static',
      confidence: 0.85
    };
  }
  
  // Check for flow exercises
  if (title.includes('flow') || title.includes('sequence') || title.includes('dance') || title.includes('yoga')) {
    return {
      exerciseType: 'flow',
      exerciseSubtype: 'sequence',
      confidence: 0.80
    };
  }
  
  // Default to repetition exercises
  return {
    exerciseType: 'repetition',
    exerciseSubtype: 'strength',
    confidence: 0.90
  };
}

// Analyze repetitions in the video
async function analyzeRepetitions(keypoints: any[], exerciseType: string): Promise<AnalysisPipelineResult['repAnalysis']> {
  if (exerciseType === 'pose' || exerciseType === 'flow') {
    // For pose and flow exercises, return default values
    return {
      averageRepDuration: 0,
      expectedRepCount: 1,
      repDurationRange: { min: 0, max: 0 },
      phases: [],
      tempoPattern: { eccentricConcentricRatio: 1.0 },
      confidence: 1.0
    };
  }
  
  // For repetition exercises, analyze the movement patterns
  const angles = extractAnglesFromKeypoints(keypoints);
  const repCount = detectRepetitions(angles);
  const repDuration = calculateRepDuration(keypoints, repCount);
  
  return {
    averageRepDuration: repDuration.average,
    expectedRepCount: repCount,
    repDurationRange: { min: repDuration.min, max: repDuration.max },
    phases: [
      { name: 'eccentric', duration: repDuration.average * 0.6 },
      { name: 'concentric', duration: repDuration.average * 0.4 }
    ],
    tempoPattern: { eccentricConcentricRatio: 1.5 },
    confidence: 0.85
  };
}

// Generate reference patterns for real-time comparison
async function generatePatterns(
  keypoints: any[], 
  exerciseType: string, 
  jointsOfInterest: string[]
): Promise<AnalysisPipelineResult['patternAnalysis']> {
  const angles = extractAnglesFromKeypoints(keypoints);
  const referencePatterns: { [joint: string]: number[] } = {};
  const angleRanges: { [joint: string]: { min: number; max: number } } = {};
  
  // Generate patterns for each joint of interest
  jointsOfInterest.forEach(joint => {
    const jointAngles = angles[joint] || [];
    if (jointAngles.length > 0) {
      // Filter out null values for reference patterns
      const validAngles = jointAngles.filter(a => a !== null) as number[];
      referencePatterns[joint] = validAngles;
      angleRanges[joint] = {
        min: Math.min(...validAngles),
        max: Math.max(...validAngles)
      };
    }
  });
  
  // Exercise-type-specific patterns
  let posePatterns, flowPatterns;
  if (exerciseType === 'pose') {
    posePatterns = generatePosePatterns(angles, jointsOfInterest);
  } else if (exerciseType === 'flow') {
    flowPatterns = generateFlowPatterns(angles, jointsOfInterest);
  }
  
  return {
    referencePatterns,
    angleRanges,
    posePatterns,
    flowPatterns,
    patternQuality: calculatePatternQuality(referencePatterns)
  };
}

// Assess overall analysis quality
async function assessQuality(
  classification: AnalysisPipelineResult['classification'],
  repAnalysis: AnalysisPipelineResult['repAnalysis'],
  patternAnalysis: AnalysisPipelineResult['patternAnalysis']
): Promise<AnalysisPipelineResult['quality']> {
  const issues: Array<{ type: string; message: string }> = [];
  
  // Check classification quality
  const classificationQuality = classification.confidence;
  if (classificationQuality < 0.7) {
    issues.push({ type: 'low_confidence', message: 'Exercise classification confidence is low' });
  }
  
  // Check rep analysis quality
  const repAnalysisQuality = repAnalysis.confidence;
  if (repAnalysisQuality < 0.7) {
    issues.push({ type: 'rep_analysis', message: 'Repetition analysis confidence is low' });
  }
  
  // Check pattern quality
  const patternQuality = patternAnalysis.patternQuality;
  if (patternQuality < 0.7) {
    issues.push({ type: 'pattern_quality', message: 'Pattern quality is below threshold' });
  }
  
  // Calculate overall quality
  const overallQuality = (classificationQuality + repAnalysisQuality + patternQuality) / 3;
  
  return {
    classificationQuality,
    repAnalysisQuality,
    patternQuality,
    overallQuality,
    issues
  };
}

// Main analysis pipeline function
export async function runAnalysisPipeline(
  keypoints: any[],
  exerciseTitle: string,
  jointsOfInterest: string[]
): Promise<AnalysisPipelineResult> {
  try {
    // 1. Exercise classification
    const classification = await classifyExercise(keypoints, exerciseTitle);
    
    // 2. Repetition analysis
    const repAnalysis = await analyzeRepetitions(keypoints, classification.exerciseType);
    
    // 3. Pattern generation
    const patternAnalysis = await generatePatterns(keypoints, classification.exerciseType, jointsOfInterest);
    
    // 4. Quality assessment
    const quality = await assessQuality(classification, repAnalysis, patternAnalysis);
    
    return { classification, repAnalysis, patternAnalysis, quality };
  } catch (error) {
    console.error('Analysis pipeline failed:', error);
    throw new Error('Analysis pipeline failed');
  }
}

// Helper functions

function extractAnglesFromKeypoints(keypoints: any[]): { [joint: string]: (number | null)[] } {
  const angles: { [joint: string]: (number | null)[] } = {
    leftKnee: [],
    rightKnee: [],
    leftHip: [],
    rightHip: [],
    leftElbow: [],
    rightElbow: [],
    leftShoulder: [],
    rightShoulder: [],
    trunk: []
  };
  
  keypoints.forEach(pose => {
    if (!pose) {
      Object.keys(angles).forEach(joint => angles[joint].push(null));
      return;
    }
    
    // Extract angles for each joint
    const leftKnee = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[13], pose.keypoints[15]);
    const rightKnee = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[14], pose.keypoints[16]);
    const leftHip = getAngleWithConfidence(pose.keypoints[23], pose.keypoints[11], pose.keypoints[13]);
    const rightHip = getAngleWithConfidence(pose.keypoints[24], pose.keypoints[12], pose.keypoints[14]);
    const leftElbow = getAngleWithConfidence(pose.keypoints[5], pose.keypoints[7], pose.keypoints[9]);
    const rightElbow = getAngleWithConfidence(pose.keypoints[6], pose.keypoints[8], pose.keypoints[10]);
    const leftShoulder = getAngleWithConfidence(pose.keypoints[11], pose.keypoints[5], pose.keypoints[7]);
    const rightShoulder = getAngleWithConfidence(pose.keypoints[12], pose.keypoints[6], pose.keypoints[8]);
    const trunk = getTrunkAngleWithConfidence(pose.keypoints[5], pose.keypoints[23]);
    
    angles.leftKnee.push(leftKnee.angle);
    angles.rightKnee.push(rightKnee.angle);
    angles.leftHip.push(leftHip.angle);
    angles.rightHip.push(rightHip.angle);
    angles.leftElbow.push(leftElbow.angle);
    angles.rightElbow.push(rightElbow.angle);
    angles.leftShoulder.push(leftShoulder.angle);
    angles.rightShoulder.push(rightShoulder.angle);
    angles.trunk.push(trunk.angle);
  });
  
  return angles;
}

function detectRepetitions(angles: { [joint: string]: (number | null)[] }): number {
  // Simple repetition detection based on angle variance
  const joint = Object.keys(angles)[0]; // Use first joint for detection
  const jointAngles = angles[joint] || [];
  
  if (jointAngles.length < 30) return 1; // Too short for reliable detection
  
  // Count peaks in the angle data
  let peaks = 0;
  for (let i = 1; i < jointAngles.length - 1; i++) {
    const prev = jointAngles[i - 1];
    const curr = jointAngles[i];
    const next = jointAngles[i + 1];
    
    if (prev !== null && curr !== null && next !== null) {
      if (curr > prev && curr > next) {
        peaks++;
      }
    }
  }
  
  return Math.max(1, Math.round(peaks / 2));
}

function calculateRepDuration(keypoints: any[], repCount: number): { average: number; min: number; max: number } {
  const duration = keypoints.length / 30; // Assuming 30fps
  const avgRepDuration = duration / repCount;
  
  return {
    average: avgRepDuration,
    min: avgRepDuration * 0.8,
    max: avgRepDuration * 1.2
  };
}

function generatePosePatterns(angles: { [joint: string]: (number | null)[] }, jointsOfInterest: string[]): any {
  // Generate pose-specific patterns for static holds
  const patterns: any = {};
  
  jointsOfInterest.forEach(joint => {
    const jointAngles = angles[joint] || [];
    if (jointAngles.length > 0) {
      const validAngles = jointAngles.filter(a => a !== null);
      if (validAngles.length > 0) {
        patterns[joint] = {
          targetAngle: validAngles.reduce((a, b) => a + b, 0) / validAngles.length,
          tolerance: 15,
          stabilityThreshold: 0.8
        };
      }
    }
  });
  
  return patterns;
}

function generateFlowPatterns(angles: { [joint: string]: (number | null)[] }, jointsOfInterest: string[]): any {
  // Generate flow-specific patterns for movement sequences
  const patterns: any = {};
  
  jointsOfInterest.forEach(joint => {
    const jointAngles = angles[joint] || [];
    if (jointAngles.length > 0) {
      patterns[joint] = {
        sequence: jointAngles,
        smoothnessThreshold: 0.7,
        transitionPoints: detectTransitionPoints(jointAngles)
      };
    }
  });
  
  return patterns;
}

function detectTransitionPoints(angles: (number | null)[]): number[] {
  // Detect significant changes in movement direction
  const transitions: number[] = [];
  
  for (let i = 1; i < angles.length - 1; i++) {
    const prev = angles[i - 1];
    const curr = angles[i];
    const next = angles[i + 1];
    
    if (prev !== null && curr !== null && next !== null) {
      const prevDiff = curr - prev;
      const nextDiff = next - curr;
      
      if (Math.sign(prevDiff) !== Math.sign(nextDiff) && Math.abs(prevDiff) > 10) {
        transitions.push(i);
      }
    }
  }
  
  return transitions;
}

function calculatePatternQuality(patterns: { [joint: string]: number[] }): number {
  // Calculate pattern quality based on data consistency
  const joints = Object.keys(patterns);
  if (joints.length === 0) return 0;
  
  let totalQuality = 0;
  
  joints.forEach(joint => {
    const jointPattern = patterns[joint];
    if (jointPattern.length > 0) {
      // Quality based on pattern length and variance
      const variance = calculateVariance(jointPattern);
      const quality = Math.max(0, 1 - (variance / 100));
      totalQuality += quality;
    }
  });
  
  return totalQuality / joints.length;
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
} 