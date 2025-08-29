import { ExerciseType } from '../types';

// Get tabs for specific exercise types
export const getTabsForExerciseType = (type: ExerciseType) => {
  switch(type) {
    case 'repetition':
      return ['Rep Analysis', 'Form Analysis', 'Session Summary'];
    case 'pose':
      return ['Pose Analysis', 'Stability Metrics', 'Session Summary'];
    case 'flow':
      return ['Flow Analysis', 'Charts', 'Joint Feedback'];
    default:
      return ['Basic Analysis', 'Advanced Analysis', 'Session Summary'];
  }
};

// Get chart options for specific exercise types
export const getChartOptionsForExerciseType = (type: ExerciseType) => {
  switch(type) {
    case 'repetition':
      return [
        { value: 'angle-comparison', label: 'Angle Comparison Over Time' },
        { value: 'joint-analysis', label: 'Advanced Joint Analysis' },
      
      ];
    case 'pose':
      return [
        { value: 'pose-accuracy', label: 'Pose Accuracy Over Time' },
        { value: 'radar', label: 'Performance Radar' },
        { value: 'pose-timeline', label: 'Pose Timeline' },
        { value: 'hold-duration', label: 'Hold Duration Analysis' },
      ];
    case 'flow':
      return [
        { value: 'flow-sequence', label: 'Flow Sequence Timeline' },
        { value: 'flow-analysis', label: 'Flow Analysis' },
      ];
    default:
      return [
        { value: 'angle-comparison', label: 'Angle Comparison Over Time' },
        { value: 'radar', label: 'Performance Radar' },
        { value: 'joint-analysis', label: 'Advanced Joint Analysis' },
        { value: 'balance', label: 'Balance & Stability' },
      ];
  }
};

// Check if exercise type should show specific charts
export const shouldShowChartForExerciseType = (chartType: string, exerciseType: ExerciseType): boolean => {
  switch(exerciseType) {
    case 'repetition':
      return !['balance'].includes(chartType);
    case 'pose':
      return !['balance', 'joint-analysis'].includes(chartType);
    case 'flow':
      return !['balance', 'radar', 'joint-analysis'].includes(chartType);
    default:
      return true;
  }
};

// Get default chart for exercise type
export const getDefaultChartForExerciseType = (type: ExerciseType): string => {
  switch(type) {
    case 'repetition':
      return 'angle-comparison';
    case 'pose':
      return 'pose-accuracy';
    case 'flow':
      return 'flow-sequence';
    default:
      return 'angle-comparison';
  }
};

// Get chart title for exercise type
export const getChartTitleForExerciseType = (chartType: string, exerciseType: ExerciseType): string => {
  switch(exerciseType) {
    case 'repetition':
      switch(chartType) {
        case 'angle-comparison':
          return 'Repetition Angle Analysis';
        case 'radar':
          return 'Repetition Performance Radar';
        case 'joint-analysis':
          return 'Repetition Joint Analysis';
        
        default:
          return 'Repetition Analysis';
      }
    case 'pose':
      switch(chartType) {
        case 'pose-accuracy':
          return 'Pose Accuracy Analysis';
        case 'radar':
          return 'Pose Performance Radar';
        case 'pose-timeline':
          return 'Pose Timeline';
        case 'hold-duration':
          return 'Hold Duration Analysis';
        default:
          return 'Pose Analysis';
      }
    case 'flow':
      switch(chartType) {
        case 'flow-sequence':
          return 'Flow Sequence Timeline';
        case 'flow-analysis':
          return 'Flow Analysis';
        case 'radar':
          return 'Flow Performance Radar';
        case 'joint-analysis':
          return 'Flow Joint Analysis';
        default:
          return 'Flow Analysis';
      }
    default:
      return 'Exercise Analysis';
  }
};
