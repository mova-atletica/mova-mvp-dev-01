"use client";

import { useState } from 'react';
import { 
  RepAngleComparisonChart, 
  BaseRadarChart,
  BaseJointAnalysisChart
} from '../../components/charts';
import { 
  prepareRepAngleComparisonData, 
  prepareRepBoundaries, 
  prepareRepPhases,
  getRepMetricDescriptions,
  preparePoseAnalysisData,
  preparePoseAccuracyData,
  prepareHoldDurationData,
  calculateAnglesFromKeypoints,
  prepareJointScoresData
} from '../../lib/chartDataUtils';

export default function TestPhase2Page() {
  const [exerciseType, setExerciseType] = useState<'repetition' | 'pose' | 'flow'>('repetition');

  // Mock data for testing
  const mockUserAngles = {
    leftKneeAngles: [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40],
    rightKneeAngles: [44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 84, 79, 74, 69, 64, 59, 54, 49, 44, 39],
    leftHipAngles: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75],
    rightHipAngles: [79, 84, 89, 94, 99, 104, 109, 114, 119, 124, 119, 114, 109, 104, 99, 94, 89, 84, 79, 74],
  };

  const mockReferenceAngles = {
    leftKneeAngles: [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40],
    rightKneeAngles: [44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 84, 79, 74, 69, 64, 59, 54, 49, 44, 39],
    leftHipAngles: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75],
    rightHipAngles: [79, 84, 89, 94, 99, 104, 109, 114, 119, 124, 119, 114, 109, 104, 99, 94, 89, 84, 79, 74],
  };

  // Mock pose analysis data
  const mockPoseAnalysis = {
    id: 'test-pose-analysis',
    exerciseId: 'test-pose-exercise',
    targetPoses: JSON.stringify({
      leftKnee: 90,
      rightKnee: 90,
      leftHip: 120,
      rightHip: 120,
    }),
    angleRanges: JSON.stringify({
      leftKnee: { min: 85, max: 95 },
      rightKnee: { min: 85, max: 95 },
      leftHip: { min: 115, max: 125 },
      rightHip: { min: 115, max: 125 },
    }),
    validatedByAdmin: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mock user keypoints data for pose testing - positioned to create realistic angles
  const mockUserKeypoints = Array.from({ length: 20 }, (_, i) => {
    // Add small random variation to simulate realistic pose data
    const variation = (Math.random() - 0.5) * 10;
    
    return {
      // Left side - positioned to create ~90° knee angle and ~120° hip angle
      leftHip: { x: 100, y: 200 + variation, score: 0.9 },
      leftKnee: { x: 100, y: 300 + variation, score: 0.9 }, // Creates ~90° angle with hip-ankle
      leftAnkle: { x: 100, y: 400 + variation, score: 0.9 },
      leftShoulder: { x: 100, y: 100 + variation, score: 0.9 }, // Creates ~120° angle with hip-knee
      
      // Right side - positioned to create ~90° knee angle and ~120° hip angle
      rightHip: { x: 150, y: 200 + variation, score: 0.9 },
      rightKnee: { x: 150, y: 300 + variation, score: 0.9 }, // Creates ~90° angle with hip-ankle
      rightAnkle: { x: 150, y: 400 + variation, score: 0.9 },
      rightShoulder: { x: 150, y: 100 + variation, score: 0.9 }, // Creates ~120° angle with hip-knee
      
      // Additional keypoints for completeness
      leftElbow: { x: 80, y: 180 + variation, score: 0.9 },
      leftWrist: { x: 60, y: 200 + variation, score: 0.9 },
      rightElbow: { x: 170, y: 180 + variation, score: 0.9 },
      rightWrist: { x: 190, y: 200 + variation, score: 0.9 },
    };
  });

  const mockRepAnalysis = {
    id: 'test-rep-analysis',
    exerciseId: 'test-exercise',
    repBoundaries: JSON.stringify([
      { startFrame: 1, endFrame: 10, startTime: 0, endTime: 0.33, quality: 85 },
      { startFrame: 11, endFrame: 20, startTime: 0.33, endTime: 0.67, quality: 88 },
    ]),
    goldStandardRep: JSON.stringify({
      phases: [
        { name: 'eccentric', startFrame: 1, endFrame: 5, startTime: 0, endTime: 0.17 },
        { name: 'concentric', startFrame: 6, endFrame: 10, startTime: 0.17, endTime: 0.33 },
        { name: 'eccentric', startFrame: 11, endFrame: 15, startTime: 0.33, endTime: 0.5 },
        { name: 'concentric', startFrame: 16, endFrame: 20, startTime: 0.5, endTime: 0.67 },
      ]
    }),
    validatedByAdmin: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAdvancedAnalysis = {
    overall_score: 85,
    joint_analysis: {
      leftKnee: { dtw_score: 90, cosine_score: 88, rom_score: 85, basic_score: 87 },
      rightKnee: { dtw_score: 88, cosine_score: 86, rom_score: 83, basic_score: 85 },
      leftHip: { dtw_score: 92, cosine_score: 90, rom_score: 87, basic_score: 89 },
      rightHip: { dtw_score: 89, cosine_score: 87, rom_score: 84, basic_score: 86 },
      overall: { dtw_score: 90, cosine_score: 88, rom_score: 85, basic_score: 87 }
    },
    repetition_analysis: {
      1: { consistency: 85, quality: 88, eccentricQuality: 87, concentricQuality: 89 },
      2: { consistency: 88, quality: 92, eccentricQuality: 90, concentricQuality: 94 },
      overall: { consistency: 86 }
    },
    tempo_analysis: {
      overall: { tempo_score: 82 }
    },
    balance_metrics: {
      stability_score: 82,
      symmetry_score: 88,
    },
  };

  const jointsOfInterest = ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'];

  // Prepare data
  const repBoundaries = prepareRepBoundaries(mockRepAnalysis);
  const repPhases = prepareRepPhases(mockRepAnalysis);
  
  // Test pose data preparation
  const poseAnalysisData = preparePoseAnalysisData(mockUserKeypoints, mockPoseAnalysis, jointsOfInterest);
  const poseAccuracyData = preparePoseAccuracyData(mockUserKeypoints, mockPoseAnalysis, jointsOfInterest);
  const holdDurationData = prepareHoldDurationData(mockUserKeypoints, mockPoseAnalysis, jointsOfInterest);
  
  // Debug: Calculate and show actual angles from first frame
  const debugAngles = calculateAnglesFromKeypoints([mockUserKeypoints[0]], jointsOfInterest);
  
  // Test extended pose analysis with advanced analysis service
  const testExtendedPoseAnalysis = async () => {
    try {
      const { advancedAnalysisService } = require('../../lib/advancedAnalysisService');
      
      // Convert mock keypoints to angles format expected by advanced analysis
      const mockUserAngles = {
        leftKnee: debugAngles.leftKnee || [90],
        rightKnee: debugAngles.rightKnee || [90],
        leftHip: debugAngles.leftHip || [120],
        rightHip: debugAngles.rightHip || [120],
      };
      
      // Prepare analysis data for pose exercise
      const analysisData = advancedAnalysisService.prepareAnalysisData(
        mockUserAngles,
        {}, // Empty reference angles for pose
        jointsOfInterest,
        'Test Pose Exercise',
        null, // No exercise data
        'pose', // Exercise type
        mockPoseAnalysis, // Pose analysis data
        { video_duration: 1, frame_count: 1 }
      );
      
      console.log('Extended pose analysis data:', analysisData);
      
      // Note: This would call the backend, but we'll just log the prepared data
      return analysisData;
    } catch (error) {
      console.error('Extended pose analysis test failed:', error);
      return null;
    }
  };
  
  // Test unified rep counting
  const { analyzeRepetitions } = require('../../lib/repCountingUtils');
  
  const mockFrameData = Array.from({ length: 150 }, (_, i) => ({
    frameIndex: i,
    time: i / 30,
    angles: {
      rightHip: 120 + Math.sin(i * 0.1) * 30, // Simulate rep pattern
      leftHip: 120 + Math.sin(i * 0.1) * 30
    }
  }));
  
  const mockExercise = {
    exerciseType: 'repetition',
    jointsOfInterest: ['rightHip', 'leftHip'],
    repAnalysis: {
      jointAngleRules: JSON.stringify({
        repCompletion: {
          rightHip: {
            minAngle: 90,
            maxAngle: 150,
            threshold: 0.8
          },
          leftHip: {
            minAngle: 90,
            maxAngle: 150,
            threshold: 0.8
          }
        }
      })
    }
  };
  
  const unifiedRepAnalysis = analyzeRepetitions(mockFrameData, mockExercise);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Test Phase 2 - Exercise Type Testing</h1>
      
      {/* Exercise Type Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exercise Type:
        </label>
        <select 
          value={exerciseType} 
          onChange={(e) => setExerciseType(e.target.value as 'repetition' | 'pose' | 'flow')}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="repetition">Repetition</option>
          <option value="pose">Pose</option>
          <option value="flow">Flow</option>
        </select>
      </div>

      {exerciseType === 'repetition' && (
        <>
          {/* Rep Angle Comparison Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Rep Angle Comparison Chart</h2>
            <RepAngleComparisonChart
              data={prepareRepAngleComparisonData(mockUserAngles, mockReferenceAngles, jointsOfInterest, repBoundaries, repPhases)}
              jointsOfInterest={jointsOfInterest}
              currentFrame={10}
              onChartClick={(data) => console.log('Chart clicked:', data)}
              title="Repetition Angle Analysis"
              showReference={true}
              repBoundaries={repBoundaries}
              repPhases={repPhases}
              showRepBoundaries={true}
              showRepPhases={true}
              showRepCount={true}
            />
          </div>

                     {/* Joint Analysis Chart */}
           <div className="bg-white p-6 rounded-lg shadow mb-8">
             <h2 className="text-xl font-semibold mb-4">Joint Analysis Chart</h2>
             <BaseJointAnalysisChart
               data={prepareJointScoresData(mockAdvancedAnalysis, jointsOfInterest, 'repetition')}
               title="Repetition Joint Analysis"
               metrics={['rep_consistency', 'joint_compliance', 'form_quality', 'tempo_score']}
               metricLabels={{
                 rep_consistency: 'Rep Consistency',
                 joint_compliance: 'Joint Compliance',
                 form_quality: 'Form Quality',
                 tempo_score: 'Tempo Score',
               }}
             />
           </div>
        </>
      )}

      {exerciseType === 'pose' && (
        <>
                     {/* Pose Analysis Data Debug */}
           <div className="bg-white p-6 rounded-lg shadow mb-8">
             <h2 className="text-xl font-semibold mb-4">Pose Analysis Data Debug</h2>
             <button 
               onClick={testExtendedPoseAnalysis}
               className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
             >
               Test Extended Pose Analysis
             </button>
             <div className="mb-4">
               <strong>Calculated Angles (First Frame):</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(debugAngles, null, 2)}
               </pre>
             </div>
             <div className="mb-4">
               <strong>Pose Analysis Data:</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(poseAnalysisData.slice(0, 5), null, 2)}
               </pre>
             </div>
             <div className="mb-4">
               <strong>Pose Accuracy Data:</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(poseAccuracyData, null, 2)}
               </pre>
             </div>
             <div className="mb-4">
               <strong>Hold Duration Data:</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(holdDurationData, null, 2)}
               </pre>
             </div>
           </div>

          {/* Pose Joint Analysis Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Pose Joint Analysis Chart</h2>
            <BaseJointAnalysisChart
              data={poseAccuracyData}
              title="Pose Accuracy Analysis"
              metrics={['pose_accuracy', 'angle_compliance', 'hold_stability']}
              metricLabels={{
                pose_accuracy: 'Pose Accuracy',
                angle_compliance: 'Angle Compliance',
                hold_stability: 'Hold Stability',
              }}
            />
          </div>
        </>
             )}

       {exerciseType === 'repetition' && (
         <>
           {/* Unified Rep Counting Test */}
           <div className="bg-white p-6 rounded-lg shadow mb-8">
             <h2 className="text-xl font-semibold mb-4">Unified Rep Counting Test</h2>
             <div className="mb-4">
               <strong>Unified Rep Count:</strong> {unifiedRepAnalysis.repCount}
             </div>
             <div className="mb-4">
               <strong>Unified Rep Boundaries:</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(unifiedRepAnalysis.repBoundaries, null, 2)}
               </pre>
             </div>
           </div>

           {/* Data Debug */}
           <div className="bg-white p-6 rounded-lg shadow">
             <h2 className="text-xl font-semibold mb-4">Data Debug</h2>
             <div className="mb-4">
               <strong>Rep Boundaries:</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(repBoundaries, null, 2)}
               </pre>
             </div>
             <div className="mb-4">
               <strong>Rep Phases:</strong>
               <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                 {JSON.stringify(repPhases, null, 2)}
               </pre>
             </div>
           </div>
         </>
       )}
    </div>
  );
}
