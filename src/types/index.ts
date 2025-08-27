// Exercise type definitions
export type ExerciseType = 'repetition' | 'pose' | 'flow';

// RepAnalysis interface
export interface RepAnalysis {
  id: string;
  exerciseId: string;
  goldStandardRep?: any;
  repBoundaries?: any;
  adminNotes?: string;
  jointAngleRules?: any;
  validatedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// PoseAnalysis interface
export interface PoseAnalysis {
  id: string;
  exerciseId: string;
  targetPoses: any;
  angleRanges: any;
  primaryJoints?: string[];
  toleranceMultipliers?: any;
  feedbackMessages?: any;
  adminNotes?: string;
  validatedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// Exercise interface with exercise type support
export interface Exercise {
  id: string;
  title: string;
  description: string;
  image: string;
  referenceVideoUrl: string;
  referenceKeypointsUrl: string;
  tags: string[];
  equipment: string[];
  level: string;
  muscleGroups: string[];
  jointsOfInterest: string[];
  createdBy: string;
  dateAdded: string;
  instructions: string[];
  author: { name: string; profileUrl?: string };
  relatedExercises: string[];
  exerciseType: ExerciseType;
  exerciseSubtype?: string;
  classificationConfidence?: number;
  repAnalysis?: RepAnalysis;
  poseAnalysis?: PoseAnalysis;
}
