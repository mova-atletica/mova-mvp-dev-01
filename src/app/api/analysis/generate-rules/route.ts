import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ExerciseRules } from '@/types/analysis';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exerciseId, exerciseType } = body;

    if (!exerciseId) {
      return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 });
    }

    if (!exerciseType) {
      return NextResponse.json({ error: 'Exercise type is required' }, { status: 400 });
    }

    // Fetch exercise with all analysis data
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        repAnalysis: true,
        patternAnalysis: true,
        analysisQuality: true,
      }
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // Generate rules based on exercise type and analysis data
    const rules = await generateExerciseRules(exercise, exerciseType);

    // Create or update ExerciseRules
    const exerciseRules = await (prisma as any).exerciseRules.upsert({
      where: { exerciseId },
      update: {
        rules: JSON.stringify(rules.rules),
        thresholds: JSON.stringify(rules.thresholds),
        validatedByAdmin: false, // Rules need admin validation
      },
      create: {
        exerciseId,
        rules: JSON.stringify(rules.rules),
        thresholds: JSON.stringify(rules.thresholds),
        validatedByAdmin: false,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Exercise rules generated successfully',
      exerciseRules: {
        ...exerciseRules,
        rules: JSON.parse(exerciseRules.rules),
        thresholds: JSON.parse(exerciseRules.thresholds),
      }
    });

  } catch (error) {
    console.error('Error generating exercise rules:', error);
    return NextResponse.json(
      { error: 'Failed to generate exercise rules' },
      { status: 500 }
    );
  }
}

async function generateExerciseRules(exercise: any, selectedExerciseType: string): Promise<{ rules: any; thresholds: any }> {
  const exerciseType = selectedExerciseType || exercise.exerciseType || 'repetition';
  const repAnalysis = exercise.repAnalysis;
  const patternAnalysis = exercise.patternAnalysis;

  // Base rules structure
  const rules = {
    repDetection: {
      primaryJoints: ['leftKnee', 'rightKnee'], // Default joints, can be overridden
      phaseThresholds: {},
      repCompletionCriteria: [],
    },
    formValidation: {
      criticalJoints: ['leftKnee', 'rightKnee'], // Default joints, can be overridden
      angleTolerances: {},
      stabilityThresholds: {},
    },
    feedbackRules: {
      severityLevels: {
        good: { min: 80, max: 100 },
        warning: { min: 60, max: 79 },
        poor: { min: 0, max: 59 },
      },
      feedbackMessages: {},
    },
  };

  const thresholds = {
    overallQuality: 0.7,
    repAccuracy: 0.8,
    formAccuracy: 0.75,
    tempoAccuracy: 0.8,
  };

  // Exercise-type specific rule generation
  switch (exerciseType) {
    case 'repetition':
      return generateRepetitionRules(exercise, rules, thresholds);
    case 'pose':
      return generatePoseRules(exercise, rules, thresholds);
    case 'flow':
      return generateFlowRules(exercise, rules, thresholds);
    default:
      return { rules, thresholds };
  }
}

function generateRepetitionRules(exercise: any, baseRules: any, baseThresholds: any) {
  const repAnalysis = exercise.repAnalysis;
  const patternAnalysis = exercise.patternAnalysis;

  if (repAnalysis) {
    // Parse stored data - only use fields that actually exist in database
    const goldStandardRep = repAnalysis.goldStandardRep ? JSON.parse(repAnalysis.goldStandardRep) : null;
    const repBoundaries = repAnalysis.repBoundaries ? JSON.parse(repAnalysis.repBoundaries) : [];
    const angleRanges = patternAnalysis ? JSON.parse(patternAnalysis.angleRanges || '{}') : {};

    // Rep detection rules
    baseRules.repDetection.phaseThresholds = {
      eccentric: 0.3,
      concentric: 0.3,
      transition: 0.2,
    };

    if (goldStandardRep) {
      baseRules.repDetection.repCompletionCriteria = [
        'angle_threshold_reached',
        'phase_sequence_completed',
        'duration_within_range',
      ];
    }

    // Form validation rules
    Object.keys(angleRanges).forEach(joint => {
      const range = angleRanges[joint];
      baseRules.formValidation.angleTolerances[joint] = (range.max - range.min) * 0.1; // 10% tolerance
      baseRules.formValidation.stabilityThresholds[joint] = 0.8;
    });

    // Feedback messages
    Object.keys(angleRanges).forEach(joint => {
      baseRules.feedbackRules.feedbackMessages[joint] = {
        good: [`Great ${joint} position!`, `Perfect ${joint} alignment`],
        warning: [`Adjust ${joint} slightly`, `Focus on ${joint} form`],
        poor: [`Fix ${joint} position`, `Major ${joint} adjustment needed`],
      };
    });

    // Adjust thresholds based on exercise difficulty
    if (exercise.level === 'beginner') {
      baseThresholds.formAccuracy = 0.7;
      baseThresholds.tempoAccuracy = 0.7;
    } else if (exercise.level === 'advanced') {
      baseThresholds.formAccuracy = 0.85;
      baseThresholds.tempoAccuracy = 0.85;
    }
  }

  return { rules: baseRules, thresholds: baseThresholds };
}

function generatePoseRules(exercise: any, baseRules: any, baseThresholds: any) {
  const patternAnalysis = exercise.patternAnalysis;

  if (patternAnalysis) {
    const angleRanges = JSON.parse(patternAnalysis.angleRanges || '{}');

    // Pose-specific rules
    baseRules.repDetection.primaryJoints = ['trunk', 'leftHip', 'rightHip'];
    baseRules.repDetection.phaseThresholds = {
      setup: 0.2,
      hold: 0.6,
      release: 0.2,
    };

    // Form validation for pose exercises
    Object.keys(angleRanges).forEach(joint => {
      const range = angleRanges[joint];
      baseRules.formValidation.angleTolerances[joint] = (range.max - range.min) * 0.05; // 5% tolerance for poses
      baseRules.formValidation.stabilityThresholds[joint] = 0.9; // Higher stability requirement
    });

    // Pose-specific feedback
    baseRules.feedbackRules.feedbackMessages = {
      trunk: {
        good: ['Perfect posture!', 'Great core engagement'],
        warning: ['Keep your back straight', 'Engage your core'],
        poor: ['Fix your posture', 'Straighten your back'],
      },
      leftHip: {
        good: ['Good hip position', 'Perfect alignment'],
        warning: ['Adjust hip position', 'Level your hips'],
        poor: ['Fix hip alignment', 'Level your hips properly'],
      },
      rightHip: {
        good: ['Good hip position', 'Perfect alignment'],
        warning: ['Adjust hip position', 'Level your hips'],
        poor: ['Fix hip alignment', 'Level your hips properly'],
      },
    };

    // Pose-specific thresholds
    baseThresholds.overallQuality = 0.8;
    baseThresholds.formAccuracy = 0.85;
  }

  return { rules: baseRules, thresholds: baseThresholds };
}

function generateFlowRules(exercise: any, baseRules: any, baseThresholds: any) {
  const patternAnalysis = exercise.patternAnalysis;

  if (patternAnalysis) {
    const flowPatterns = patternAnalysis.flowPatterns ? JSON.parse(patternAnalysis.flowPatterns) : null;

    // Flow-specific rules
    baseRules.repDetection.primaryJoints = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
    baseRules.repDetection.phaseThresholds = {
      transition: 0.4,
      hold: 0.3,
      movement: 0.3,
    };

    // Flow-specific validation
    baseRules.formValidation.criticalJoints = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
    baseRules.formValidation.angleTolerances = {
      leftShoulder: 15,
      rightShoulder: 15,
      leftHip: 10,
      rightHip: 10,
    };
    baseRules.formValidation.stabilityThresholds = {
      leftShoulder: 0.7,
      rightShoulder: 0.7,
      leftHip: 0.8,
      rightHip: 0.8,
    };

    // Flow-specific feedback
    baseRules.feedbackRules.feedbackMessages = {
      transition: {
        good: ['Smooth transition!', 'Great flow'],
        warning: ['Smooth out the transition', 'Make it more fluid'],
        poor: ['Transition needs work', 'Make it smoother'],
      },
      rhythm: {
        good: ['Perfect rhythm', 'Great timing'],
        warning: ['Adjust your timing', 'Find the rhythm'],
        poor: ['Work on timing', 'Find the flow'],
      },
    };

    // Flow-specific thresholds
    baseThresholds.overallQuality = 0.75;
    baseThresholds.formAccuracy = 0.8;
  }

  return { rules: baseRules, thresholds: baseThresholds };
}
