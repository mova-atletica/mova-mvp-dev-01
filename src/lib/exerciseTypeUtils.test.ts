// Simple test file for exercise type utilities
import { 
  getTabsForExerciseType, 
  getChartOptionsForExerciseType, 
  getDefaultChartForExerciseType,
  shouldShowChartForExerciseType 
} from './exerciseTypeUtils';

// Test exercise type detection
console.log('Testing exercise type utilities...');

// Test tab generation
console.log('Repetition tabs:', getTabsForExerciseType('repetition'));
console.log('Pose tabs:', getTabsForExerciseType('pose'));
console.log('Flow tabs:', getTabsForExerciseType('flow'));

// Test chart options
console.log('Repetition charts:', getChartOptionsForExerciseType('repetition'));
console.log('Pose charts:', getChartOptionsForExerciseType('pose'));
console.log('Flow charts:', getChartOptionsForExerciseType('flow'));

// Test default charts
console.log('Repetition default:', getDefaultChartForExerciseType('repetition'));
console.log('Pose default:', getDefaultChartForExerciseType('pose'));
console.log('Flow default:', getDefaultChartForExerciseType('flow'));

// Test chart visibility
console.log('Balance visible for repetition:', shouldShowChartForExerciseType('balance', 'repetition'));
console.log('Balance visible for pose:', shouldShowChartForExerciseType('balance', 'pose'));
console.log('Balance visible for flow:', shouldShowChartForExerciseType('balance', 'flow'));

console.log('Exercise type utilities test complete!');
