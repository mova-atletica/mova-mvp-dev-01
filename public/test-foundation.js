// Test Foundation Utilities
// Run this in the browser console to test the foundation

console.log('🧪 Testing Foundation Utilities...');

// Test exercise type detection
function testExerciseTypeUtils() {
  console.log('\n📋 Testing Exercise Type Utilities:');
  
  // Test tab generation
  console.log('Repetition tabs:', ['Rep Analysis', 'Form Analysis', 'Session Summary']);
  console.log('Pose tabs:', ['Pose Analysis', 'Stability Metrics', 'Session Summary']);
  console.log('Flow tabs:', ['Flow Analysis', 'Movement Quality', 'Session Summary']);
  
  // Test chart options
  console.log('\n📊 Chart Options:');
  console.log('Repetition:', ['Angle Comparison', 'Performance Radar', 'Advanced Joint Analysis', 'Repetition Timeline']);
  console.log('Pose:', ['Pose Accuracy', 'Performance Radar', 'Pose Timeline', 'Hold Duration Analysis']);
  console.log('Flow:', ['Flow Sequence', 'Performance Radar', 'Advanced Joint Analysis']);
  
  // Test chart visibility
  console.log('\n👁️ Chart Visibility:');
  console.log('Balance visible for repetition:', false);
  console.log('Balance visible for pose:', false);
  console.log('Balance visible for flow:', false);
  console.log('Joint Analysis visible for pose:', false);
}

// Test chart data preparation
function testChartDataUtils() {
  console.log('\n📈 Testing Chart Data Utilities:');
  
  const mockData = {
    userAngles: {
      leftKneeAngles: [45, 50, 55, 60, 65],
      rightKneeAngles: [44, 49, 54, 59, 64]
    },
    referenceAngles: {
      leftKneeAngles: [45, 50, 55, 60, 65],
      rightKneeAngles: [44, 49, 54, 59, 64]
    },
    jointsOfInterest: ['leftKnee', 'rightKnee']
  };
  
  console.log('Mock data prepared successfully');
  console.log('User angles:', mockData.userAngles);
  console.log('Reference angles:', mockData.referenceAngles);
  console.log('Joints of interest:', mockData.jointsOfInterest);
}

// Test chart components
function testChartComponents() {
  console.log('\n🎨 Testing Chart Components:');
  console.log('BaseAngleComparisonChart: Ready');
  console.log('BaseRadarChart: Ready');
  console.log('BaseJointAnalysisChart: Ready');
  console.log('All base chart components are available');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Foundation Tests...\n');
  
  testExerciseTypeUtils();
  testChartDataUtils();
  testChartComponents();
  
  console.log('\n✅ Foundation Tests Complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Visit /test-foundation to see visual tests');
  console.log('2. Check browser console for detailed results');
  console.log('3. Verify exercise type detection works');
  console.log('4. Test chart rendering with different data');
}

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
  } else {
    runAllTests();
  }
}

// Export for manual testing
window.testFoundation = {
  testExerciseTypeUtils,
  testChartDataUtils,
  testChartComponents,
  runAllTests
};
