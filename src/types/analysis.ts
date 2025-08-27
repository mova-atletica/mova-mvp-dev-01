// TypeScript interfaces for enhanced analysis data structures

// Gold Standard Rep Definition
export interface GoldStandardRep {
  startTime: number; // seconds
  endTime: number; // seconds
  bottomTime: number; // seconds - bottom position of the rep
  phases: Array<{
    name: string; // 'eccentric' | 'concentric'
    startTime: number; // seconds
    endTime: number; // seconds
  }>;
  // Optional legacy fields for backward compatibility
  startFrame?: number;
  endFrame?: number;
  optimalDuration?: number; // seconds
  tempoRatio?: number; // eccentric:concentric ratio
}

// Rep Boundaries
export interface RepBoundaries {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  bottomTime: number; // seconds - bottom position of the rep
  phases: Array<{
    name: string; // 'eccentric' | 'concentric'
    startTime: number; // seconds
    endTime: number; // seconds
  }>;
  // Optional legacy fields for backward compatibility
  startFrame?: number;
  endFrame?: number;
}

// Key Frames
export interface KeyFrames {
  repStart: number;
  repEnd: number;
  criticalPoints: {
    [point: string]: number; // e.g., "squat_bottom", "pushup_bottom"
  };
}

// Enhanced Rep Analysis
export interface EnhancedRepAnalysis {
  // focused fields for admin analysis
  goldStandardRep?: GoldStandardRep;
  repBoundaries?: RepBoundaries[]; // Array of rep boundaries
  adminNotes?: string;
  
  // 🆕 PHASE-BASED JOINT ANGLE RULES
  jointAngleRules?: JointAngleRules;
  
  // Validation
  validatedByAdmin: boolean;
}

// Joint Angle Rules for Real-time Feedback
export interface JointAngleRules {
  phaseThresholds: {
    [phaseName: string]: {
      [jointName: string]: {
        minAngle: number;
        maxAngle: number;
        targetAngle: number;
        tolerancePercent: number;
      };
    };
  };
  repCompletion: {
    // CHANGE: From single joint to all joints
    [jointName: string]: {  // Instead of single primaryJoint
      startThreshold: number;
      completionThreshold: number;
      returnThreshold: number;
      hysteresis: number;
    };
  };
}

// Target Pose Definition for Pose Exercises
export interface TargetPose {
  name: string;
  targetAngles: { [joint: string]: number };
  holdDuration: number; // seconds
  tolerance: number; // degrees
}

// Feedback Messages for Pose Exercises
export interface PoseFeedbackMessages {
  achievement: string[];
  holdProgress: string[];
  formCorrection: string[];
}

// Enhanced Pose Analysis (replaces PatternAnalysis)
export interface EnhancedPoseAnalysis {
  // Pose criteria data
  targetPoses: TargetPose[];
  angleRanges: { [joint: string]: { min: number; max: number } };
  primaryJoints?: string[];
  toleranceMultipliers?: { [joint: string]: number };
  
  // Feedback messages
  feedbackMessages?: PoseFeedbackMessages;
  
  // Admin notes
  adminNotes?: string;
  
  // Validation
  validatedByAdmin: boolean;
}

// Admin Analysis Data
export interface AdminAnalysisData {
  exerciseType?: string;
  jointsOfInterest?: string[]; // Changed from string to string[] to match frontend
  repAnalysis?: {
    // Only fields that actually exist in the database schema
    goldStandardRep?: any;
    repBoundaries?: any[];
    adminNotes?: string;
    jointAngleRules?: any;
    validatedByAdmin?: boolean;
  };
  poseAnalysis?: {
    targetPoses?: any;
    angleRanges?: any;
    primaryJoints?: string[];
    toleranceMultipliers?: any;
    feedbackMessages?: any;
    adminNotes?: string;
    validatedByAdmin?: boolean;
  };
}

// Validation Status
export interface ValidationStatus {
  repAnalysisValidated: boolean;
  poseAnalysisValidated: boolean;
  overallStatus: 'pending' | 'in_review' | 'validated' | 'needs_revision';
}

// Admin Analysis Workflow
export interface AdminAnalysisWorkflow {
  exerciseId: string;
  currentStep: 'data_review' | 'rep_definition' | 'pose_validation' | 'final_approval';
  validationStatus: ValidationStatus;
  adminNotes: string[];
  lastUpdated: Date;
  lastUpdatedBy: string;
}
