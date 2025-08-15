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
  repCountingRules?: RepCountingRules;
  
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
      startAngle: number;
      bottomAngle: number;
      endAngle: number;
    };
  };
}

// Rep Counting Rules for Accurate Rep Detection
export interface RepCountingRules {
  countingMethod: 'phase_sequence' | 'angle_threshold' | 'hybrid';
  angleThresholds: {
    startThreshold: number;
    completionThreshold: number;
    returnThreshold: number;
    hysteresis: number;
  };
  validation: {
    minimumRepDuration: number;
    maximumRepDuration: number;
    requiredRangeOfMotion: number;
  };
}

// Enhanced Pattern Analysis
export interface EnhancedPatternAnalysis {
  // Existing fields
  referencePatterns: { [joint: string]: number[] };
  angleRanges: { [joint: string]: { min: number; max: number } };
  posePatterns?: any;
  flowPatterns?: any;
  patternQuality: number;
  validatedByAdmin: boolean;
  
  // New fields
  primaryJoints?: string[];
  toleranceMultipliers?: { [joint: string]: number };
  adminNotes?: string;
}

// Exercise Rules for Real-time Analysis
export interface ExerciseRules {
  id: string;
  exerciseId: string;
  rules: {
    repDetection: {
      primaryJoints: string[];
      phaseThresholds: { [phase: string]: number };
      repCompletionCriteria: string[];
    };
    formValidation: {
      criticalJoints: string[];
      angleTolerances: { [joint: string]: number };
      stabilityThresholds: { [joint: string]: number };
    };
    feedbackRules: {
      severityLevels: {
        good: { min: number; max: number };
        warning: { min: number; max: number };
        poor: { min: number; max: number };
      };
      feedbackMessages: {
        [joint: string]: {
          good: string[];
          warning: string[];
          poor: string[];
        };
      };
    };
  };
  thresholds: {
    overallQuality: number;
    repAccuracy: number;
    formAccuracy: number;
    tempoAccuracy: number;
  };
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
    repCountingRules?: any;
    validatedByAdmin?: boolean;
  };
  patternAnalysis?: {
    referencePatterns?: any;
    angleRanges?: any;
    posePatterns?: any;
    flowPatterns?: any;
    patternQuality?: number;
    validatedByAdmin?: boolean;
    primaryJoints?: string[];
    toleranceMultipliers?: any;
    adminNotes?: string;
  };
  analysisQuality?: {
    classificationQuality?: number;
    repAnalysisQuality?: number;
    patternQuality?: number;
    overallQuality?: number;
    issues?: any[];
    reviewedByAdmin?: boolean;
    adminNotes?: string;
  };
  exerciseRules?: {
    rules?: any;
    thresholds?: any;
    validatedByAdmin?: boolean;
  };
}

// Validation Status
export interface ValidationStatus {
  repAnalysisValidated: boolean;
  patternAnalysisValidated: boolean;
  qualityAnalysisValidated: boolean;
  rulesGenerated: boolean;
  rulesValidated: boolean;
  overallStatus: 'pending' | 'in_review' | 'validated' | 'needs_revision';
}

// Admin Analysis Workflow
export interface AdminAnalysisWorkflow {
  exerciseId: string;
  currentStep: 'data_review' | 'rep_definition' | 'pattern_validation' | 'rule_generation' | 'final_approval';
  validationStatus: ValidationStatus;
  adminNotes: string[];
  lastUpdated: Date;
  lastUpdatedBy: string;
}
