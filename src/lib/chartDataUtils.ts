// Utility functions for preparing chart data for different exercise types

// Prepare data for angle comparison chart
export const prepareAngleComparisonData = (userAngles: any, referenceAngles: any, jointsOfInterest: string[]) => {
  if (!userAngles || !referenceAngles) return [];
  
  const maxLength = Math.max(
    ...Object.values(userAngles).map((arr: any) => arr.length),
    ...Object.values(referenceAngles).map((arr: any) => arr.length)
  );
  
  const data = [];
  for (let i = 0; i < maxLength; i++) {
    const point: any = { frame: i + 1 };
    jointsOfInterest.forEach((joint: string) => {
      const userKey = `${joint}Angles`;
      const refKey = `${joint}Angles`;
      if (userAngles[userKey] && userAngles[userKey][i] !== null) {
        point[`${joint}_user`] = userAngles[userKey][i];
      }
      if (referenceAngles[refKey] && referenceAngles[refKey][i] !== null) {
        point[`${joint}_ref`] = referenceAngles[refKey][i];
      }
    });
    data.push(point);
  }
  return data;
};

// Prepare data for rep angle comparison chart with rep boundaries
export const prepareRepAngleComparisonData = (
  userAngles: any, 
  referenceAngles: any, 
  jointsOfInterest: string[],
  repBoundaries: any[] = [],
  repPhases: any[] = []
) => {
  const baseData = prepareAngleComparisonData(userAngles, referenceAngles, jointsOfInterest);
  
  // Add rep boundary information to each data point
  return baseData.map((point, index) => {
    const frame = index + 1;
    
    // Find current rep boundary
    const currentRep = repBoundaries.find((rep: any) => 
      frame >= rep.startFrame && frame <= rep.endFrame
    );
    
    // Find current rep phase
    const currentPhase = repPhases.find((phase: any) => 
      frame >= phase.startFrame && frame <= phase.endFrame
    );
    
    return {
      ...point,
      repIndex: currentRep ? repBoundaries.indexOf(currentRep) + 1 : null,
      repPhase: currentPhase?.name || null,
      repQuality: currentRep?.quality || null,
    };
  });
};

import { analyzeRepetitions, compareUserRepsToGoldStandard } from './repCountingUtils';

// Prepare rep boundary data from database
export const prepareRepBoundaries = (repAnalysis: any, userFrameData?: Array<{ frameIndex: number; time: number; angles: Record<string, number> }>, exercise?: any) => {
  // If we have user frame data, use unified rep counting logic
  if (userFrameData && exercise) {
    const analysis = analyzeRepetitions(userFrameData, exercise);
    return analysis.repBoundaries;
  }
  
  // First try to get rep boundaries from repBoundaries field
  if (repAnalysis?.repBoundaries) {
    try {
      const boundaries = typeof repAnalysis.repBoundaries === 'string' 
        ? JSON.parse(repAnalysis.repBoundaries) 
        : repAnalysis.repBoundaries;
      
      return boundaries.map((boundary: any, index: number) => ({
        startFrame: boundary.startFrame || boundary.startTime * 30, // Assume 30fps if time provided
        endFrame: boundary.endFrame || boundary.endTime * 30,
        startTime: boundary.startTime || boundary.startFrame / 30,
        endTime: boundary.endTime || boundary.endFrame / 30,
        phase: boundary.phase,
        quality: boundary.quality || 85, // Default quality
        repIndex: index + 1,
      }));
    } catch (error) {
      console.warn('Failed to parse rep boundaries:', error);
    }
  }
  
  // If no repBoundaries, try to extract from goldStandardRep
  if (repAnalysis?.goldStandardRep) {
    try {
      const goldStandard = typeof repAnalysis.goldStandardRep === 'string'
        ? JSON.parse(repAnalysis.goldStandardRep)
        : repAnalysis.goldStandardRep;
      
      // Create a single rep boundary from the gold standard
      return [{
        startFrame: goldStandard.startFrame || goldStandard.startTime * 30,
        endFrame: goldStandard.endFrame || goldStandard.endTime * 30,
        startTime: goldStandard.startTime || goldStandard.startFrame / 30,
        endTime: goldStandard.endTime || goldStandard.endFrame / 30,
        quality: 85, // Default quality
        repIndex: 1,
      }];
    } catch (error) {
      console.warn('Failed to parse gold standard rep:', error);
    }
  }
  
  return [];
};

// Prepare rep phases data from database
export const prepareRepPhases = (repAnalysis: any) => {
  // Try to get phases from goldStandardRep
  if (repAnalysis?.goldStandardRep) {
    try {
      const goldStandard = typeof repAnalysis.goldStandardRep === 'string'
        ? JSON.parse(repAnalysis.goldStandardRep)
        : repAnalysis.goldStandardRep;
      
      if (goldStandard.phases) {
        const phases = Array.isArray(goldStandard.phases) ? goldStandard.phases : [];
        
        return phases.map((phase: any) => ({
          name: phase.name,
          startFrame: phase.startFrame || phase.startTime * 30,
          endFrame: phase.endFrame || phase.endTime * 30,
          startTime: phase.startTime || phase.startFrame / 30,
          endTime: phase.endTime || phase.endFrame / 30,
        }));
      }
    } catch (error) {
      console.warn('Failed to parse rep phases from goldStandardRep:', error);
    }
  }
  
  return [];
};



// Prepare data for Radar Chart
export const prepareRadarData = (advancedAnalysis: any, exerciseType: string) => {
  if (!advancedAnalysis) return [];
  
  switch (exerciseType) {
    case 'repetition':
      return [
        { metric: 'rep_consistency', score: advancedAnalysis.repetition_analysis?.overall?.consistency || 0 },
        { metric: 'joint_compliance', score: advancedAnalysis.overall_score || 0 },
        { metric: 'form_quality', score: advancedAnalysis.joint_analysis?.overall?.rom_score || 0 },
        { metric: 'tempo_analysis', score: advancedAnalysis.tempo_analysis?.overall?.tempo_score || 0 },
      ];
    case 'pose':
      return [
        { metric: 'pose_accuracy', score: advancedAnalysis.pose_analysis?.overall_accuracy || advancedAnalysis.overall_score || 0 },
        { metric: 'angle_compliance', score: advancedAnalysis.pose_analysis?.pose_quality?.stability_score || advancedAnalysis.balance_metrics?.stability_score || 0 },
        { metric: 'hold_stability', score: advancedAnalysis.pose_analysis?.pose_quality?.balance_score || advancedAnalysis.balance_metrics?.stability_score || 0 },
        { metric: 'balance', score: advancedAnalysis.pose_analysis?.pose_quality?.symmetry_score || advancedAnalysis.balance_metrics?.symmetry_score || 0 },
      ];
    case 'flow':
      return [
        { metric: 'dtw_score', score: advancedAnalysis.flow_analysis?.overall_flow_score || 0 },
        { metric: 'cosine_score', score: advancedAnalysis.flow_analysis?.overall_flow_score || 0 },
        { metric: 'movement_quality', score: advancedAnalysis.flow_analysis?.overall_flow_score || 0 },
        { metric: 'flow_sequence', score: advancedAnalysis.flow_analysis?.overall_flow_score || 0 },
      ];
    default:
      return [
        { metric: 'dtw_score', score: advancedAnalysis.overall_score || 0 },
        { metric: 'cosine_score', score: advancedAnalysis.overall_score || 0 },
        { metric: 'rom_score', score: advancedAnalysis.overall_score || 0 },
        { metric: 'basic_score', score: advancedAnalysis.overall_score || 0 },
      ];
  }
};



// Prepare data for Bar Chart (Joint Analysis)
export const prepareJointScoresData = (advancedAnalysis: any, jointsOfInterest: string[], exerciseType: string) => {
  if (!advancedAnalysis || !jointsOfInterest) return [];
  
  const data = jointsOfInterest.map((joint: string) => {
    const baseData = {
      joint: joint.replace(/([A-Z])/g, ' $1').trim(),
    };
    
    switch (exerciseType) {
      case 'repetition':
        return {
          ...baseData,
          rep_consistency: advancedAnalysis.repetition_analysis?.[joint]?.consistency || 0,
          joint_compliance: advancedAnalysis.joint_analysis?.[joint]?.cosine_score || 0,
          form_quality: advancedAnalysis.joint_analysis?.[joint]?.rom_score || 0,
          tempo_score: advancedAnalysis.tempo_analysis?.[joint]?.tempo_score || 0,
        };
      case 'pose':
        return {
          ...baseData,
          pose_accuracy: advancedAnalysis.pose_analysis?.joint_accuracy?.[joint]?.accuracy_score || advancedAnalysis.joint_analysis?.[joint]?.pose_accuracy || 0,
          angle_compliance: advancedAnalysis.pose_analysis?.joint_accuracy?.[joint]?.in_range_percentage || advancedAnalysis.joint_analysis?.[joint]?.angle_compliance || 0,
          hold_stability: advancedAnalysis.pose_analysis?.joint_accuracy?.[joint]?.stability_score || advancedAnalysis.joint_analysis?.[joint]?.hold_stability || 0,
        };
      case 'flow':
        return {
          ...baseData,
          dtw_score: advancedAnalysis.flow_analysis?.dtw_scores?.[joint]?.score || 0,
          cosine_score: advancedAnalysis.flow_analysis?.cosine_scores?.[joint]?.score || 0,
        };
      default:
        return {
          ...baseData,
          dtw_score: advancedAnalysis.joint_analysis?.[joint]?.dtw_score || 0,
          cosine_score: advancedAnalysis.joint_analysis?.[joint]?.cosine_score || 0,
          rom_score: advancedAnalysis.joint_analysis?.[joint]?.rom_score || 0,
          basic_score: advancedAnalysis.joint_analysis?.[joint]?.basic_score || 0,
        };
    }
  });
  
  return data;
};

// Prepare data for Flow Sequence Analysis
export const prepareFlowSequenceData = (advancedAnalysis: any, jointsOfInterest: string[]) => {
  if (!advancedAnalysis?.flow_analysis || !jointsOfInterest) return [];
  
  return jointsOfInterest.map((joint: string) => ({
    joint: joint.replace(/([A-Z])/g, ' $1').trim(),
    dtw_score: advancedAnalysis.flow_analysis.dtw_scores[joint]?.score || 0,
    cosine_score: advancedAnalysis.flow_analysis.cosine_scores[joint]?.score || 0,
    movement_quality: advancedAnalysis.flow_analysis.movement_quality[joint]?.score || 0,
    smoothness: advancedAnalysis.flow_analysis.movement_quality[joint]?.smoothness || 0,
    consistency: advancedAnalysis.flow_analysis.movement_quality[joint]?.consistency || 0,
    flow_sequence: advancedAnalysis.flow_analysis.overall_flow_score || 0,
  }));
};

// Get metric labels for different exercise types
export const getMetricLabelsForExerciseType = (exerciseType: string) => {
  switch (exerciseType) {
    case 'repetition':
      return {
        rep_consistency: 'Rep Consistency',
        joint_compliance: 'Joint Compliance',
        form_quality: 'Form Quality',
        tempo_score: 'Tempo Score',
      };
    case 'pose':
      return {
        pose_accuracy: 'Pose Accuracy',
        angle_compliance: 'Angle Compliance',
        hold_stability: 'Hold Stability',
      };
    case 'flow':
      return {
        dtw_score: 'DTW Score',
        cosine_score: 'Cosine Score',
      };
    default:
      return {
        dtw_score: 'DTW Pattern',
        cosine_score: 'Cosine Similarity',
        rom_score: 'Range of Motion',
        basic_score: 'Basic Score',
      };
  }
};

// Get metrics array for different exercise types
export const getMetricsForExerciseType = (exerciseType: string) => {
  switch (exerciseType) {
    case 'repetition':
      return ['rep_consistency', 'joint_compliance', 'form_quality', 'tempo_score'];
    case 'pose':
      return ['pose_accuracy', 'angle_compliance', 'hold_stability'];
    case 'flow':
      return ['dtw_score', 'cosine_score'];
    default:
      return ['dtw_score', 'cosine_score', 'rom_score', 'basic_score'];
  }
};

// Get rep-specific metric descriptions for tooltips
export const getRepMetricDescriptions = () => {
  return {
    rep_consistency: {
      label: 'Rep Consistency',
      desc: 'How consistent your repetition durations are'
    },
    joint_compliance: {
      label: 'Joint Compliance', 
      desc: 'How well your joint angles match the reference'
    },
    form_quality: {
      label: 'Form Quality',
      desc: 'Overall movement quality and range of motion'
    },
    tempo_score: {
      label: 'Tempo Analysis',
      desc: 'Consistency of movement speed and timing'
    },
  };
};

// Prepare data for pose analysis chart
export const preparePoseAnalysisData = (
  userKeypoints: any[],
  poseAnalysis: any,
  jointsOfInterest: string[]
) => {
  if (!userKeypoints || !poseAnalysis || !jointsOfInterest) return [];
  
  // Parse pose analysis data
  let targetPoses: any = {};
  let angleRanges: any = {};
  
  try {
    targetPoses = typeof poseAnalysis.targetPoses === 'string' 
      ? JSON.parse(poseAnalysis.targetPoses) 
      : poseAnalysis.targetPoses || {};
    
    angleRanges = typeof poseAnalysis.angleRanges === 'string'
      ? JSON.parse(poseAnalysis.angleRanges)
      : poseAnalysis.angleRanges || {};
  } catch (error) {
    console.warn('Failed to parse pose analysis data:', error);
    return [];
  }
  
  // Transform user keypoints into angle data
  const userAngles = calculateAnglesFromKeypoints(userKeypoints, jointsOfInterest);
  
  // Create pose analysis data points
  const data = [];
  for (let i = 0; i < userKeypoints.length; i++) {
    const point: any = { frame: i + 1 };
    
    jointsOfInterest.forEach((joint: string) => {
      const userAngle = userAngles[joint]?.[i];
      const targetAngle = targetPoses[joint];
      const angleRange = angleRanges[joint];
      
      if (userAngle !== null && userAngle !== undefined) {
        point[`${joint}_user`] = userAngle;
        
        if (targetAngle !== null && targetAngle !== undefined) {
          point[`${joint}_target`] = targetAngle;
          
          // Calculate accuracy score
          const accuracy = calculatePoseAccuracy(userAngle, targetAngle, angleRange);
          point[`${joint}_accuracy`] = accuracy;
        }
      }
    });
    
    data.push(point);
  }
  
  return data;
};

// Calculate angles from keypoints data
export const calculateAnglesFromKeypoints = (keypoints: any[], jointsOfInterest: string[]) => {
  const angles: any = {};
  
  jointsOfInterest.forEach((joint: string) => {
    angles[joint] = [];
    
    keypoints.forEach((frameKeypoints: any) => {
      const angle = calculateJointAngle(frameKeypoints, joint);
      angles[joint].push(angle);
    });
  });
  
  return angles;
};

// Calculate angle for a specific joint from keypoints
const calculateJointAngle = (keypoints: any, joint: string) => {
  // Define joint angle calculations based on joint name
  const jointConfigs: any = {
    leftKnee: ['leftHip', 'leftKnee', 'leftAnkle'],
    rightKnee: ['rightHip', 'rightKnee', 'rightAnkle'],
    leftHip: ['leftShoulder', 'leftHip', 'leftKnee'],
    rightHip: ['rightShoulder', 'rightHip', 'rightKnee'],
    leftShoulder: ['leftElbow', 'leftShoulder', 'leftHip'],
    rightShoulder: ['rightElbow', 'rightShoulder', 'rightHip'],
    leftElbow: ['leftWrist', 'leftElbow', 'leftShoulder'],
    rightElbow: ['rightWrist', 'rightElbow', 'rightShoulder'],
  };
  
  const config = jointConfigs[joint];
  if (!config) return null;
  
  const [pointA, pointB, pointC] = config;
  const a = keypoints[pointA];
  const b = keypoints[pointB];
  const c = keypoints[pointC];
  
  if (!a || !b || !c) return null;
  
  // Calculate angle using the existing getAngleWithConfidence function
  const { getAngleWithConfidence } = require('./analysisUtils');
  const result = getAngleWithConfidence(a, b, c);
  
  return result.angle;
};

// Calculate pose accuracy score based on target angle and range
const calculatePoseAccuracy = (userAngle: number, targetAngle: number, angleRange?: any) => {
  if (userAngle === null || targetAngle === null) return 0;
  
  const deviation = Math.abs(userAngle - targetAngle);
  
  // If no range specified, use a default tolerance
  if (!angleRange) {
    const tolerance = 10; // Default 10 degree tolerance
    return Math.max(0, 100 - (deviation / tolerance) * 100);
  }
  
  // Parse angle range
  const minAngle = angleRange.min || targetAngle - 10;
  const maxAngle = angleRange.max || targetAngle + 10;
  
  // Check if angle is within range
  if (userAngle >= minAngle && userAngle <= maxAngle) {
    // Perfect score if within range
    return 100;
  } else {
    // Calculate penalty based on distance from range
    const distanceFromRange = Math.min(
      Math.abs(userAngle - minAngle),
      Math.abs(userAngle - maxAngle)
    );
    const maxPenalty = 20; // Maximum penalty distance
    return Math.max(0, 100 - (distanceFromRange / maxPenalty) * 100);
  }
};

// Prepare pose accuracy data for joint analysis chart
export const preparePoseAccuracyData = (
  userKeypoints: any[],
  poseAnalysis: any,
  jointsOfInterest: string[]
) => {
  if (!userKeypoints || !poseAnalysis || !jointsOfInterest) return [];
  
  // Parse pose analysis data
  let targetPoses: any = {};
  let angleRanges: any = {};
  
  try {
    targetPoses = typeof poseAnalysis.targetPoses === 'string' 
      ? JSON.parse(poseAnalysis.targetPoses) 
      : poseAnalysis.targetPoses || {};
    
    angleRanges = typeof poseAnalysis.angleRanges === 'string'
      ? JSON.parse(poseAnalysis.angleRanges)
      : poseAnalysis.angleRanges || {};
  } catch (error) {
    console.warn('Failed to parse pose analysis data:', error);
    return [];
  }
  
  // Calculate angles and accuracy scores
  const userAngles = calculateAnglesFromKeypoints(userKeypoints, jointsOfInterest);
  
  // Calculate average accuracy for each joint
  const jointAccuracy: any = {};
  
  jointsOfInterest.forEach((joint: string) => {
    const angles = userAngles[joint] || [];
    const targetAngle = targetPoses[joint];
    const angleRange = angleRanges[joint];
    
    if (angles.length > 0 && targetAngle !== null && targetAngle !== undefined) {
      const accuracies = angles
        .filter((angle: number) => angle !== null)
        .map((angle: number) => calculatePoseAccuracy(angle, targetAngle, angleRange));
      
      if (accuracies.length > 0) {
        jointAccuracy[joint] = accuracies.reduce((sum: number, acc: number) => sum + acc, 0) / accuracies.length;
      }
    }
  });
  
  // Format data for joint analysis chart
  return jointsOfInterest.map((joint: string) => ({
    joint: joint.replace(/([A-Z])/g, ' $1').trim(),
    pose_accuracy: jointAccuracy[joint] || 0,
    angle_compliance: jointAccuracy[joint] || 0, // Same as pose accuracy for now
    hold_stability: 85, // Placeholder - would need stability calculation
  }));
};

// Prepare hold duration data for pose exercises
export const prepareHoldDurationData = (
  userKeypoints: any[],
  poseAnalysis: any,
  jointsOfInterest: string[]
) => {
  if (!userKeypoints || !poseAnalysis || !jointsOfInterest) return [];
  
  // Parse pose analysis data
  let targetPoses: any = {};
  let angleRanges: any = {};
  
  try {
    targetPoses = typeof poseAnalysis.targetPoses === 'string' 
      ? JSON.parse(poseAnalysis.targetPoses) 
      : poseAnalysis.targetPoses || {};
    
    angleRanges = typeof poseAnalysis.angleRanges === 'string'
      ? JSON.parse(poseAnalysis.angleRanges)
      : poseAnalysis.angleRanges || {};
  } catch (error) {
    console.warn('Failed to parse pose analysis data:', error);
    return [];
  }
  
  // Calculate angles and identify hold periods
  const userAngles = calculateAnglesFromKeypoints(userKeypoints, jointsOfInterest);
  const holdPeriods: any[] = [];
  
  jointsOfInterest.forEach((joint: string) => {
    const angles = userAngles[joint] || [];
    const targetAngle = targetPoses[joint];
    const angleRange = angleRanges[joint];
    
    if (angles.length > 0 && targetAngle !== null && targetAngle !== undefined) {
      let holdStart = null;
      let holdEnd = null;
      
      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        if (angle === null) continue;
        
        const isInPose = isAngleInPose(angle, targetAngle, angleRange);
        
        if (isInPose && holdStart === null) {
          holdStart = i;
        } else if (!isInPose && holdStart !== null) {
          holdEnd = i - 1;
          if (holdEnd > holdStart) {
            holdPeriods.push({
              joint,
              startFrame: holdStart,
              endFrame: holdEnd,
              duration: (holdEnd - holdStart + 1) / 30, // Assuming 30fps
              accuracy: calculateAverageAccuracy(angles.slice(holdStart, holdEnd + 1), targetAngle, angleRange)
            });
          }
          holdStart = null;
        }
      }
      
      // Handle hold that extends to end of data
      if (holdStart !== null) {
        holdEnd = angles.length - 1;
        if (holdEnd > holdStart) {
          holdPeriods.push({
            joint,
            startFrame: holdStart,
            endFrame: holdEnd,
            duration: (holdEnd - holdStart + 1) / 30,
            accuracy: calculateAverageAccuracy(angles.slice(holdStart, holdEnd + 1), targetAngle, angleRange)
          });
        }
      }
    }
  });
  
  return holdPeriods;
};

// Helper function to check if angle is within pose requirements
const isAngleInPose = (angle: number, targetAngle: number, angleRange?: any) => {
  if (angle === null || targetAngle === null) return false;
  
  if (!angleRange) {
    const tolerance = 10;
    return Math.abs(angle - targetAngle) <= tolerance;
  }
  
  const minAngle = angleRange.min || targetAngle - 10;
  const maxAngle = angleRange.max || targetAngle + 10;
  
  return angle >= minAngle && angle <= maxAngle;
};

// Helper function to calculate average accuracy over a range
const calculateAverageAccuracy = (angles: number[], targetAngle: number, angleRange?: any) => {
  if (angles.length === 0) return 0;
  
  const accuracies = angles
    .filter((angle: number) => angle !== null)
    .map((angle: number) => calculatePoseAccuracy(angle, targetAngle, angleRange));
  
  return accuracies.length > 0 
    ? accuracies.reduce((sum: number, acc: number) => sum + acc, 0) / accuracies.length 
    : 0;
};
