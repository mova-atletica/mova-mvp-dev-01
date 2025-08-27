"use client";

import { useState } from 'react';
import { 
  getTabsForExerciseType, 
  getChartOptionsForExerciseType, 
  getDefaultChartForExerciseType,
  shouldShowChartForExerciseType 
} from '../../lib/exerciseTypeUtils';
import { 
  prepareAngleComparisonData, 
  prepareRadarData, 
  prepareJointScoresData,
  getMetricLabelsForExerciseType,
  getMetricsForExerciseType
} from '../../lib/chartDataUtils';
import { 
  BaseAngleComparisonChart, 
  BaseRadarChart, 
  BaseJointAnalysisChart 
} from '../../components/charts';

export default function TestFoundationPage() {
  const [exerciseType, setExerciseType] = useState<'repetition' | 'pose' | 'flow'>('repetition');

  // Mock data for testing
  const mockUserAngles = {
    leftKneeAngles: [45, 50, 55, 60, 65],
    rightKneeAngles: [44, 49, 54, 59, 64],
    leftHipAngles: [80, 85, 90, 95, 100],
    rightHipAngles: [79, 84, 89, 94, 99],
  };

  const mockReferenceAngles = {
    leftKneeAngles: [45, 50, 55, 60, 65],
    rightKneeAngles: [44, 49, 54, 59, 64],
    leftHipAngles: [80, 85, 90, 95, 100],
    rightHipAngles: [79, 84, 89, 94, 99],
  };

  const mockAdvancedAnalysis = {
    overall_score: 85,
    joint_analysis: {
      leftKnee: { dtw_score: 90, cosine_score: 88, rom_score: 85, basic_score: 87 },
      rightKnee: { dtw_score: 88, cosine_score: 86, rom_score: 83, basic_score: 85 },
      leftHip: { dtw_score: 92, cosine_score: 90, rom_score: 87, basic_score: 89 },
      rightHip: { dtw_score: 89, cosine_score: 87, rom_score: 84, basic_score: 86 },
    },
    balance_metrics: {
      stability_score: 82,
      symmetry_score: 88,
    },
    repetition_analysis: {
      leftKnee: { consistency: 85, avg_duration: 2.5, avg_rom: 45 },
      rightKnee: { consistency: 83, avg_duration: 2.4, avg_rom: 44 },
      leftHip: { consistency: 87, avg_duration: 2.6, avg_rom: 80 },
      rightHip: { consistency: 85, avg_duration: 2.5, avg_rom: 79 },
    },
  };

  const jointsOfInterest = ['leftKnee', 'rightKnee', 'leftHip', 'rightHip'];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Foundation Testing Page</h1>
        
        {/* Exercise Type Selector */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Exercise Type Testing</h2>
          <div className="flex gap-4 mb-4">
            {(['repetition', 'pose', 'flow'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setExerciseType(type)}
                className={`px-4 py-2 rounded ${
                  exerciseType === type 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Tabs:</strong> {getTabsForExerciseType(exerciseType).join(', ')}
            </div>
            <div>
              <strong>Default Chart:</strong> {getDefaultChartForExerciseType(exerciseType)}
            </div>
            <div>
              <strong>Balance Chart Visible:</strong> {shouldShowChartForExerciseType('balance', exerciseType) ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Joint Analysis Visible:</strong> {shouldShowChartForExerciseType('joint-analysis', exerciseType) ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Chart Options */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Available Charts</h2>
          <div className="grid grid-cols-2 gap-4">
            {getChartOptionsForExerciseType(exerciseType).map((option) => (
              <div key={option.value} className="p-3 bg-gray-50 rounded">
                <strong>{option.label}</strong>
                <br />
                <span className="text-sm text-gray-600">Value: {option.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Charts */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Charts</h2>
          
          {/* Angle Comparison Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Angle Comparison Chart</h3>
            <BaseAngleComparisonChart
              data={prepareAngleComparisonData(mockUserAngles, mockReferenceAngles, jointsOfInterest)}
              jointsOfInterest={jointsOfInterest}
              title={`${exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)} Angle Comparison`}
              showReference={true}
              showRepBoundaries={false}
            />
          </div>

          {/* Radar Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Performance Radar</h3>
            <BaseRadarChart
              data={prepareRadarData(mockAdvancedAnalysis, exerciseType)}
              title={`${exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)} Performance Radar`}
            />
          </div>

          {/* Joint Analysis Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Joint Analysis</h3>
            <BaseJointAnalysisChart
              data={prepareJointScoresData(mockAdvancedAnalysis, jointsOfInterest, exerciseType)}
              title={`${exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)} Joint Analysis`}
              metrics={getMetricsForExerciseType(exerciseType)}
              metricLabels={getMetricLabelsForExerciseType(exerciseType)}
            />
          </div>
        </div>

        {/* Data Utilities Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Data Utilities Test</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Metrics for {exerciseType}:</strong>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs">
                {JSON.stringify(getMetricsForExerciseType(exerciseType), null, 2)}
              </pre>
            </div>
            <div>
              <strong>Metric Labels for {exerciseType}:</strong>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs">
                {JSON.stringify(getMetricLabelsForExerciseType(exerciseType), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
